import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { formatMinor, type Currency } from "@/lib/money";
import { formatDate, formatDateTime, formatSlot } from "@/lib/format";
import { StatusBadge, bookingStage } from "@/components/stat";
import { BookingActions } from "./booking-actions";

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRole("business");

  const [{ data: b }, { data: contact }, { data: ledger }] = await Promise.all([
    supabase.from("bookings").select("*, campaigns(service_name), profiles(display_name), agreements(version)").eq("id", id).maybeSingle(),
    supabase.from("booking_contacts").select("*").eq("booking_id", id).maybeSingle(),
    supabase.from("ledger_entries").select("*").eq("booking_id", id).order("id"),
  ]);
  if (!b) notFound();

  const cur = b.currency as Currency;
  const money = (m: number) => formatMinor(m, cur);
  const stage = bookingStage(b);
  const owed = { pending: 0, available: 0 };
  for (const e of ledger ?? []) owed[e.bucket as "pending" | "available"] += -e.amount_minor;
  const now = Date.now();
  const windowOver = !!b.refund_window_ends_at && new Date(b.refund_window_ends_at).getTime() <= now;
  const beforePayout = !b.payout_at || new Date(b.payout_at).getTime() > now;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/business/bookings" className="text-sm text-muted-foreground hover:text-foreground">← Bookings</Link>
        <h1 className="mt-1 flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight">
          {b.campaigns?.service_name} <StatusBadge status={stage.key} label={stage.label} />
        </h1>
        <p className="mt-1 text-muted-foreground">
          {formatSlot(b.slot_start)} · {contact?.customer_name ?? "Customer"} · via {b.profiles?.display_name || "promoter"}
        </p>
      </div>

      {/* The action is the point of this screen: keep it above the fold. */}
      <BookingActions
        bookingId={b.id}
        status={b.status}
        released={!!b.released_at}
        windowOver={windowOver}
        beforePayout={beforePayout}
        demoMode={process.env.DEMO_MODE === "true"}
        commission={money(b.commission_minor)}
        total={money(b.business_total_minor)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="space-y-2 card p-4 text-sm">
          <h2 className="font-semibold">Customer</h2>
          <div>{contact?.customer_name ?? "—"}</div>
          <div className="text-muted-foreground">{contact?.customer_phone ?? ""}</div>
          <div className="pt-2 text-muted-foreground">
            Referred by <span className="text-foreground">{b.profiles?.display_name || "promoter"}</span> · agreement v{b.agreements?.version}
          </div>
        </section>

        <section className="space-y-1 card p-4 text-sm">
          <h2 className="mb-1 font-semibold">Terms (frozen at booking)</h2>
          <Row k="Price" v={money(b.price_minor)} />
          <Row k="Commission to promoter" v={money(b.commission_minor)} />
          <Row k={`Promly fee (${(b.fee_bps / 100).toFixed(2)}%)`} v={money(b.fee_minor)} />
          <Row k="You pay" v={<strong>{money(b.business_total_minor)}</strong>} />
          <Row k="Refund window" v={`${b.refund_window_days} days`} />
          <Row k="Payout" v={`${b.payout_days} days after verification`} />
        </section>
      </div>

      <section className="space-y-1 card p-4 text-sm">
        <h2 className="mb-1 font-semibold">Timeline</h2>
        <Row k="Booked" v={formatDateTime(b.created_at)} />
        <Row k="Service verified" v={formatDateTime(b.verified_at)} />
        <Row k="Refund window ends" v={formatDateTime(b.refund_window_ends_at)} />
        <Row k="Commission available" v={formatDateTime(b.released_at)} />
        <Row k="Payout date" v={formatDate(b.payout_at)} />
        {b.refunded_at && <Row k="Refunded" v={formatDateTime(b.refunded_at)} />}
      </section>

      <section className="space-y-2 text-sm">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-semibold">Money log for this booking</h2>
          {!!ledger?.length && (
            <div className="text-xs text-muted-foreground">
              You owe now: <span className="text-foreground">{money(owed.pending)} pending</span> ·{" "}
              <span className="text-foreground">{money(owed.available)} due</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Append-only: entries are never changed. A refund adds new entries that cancel the old ones.
        </p>
        {!ledger?.length && <p className="text-muted-foreground">Nothing yet. Entries appear when you verify the service.</p>}
        {ledger?.map((e) => {
          const owes = -e.amount_minor; // business rows are negative when the business owes
          return (
            <div key={e.id} className="flex items-center justify-between gap-3 card px-3 py-2">
              <span>
                {ledgerLabel(e.entry_type, e.bucket)}
                <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {e.bucket === "pending" ? "pending" : "due"}
                </span>
              </span>
              <span className="shrink-0 whitespace-nowrap tabular-nums">
                {owes > 0 ? "+" : "−"}
                {money(Math.abs(owes))} owed
              </span>
            </div>
          );
        })}
      </section>
    </div>
  );
}

/** Plain-language description of a business ledger entry. */
function ledgerLabel(type: string, bucket: string): string {
  if (type === "business_charge") return "Booking charge (commission + Promly fee)";
  if (type === "release") return bucket === "pending" ? "Refund window ended → moved out of pending" : "Refund window ended → now due";
  if (type === "reversal") return bucket === "pending" ? "Refund → pending charge cancelled" : "Refund → due charge cancelled";
  return type;
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="whitespace-nowrap text-right tabular-nums">{v}</span>
    </div>
  );
}
