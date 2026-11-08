import { notFound } from "next/navigation";
import { CheckCircle2, ShieldCheck, Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { paymentsEnabled } from "@/lib/flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshPayoutAccount } from "@/lib/payments-server";
import { formatMinor, type Currency } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { SETTLEMENT_LABEL, type SettlementStatus } from "@/lib/payments";
import { cn } from "@/lib/utils";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { EmptyState } from "@/components/empty-state";
import { saveAgeBand, startPayoutSetup } from "./actions";

export const metadata = { title: "Earnings — Promly" };

const BADGE: Partial<Record<SettlementStatus, string>> = {
  pending: "bg-pending-bg text-pending",
  final: "bg-secondary text-foreground",
  invoiced: "bg-secondary text-foreground",
  awaiting_business_payment: "bg-[hsl(0_80%_96%)] text-destructive",
  paid_by_business: "bg-marker text-ink",
  paid_out: "bg-[hsl(155_60%_92%)] text-paid",
};

type Row = {
  booking_id: string; currency: Currency; commission_minor: number; settlement_status: SettlementStatus;
  verified_at: string | null; final_due_at: string | null; final_at: string | null; invoiced_at: string | null;
  due_at: string | null; paid_at: string | null; paid_out_at: string | null;
};

function statusDate(r: Row): string {
  switch (r.settlement_status) {
    case "pending": return `final on ${formatDate(r.final_due_at)}`;
    case "final": return `final since ${formatDate(r.final_at)}`;
    case "invoiced": return `invoiced ${formatDate(r.invoiced_at)}, due ${formatDate(r.due_at)}`;
    case "awaiting_business_payment": return `invoice was due ${formatDate(r.due_at)}`;
    case "paid_by_business": return `paid by business ${formatDate(r.paid_at)}; in the next payout run`;
    case "paid_out": return `paid out ${formatDate(r.paid_out_at)}`;
    default: return "";
  }
}

export default async function EarningsPage({ searchParams }: { searchParams: Promise<{ stripe?: string }> }) {
  if (!paymentsEnabled()) notFound();
  const { user, supabase } = await requireRole("promoter");
  const admin = createAdminClient();
  const { stripe: back } = await searchParams;
  if (back === "return") await refreshPayoutAccount(admin, user.id).catch(() => null);

  const [{ data: age }, { data: account }, { data: rows }] = await Promise.all([
    supabase.from("promoter_age").select("age_band").eq("profile_id", user.id).maybeSingle(),
    supabase.from("stripe_accounts").select("payouts_enabled, holder").eq("profile_id", user.id).maybeSingle(),
    // Server-only view, filtered to this promoter.
    admin.from("booking_settlement").select("*").eq("promoter_id", user.id).neq("settlement_status", "not_verified"),
  ]);
  const list = (rows ?? []) as unknown as Row[];
  const { data: names } = list.length
    ? await supabase.from("bookings").select("id, campaigns(service_name), businesses(name)").in("id", list.map((r) => r.booking_id))
    : { data: [] };
  const nameOf = new Map((names ?? []).map((n) => [n.id, `${n.campaigns?.service_name ?? "Booking"} · ${n.businesses?.name ?? ""}`]));
  const sum = (s: SettlementStatus[]) =>
    list.filter((r) => s.includes(r.settlement_status)).reduce((t, r) => t + r.commission_minor, 0);
  const cur: Currency = list[0]?.currency ?? "NOK";
  const band = age?.age_band as "16-17" | "18+" | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Earnings</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Commission becomes final 14 days after the business verifies the visit. The business is invoiced once a month, and
          you&apos;re paid once they&apos;ve paid. Promly never pays out money it hasn&apos;t received.
        </p>
      </div>

      <section className="slip grid gap-4 p-5 sm:grid-cols-3">
        <div><div className="text-sm opacity-70">Pending</div><div className="money text-2xl">{formatMinor(sum(["pending"]), cur)}</div></div>
        <div><div className="text-sm opacity-70">Final, waiting for the business</div><div className="money text-2xl">{formatMinor(sum(["final", "invoiced", "awaiting_business_payment", "paid_by_business"]), cur)}</div></div>
        <div><div className="text-sm opacity-70">Paid out</div><div className="money text-2xl" data-testid="paid-out-total">{formatMinor(sum(["paid_out"]), cur)}</div></div>
      </section>

      <section className="card space-y-3 p-5" data-testid="payout-setup">
        <h2 className="flex items-center gap-2 text-lg"><Wallet className="h-5 w-5" /> Payout account</h2>
        {!band ? (
          <ActionForm action={saveAgeBand} className="space-y-3">
            <p className="text-sm text-muted-foreground">How old are you? Payouts go to a Stripe account, and Stripe checks the account holder&apos;s age.</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-2 rounded-full border border-border px-4 py-2"><input type="radio" name="age_band" value="18+" required /> 18 or older</label>
              <label className="flex items-center gap-2 rounded-full border border-border px-4 py-2"><input type="radio" name="age_band" value="16-17" /> 16 or 17</label>
            </div>
            <SubmitButton>Save</SubmitButton>
          </ActionForm>
        ) : account?.payouts_enabled ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-paid" data-testid="payouts-ready">
            <CheckCircle2 className="h-5 w-5" /> Payouts are set up{account.holder === "guardian" ? " (your parent or guardian holds the account)" : ""}.
          </p>
        ) : band === "18+" ? (
          <ActionForm action={startPayoutSetup} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {account ? "Finish the Stripe form to receive payouts." : "Stripe handles your bank details and ID check; Promly never sees them."}
            </p>
            <SubmitButton pendingText="Opening Stripe…">{account ? "Continue on Stripe" : "Set up payouts with Stripe"}</SubmitButton>
          </ActionForm>
        ) : (
          <ActionForm action={startPayoutSetup} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Because you&apos;re 16 or 17, a parent or guardian holds the payout account and receives the money for you. You can
              join 16+ campaigns once they&apos;ve finished the Stripe form.
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="guardian_consent" className="mt-1" />
              <span>
                <ShieldCheck className="mr-1 inline h-4 w-4" />
                I&apos;m this promoter&apos;s parent or legal guardian. I agree to them promoting 16+ campaigns on Promly and I&apos;ll
                complete the Stripe form as the payout account holder.
              </span>
            </label>
            <SubmitButton pendingText="Opening Stripe…">{account ? "Continue on Stripe" : "Guardian: set up payouts with Stripe"}</SubmitButton>
          </ActionForm>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg">Commissions</h2>
        {list.length === 0 ? (
          <EmptyState icon={Wallet} title="No verified commissions yet" body="When a business verifies a visit from your link, it shows up here." />
        ) : (
          <div className="ledger card">
            {list.map((r) => (
              <div key={r.booking_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3" data-testid="earning-row">
                <div className="min-w-0">
                  <div className="truncate font-medium">{nameOf.get(r.booking_id) ?? "Booking"}</div>
                  <div className="text-xs text-muted-foreground">{statusDate(r)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", BADGE[r.settlement_status] ?? "bg-secondary text-muted-foreground")} data-testid="earning-status">
                    {SETTLEMENT_LABEL[r.settlement_status]}
                  </span>
                  <span className="money">{formatMinor(r.commission_minor, r.currency)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
