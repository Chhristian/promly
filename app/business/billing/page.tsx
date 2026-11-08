import { notFound } from "next/navigation";
import { AlertTriangle, ExternalLink, Receipt } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { paymentsEnabled } from "@/lib/flags";
import { formatMinor, type Currency } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Billing — Promly" };

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Being prepared", cls: "bg-secondary text-muted-foreground" },
  open: { label: "Open", cls: "bg-pending-bg text-pending" },
  overdue: { label: "Overdue", cls: "bg-[hsl(0_80%_96%)] text-destructive" },
  paid: { label: "Paid", cls: "bg-[hsl(155_60%_92%)] text-paid" },
  void: { label: "Void", cls: "bg-secondary text-muted-foreground" },
  uncollectible: { label: "Uncollectible", cls: "bg-[hsl(0_80%_96%)] text-destructive" },
};

const LINE_KIND: Record<string, string> = {
  booking: "",
  fee_credit: "Credit: Promly fee, reversed booking",
  commission_credit: "Credit: commission, reversed booking",
};

export default async function BillingPage() {
  if (!paymentsEnabled()) notFound();
  const { supabase } = await requireRole("business");

  const { data: invoices } = await supabase
    .from("business_invoices")
    .select(
      "id, period_month, currency, commission_minor, fee_minor, total_minor, status, hosted_invoice_url, due_at, paid_at, overdue_at, " +
        "invoice_lines(id, kind, commission_minor, fee_minor, active, bookings(slot_start, created_at, campaigns(service_name)))",
    )
    .neq("status", "draft")
    .order("period_month", { ascending: false });

  const list = (invoices ?? []) as unknown as Array<{
    id: string; period_month: string; currency: Currency; commission_minor: number; fee_minor: number; total_minor: number;
    status: string; hosted_invoice_url: string | null; due_at: string | null; paid_at: string | null; overdue_at: string | null;
    invoice_lines: { id: number; kind: string; commission_minor: number; fee_minor: number; active: boolean;
      bookings: { slot_start: string | null; created_at: string; campaigns: { service_name: string } | null } | null }[];
  }>;
  const overdue = list.filter((i) => i.status === "open" && i.overdue_at);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Billing</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Once a month you get one invoice from Promly: the commission for each booking that became final (14 days after you
          verified it) plus Promly&apos;s 2.75% fee on the booking price. Pay it on the Stripe page within 14 days.
        </p>
      </div>

      {overdue.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-destructive/40 bg-[hsl(0_80%_97%)] p-4 text-sm" role="alert">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <div className="font-semibold">An invoice is overdue, so your campaigns are paused.</div>
            <div className="text-muted-foreground">They go live again automatically as soon as the invoice is paid.</div>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices yet" body="Your first invoice arrives the month after a verified booking becomes final." />
      ) : (
        <div className="space-y-4">
          {list.map((inv) => {
            const s = inv.status === "open" && inv.overdue_at ? STATUS.overdue : STATUS[inv.status] ?? STATUS.open;
            const month = new Date(inv.period_month).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
            return (
              <section key={inv.id} className="card overflow-hidden" data-testid="invoice">
                <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg">{month}</h2>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", s.cls)} data-testid="invoice-status">{s.label}</span>
                    </div>
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      {inv.status === "paid" ? `Paid ${formatDate(inv.paid_at)}` : inv.due_at ? `Due ${formatDate(inv.due_at)}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="money text-2xl">{formatMinor(inv.total_minor, inv.currency)}</div>
                    {inv.status === "open" && inv.hosted_invoice_url && (
                      <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                        Pay on Stripe <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="ledger border-t border-border text-sm">
                  {inv.invoice_lines.filter((l) => l.active).map((l) => {
                    const b = l.bookings;
                    const when = formatDate(b?.slot_start ?? b?.created_at);
                    return (
                      <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{LINE_KIND[l.kind] || b?.campaigns?.service_name || "Booking"}</div>
                          <div className="text-xs text-muted-foreground">
                            {when}
                            {l.kind === "booking" && ` · commission ${formatMinor(l.commission_minor, inv.currency)} + fee ${formatMinor(l.fee_minor, inv.currency)}`}
                          </div>
                        </div>
                        <div className={cn("money shrink-0", l.kind !== "booking" && "text-paid")}>{formatMinor(l.commission_minor + l.fee_minor, inv.currency)}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
