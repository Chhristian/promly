import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { paymentsEnabled } from "@/lib/flags";

export const dynamic = "force-dynamic";

/** Errors that mean "not one of ours" (e.g. an invoice Promly didn't create): acknowledge and ignore. */
const IGNORABLE = ["invoice_not_found", "payout_not_found"];

/**
 * Stripe webhooks. Every request must carry a valid Stripe signature; anything else is
 * rejected. Only this route marks invoices paid. Events are deduplicated by id and every
 * handler is idempotent, so Stripe's retries are safe.
 */
export async function POST(request: NextRequest) {
  if (!paymentsEnabled()) return new NextResponse("Not found", { status: 404 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new NextResponse("Missing signature", { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const db = createAdminClient();
  const { data: fresh, error: dedupeErr } = await db.rpc("begin_stripe_event", { p_event_id: event.id, p_type: event.type });
  if (dedupeErr) return new NextResponse("Retry later", { status: 500 });
  if (!fresh) return NextResponse.json({ received: true, duplicate: true });

  try {
    await handle(db, event);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!IGNORABLE.some((x) => msg.includes(x))) {
      console.error("stripe webhook failed", event.type, event.id, msg);
      return new NextResponse("Handler failed", { status: 500 }); // Stripe retries
    }
  }
  await db.rpc("finish_stripe_event", { p_event_id: event.id });
  return NextResponse.json({ received: true });
}

async function handle(db: ReturnType<typeof createAdminClient>, event: Stripe.Event) {
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const { error } = await db.rpc(fn as never, args as never);
    if (error) throw new Error(error.message);
  };
  switch (event.type) {
    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      const paidAt = inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000).toISOString() : new Date().toISOString();
      return rpc("mark_invoice_paid", { p_stripe_invoice_id: inv.id, p_paid_at: paidAt });
    }
    case "invoice.payment_failed":
      return rpc("mark_invoice_payment_failed", { p_stripe_invoice_id: (event.data.object as Stripe.Invoice).id });
    case "invoice.overdue":
      return rpc("mark_invoice_overdue", { p_stripe_invoice_id: (event.data.object as Stripe.Invoice).id });
    case "invoice.voided":
      return rpc("mark_invoice_voided", { p_stripe_invoice_id: (event.data.object as Stripe.Invoice).id });
    case "account.updated": {
      const acct = event.data.object as Stripe.Account;
      return rpc("update_stripe_account_status", { p_stripe_account_id: acct.id, p_payouts_enabled: acct.payouts_enabled === true });
    }
    case "transfer.reversed":
      return rpc("mark_payout_reversed", { p_stripe_transfer_id: (event.data.object as Stripe.Transfer).id });
    default:
      return; // transfer.created etc.: nothing to do (the payout run records the transfer itself)
  }
}
