import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card/70 p-4", accent && "border-primary/50 bg-primary/10")}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums sm:text-3xl", accent && "text-gradient")}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  published: "bg-emerald-500/15 text-emerald-300",
  paused: "bg-amber-500/15 text-amber-300",
  pending: "bg-amber-500/15 text-amber-300",
  verified: "bg-blue-500/15 text-blue-300",
  available: "bg-emerald-500/15 text-emerald-300",
  refunded: "bg-red-500/15 text-red-300",
  cancelled: "bg-secondary text-muted-foreground",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[status] ?? STATUS_STYLES.draft)}>
      {label ?? status}
    </span>
  );
}

/** Booking state as people understand it. */
export function bookingStage(b: { status: string; released_at: string | null }): { key: string; label: string } {
  if (b.status === "refunded") return { key: "refunded", label: "Refunded" };
  if (b.status === "cancelled") return { key: "cancelled", label: "Cancelled" };
  if (b.status === "pending") return { key: "pending", label: "Awaiting service" };
  if (b.released_at) return { key: "available", label: "Commission available" };
  return { key: "verified", label: "Verified · commission pending" };
}
