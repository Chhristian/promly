import "server-only";

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getStripe } from "./stripe";
import { formatMinor, type Currency } from "./money";
import { INVOICE_DUE_DAYS, type AgeBand } from "./payments";

type Db = SupabaseClient<Database>;

/** First day of the month (UTC date string), used as the invoice period. */
export function periodMonth(d: Date = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function must<T>(r: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  if (r.data === null || r.data === undefined) throw new Error(`${what}: not found`);
  return r.data as NonNullable<T>;
}

/** Like must(), but a null result (e.g. "nothing to do") is allowed. */
function mustOrNull<T>(r: { data: T; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
}

// ---------------------------------------------------------------------------
// Monthly invoices (rule 4)
// ---------------------------------------------------------------------------

async function stripeCustomerFor(db: Db, businessId: string): Promise<string> {
  const { data: existing } = await db.from("stripe_customers").select("stripe_customer_id").eq("business_id", businessId).maybeSingle();
  if (existing) return existing.stripe_customer_id;
  const biz = must(await db.from("businesses").select("name, owner_id, country").eq("id", businessId).single(), "business");
  const { data: owner } = await db.auth.admin.getUserById(biz.owner_id);
  const customer = await getStripe().customers.create(
    { name: biz.name, email: owner.user?.email ?? undefined, metadata: { promly_business_id: businessId } },
    { idempotencyKey: `promly-customer-${businessId}` },
  );
  mustOrNull(await db.rpc("save_stripe_customer", { p_business_id: businessId, p_stripe_customer_id: customer.id }), "save customer");
  return customer.id;
}

function lineDescription(kind: string, service: string, date: string, commission: number, fee: number, cur: Currency): string {
  if (kind === "fee_credit") return `Credit: Promly fee for reversed booking — ${service}, ${date}`;
  if (kind === "commission_credit") return `Credit: commission for reversed booking — ${service}, ${date}`;
  return `${service}, ${date} — commission ${formatMinor(commission, cur)} + Promly fee 2.75% ${formatMinor(fee, cur)}`;
}

/**
 * Create (or finish) this month's invoice for one business: draft in the database,
 * Stripe invoice with a line per booking, finalize, then record it as open.
 * Every Stripe call carries an idempotency key, so a retry never duplicates anything.
 */
export async function createMonthlyInvoice(db: Db, businessId: string, period = periodMonth()): Promise<string | null> {
  const draftId = mustOrNull(await db.rpc("create_invoice_draft", { p_business_id: businessId, p_period_month: period }), "draft");
  if (!draftId) return null;
  const inv = must(await db.from("business_invoices").select("*").eq("id", draftId).single(), "invoice");
  const lines = must(
    await db
      .from("invoice_lines")
      .select("id, kind, commission_minor, fee_minor, currency, bookings(slot_start, created_at, campaigns(service_name))")
      .eq("invoice_id", draftId)
      .eq("active", true)
      .order("id"),
    "lines",
  );
  const stripe = getStripe();
  const customer = await stripeCustomerFor(db, businessId);
  const currency = inv.currency.toLowerCase();
  const cur = inv.currency as Currency;

  // NOK has no Stripe bank-transfer option, so card; EUR invoices also offer card for now (see docs/PAYMENTS.md).
  const invoice = await stripe.invoices.create(
    {
      customer,
      currency,
      collection_method: "send_invoice",
      days_until_due: INVOICE_DUE_DAYS,
      auto_advance: false,
      pending_invoice_items_behavior: "exclude",
      description: `Promly commissions and fees, ${period.slice(0, 7)}`,
      footer: "Commission is final 14 days after you verify a service. Questions: reply to this invoice.",
      payment_settings: { payment_method_types: ["card"] },
      metadata: { promly_invoice_id: draftId, promly_business_id: businessId },
    },
    { idempotencyKey: `promly-invoice-${draftId}` },
  );

  for (const l of lines) {
    const b = l.bookings;
    const date = new Date(b?.slot_start ?? b?.created_at ?? Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Oslo" });
    const amount = l.commission_minor + l.fee_minor;
    await stripe.invoiceItems.create(
      {
        customer,
        invoice: invoice.id,
        currency,
        amount,
        description: lineDescription(l.kind, b?.campaigns?.service_name ?? "Booking", date, l.commission_minor, l.fee_minor, cur),
        metadata: { promly_invoice_line_id: String(l.id), kind: l.kind },
      },
      { idempotencyKey: `promly-invoice-line-${l.id}` },
    );
  }

  const finalized = invoice.status === "draft"
    ? await stripe.invoices.finalizeInvoice(invoice.id!, { auto_advance: false }, { idempotencyKey: `promly-finalize-${draftId}` })
    : invoice;
  const dueAt = finalized.due_date ? new Date(finalized.due_date * 1000).toISOString() : new Date(Date.now() + INVOICE_DUE_DAYS * 86_400_000).toISOString();
  mustOrNull(
    await db.rpc("attach_stripe_invoice", {
      p_invoice_id: draftId,
      p_stripe_invoice_id: finalized.id!,
      p_hosted_invoice_url: finalized.hosted_invoice_url ?? "",
      p_due_at: dueAt,
    }),
    "attach",
  );
  return draftId;
}

/** Create this month's invoices for the given businesses. */
export async function createMonthlyInvoices(db: Db, businessIds: string[]) {
  const lines: string[] = [];
  for (const id of businessIds) {
    try {
      const inv = await createMonthlyInvoice(db, id);
      lines.push(inv ? `invoice created for business ${id.slice(0, 8)}` : `nothing to invoice for business ${id.slice(0, 8)}`);
    } catch (e) {
      lines.push(`invoice failed for business ${id.slice(0, 8)}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return lines;
}

/**
 * TEST MODE: pay an open invoice with Stripe's test card that settles straight to the
 * available balance. The invoice is NOT marked paid here: only the signed webhook does that.
 */
export async function payTestInvoice(db: Db, invoiceId: string): Promise<string> {
  const inv = must(await db.from("business_invoices").select("stripe_invoice_id, status, business_id").eq("id", invoiceId).single(), "invoice");
  if (inv.status !== "open" || !inv.stripe_invoice_id) return "invoice is not open";
  const stripe = getStripe();
  const customer = await stripeCustomerFor(db, inv.business_id);
  const pm = await stripe.paymentMethods.attach("pm_card_bypassPending", { customer }, { idempotencyKey: `promly-testpm-${invoiceId}` });
  const paid = await stripe.invoices.pay(inv.stripe_invoice_id, { payment_method: pm.id }, { idempotencyKey: `promly-testpay-${invoiceId}` });
  return `Stripe says ${paid.status}; waiting for the webhook`;
}

// ---------------------------------------------------------------------------
// Promoter payout accounts (rules 5 + 6)
// ---------------------------------------------------------------------------

/** Is the account able to receive transfers? (Stripe Accounts v2, recipient configuration.) */
async function fetchPayoutsEnabled(accountId: string): Promise<boolean> {
  const acct = await getStripe().v2.core.accounts.retrieve(accountId, { include: ["configuration.recipient"] });
  return acct.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === "active";
}

export async function refreshPayoutAccount(db: Db, profileId: string): Promise<boolean | null> {
  const { data } = await db.from("stripe_accounts").select("stripe_account_id").eq("profile_id", profileId).maybeSingle();
  if (!data) return null;
  const enabled = await fetchPayoutsEnabled(data.stripe_account_id);
  mustOrNull(await db.rpc("update_stripe_account_status", { p_stripe_account_id: data.stripe_account_id, p_payouts_enabled: enabled }), "status");
  return enabled;
}

/**
 * Create the promoter's payout account (once) and return a Stripe-hosted onboarding link.
 * 18+: the promoter's own account. 16-17: a parent/guardian completes onboarding as the
 * account holder; `guardianConsentAt` is when they confirmed consent in Promly.
 */
export async function startPayoutOnboarding(
  db: Db,
  p: { profileId: string; email: string; displayName: string; band: AgeBand; guardianConsentAt: string | null; returnUrl: string; refreshUrl: string },
): Promise<string> {
  const stripe = getStripe();
  const holder = p.band === "18+" ? "self" : "guardian";
  let { data: row } = await db.from("stripe_accounts").select("stripe_account_id").eq("profile_id", p.profileId).maybeSingle();
  if (!row) {
    const acct = await stripe.v2.core.accounts.create(
      {
        contact_email: p.email,
        display_name: holder === "self" ? p.displayName : `${p.displayName} (guardian account)`,
        dashboard: "express",
        identity: { country: "no", entity_type: "individual" },
        defaults: { currency: "nok", responsibilities: { fees_collector: "application", losses_collector: "application" } },
        configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
        metadata: { promly_profile_id: p.profileId, holder },
      },
      { idempotencyKey: `promly-account-${p.profileId}` },
    );
    mustOrNull(
      await db.rpc("save_stripe_account", {
        p_profile_id: p.profileId,
        p_stripe_account_id: acct.id,
        p_payouts_enabled: false,
        p_holder: holder,
        // SQL accepts null here (18+ promoters); the generated type says string.
        p_guardian_consent_at: (holder === "guardian" ? p.guardianConsentAt : null) as string,
      }),
      "save account",
    );
    row = { stripe_account_id: acct.id };
  }
  const link = await stripe.v2.core.accountLinks.create({
    account: row.stripe_account_id,
    use_case: {
      type: "account_onboarding",
      account_onboarding: { return_url: p.returnUrl, refresh_url: p.refreshUrl },
    },
  });
  return link.url;
}

// ---------------------------------------------------------------------------
// Payout run (rules 1 + 5)
// ---------------------------------------------------------------------------

/**
 * Transfer what each promoter is owed: only commission from PAID invoices (the database
 * decides), never twice, and only from funds already AVAILABLE in Promly's Stripe balance.
 */
export async function runPayouts(db: Db, opts: { runKey: string; promoterIds?: string[] }) {
  const stripe = getStripe();
  const lines: string[] = [];
  let q = db.from("stripe_accounts").select("profile_id, stripe_account_id");
  if (opts.promoterIds) q = q.in("profile_id", opts.promoterIds);
  const accounts = must(await q, "accounts");

  for (const a of accounts) {
    try {
      const enabled = await fetchPayoutsEnabled(a.stripe_account_id);
      mustOrNull(await db.rpc("update_stripe_account_status", { p_stripe_account_id: a.stripe_account_id, p_payouts_enabled: enabled }), "status");
      if (!enabled) {
        lines.push(`${a.profile_id.slice(0, 8)}: payout account not ready yet`);
        continue;
      }
      for (const currency of ["NOK", "EUR"] as const) {
        const payoutId = mustOrNull(await db.rpc("prepare_payout", { p_promoter_id: a.profile_id, p_currency: currency, p_run_key: opts.runKey }), "prepare");
        if (!payoutId) continue;
        const payout = must(await db.from("payouts").select("*").eq("id", payoutId).single(), "payout");
        const balance = await stripe.balance.retrieve();
        const available = balance.available.find((b) => b.currency === currency.toLowerCase())?.amount ?? 0;
        if (available < payout.amount_minor) {
          mustOrNull(await db.rpc("mark_payout_failed", { p_payout_id: payoutId, p_reason: "Not enough available funds in Promly's Stripe balance yet" }), "fail");
          lines.push(`${a.profile_id.slice(0, 8)}: waiting for funds (${formatMinor(payout.amount_minor, currency)})`);
          continue;
        }
        try {
          const tr: Stripe.Transfer = await stripe.transfers.create(
            {
              amount: payout.amount_minor,
              currency: currency.toLowerCase(),
              destination: payout.stripe_account_id,
              transfer_group: `promly-payout-${payoutId}`,
              description: "Promly commission payout",
              metadata: { promly_payout_id: payoutId },
            },
            { idempotencyKey: payout.idempotency_key },
          );
          mustOrNull(await db.rpc("mark_payout_transferred", { p_payout_id: payoutId, p_stripe_transfer_id: tr.id }), "transferred");
          lines.push(`${a.profile_id.slice(0, 8)}: paid out ${formatMinor(payout.amount_minor, currency)}`);
        } catch (e) {
          mustOrNull(await db.rpc("mark_payout_failed", { p_payout_id: payoutId, p_reason: e instanceof Error ? e.message : String(e) }), "fail");
          lines.push(`${a.profile_id.slice(0, 8)}: transfer failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } catch (e) {
      lines.push(`${a.profile_id.slice(0, 8)}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (!accounts.length) lines.push("no promoter has a payout account yet");
  return lines;
}
