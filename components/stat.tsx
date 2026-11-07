import { cn } from "@/lib/utils";

/**
 * A printed figure: small label, big tabular amount, optional hint.
 * Used inside a panel (statement) or the dark payout slip. Label comes first in the DOM.
 */
export function Stat({
  label,
  value,
  hint,
  size = "md",
  onSlip = false,
  className,
  mark,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  size?: "hero" | "md" | "sm";
  onSlip?: boolean;
  className?: string;
  /** Highlighter stroke under the amount (money that is yours). */
  mark?: boolean;
}) {
  // Long amounts (e.g. 25 000 000,00 kr) step down in size so they always fit.
  const len = typeof value === "string" ? value.length : 0;
  const long = len > 14;
  const veryLong = len > 17;
  const sizes = {
    hero: veryLong ? "text-[clamp(2rem,7vw,2.75rem)]" : long ? "text-[clamp(2.25rem,8vw,3.25rem)]" : "text-[clamp(2.75rem,11vw,4.5rem)]",
    md: veryLong ? "text-xl sm:text-2xl" : long ? "text-2xl" : "text-[clamp(1.6rem,6vw,2.05rem)]",
    sm: veryLong ? "text-lg" : long ? "text-xl" : "text-2xl",
  };
  return (
    <div className={cn("min-w-0", className)}>
      <div className={cn("text-sm font-medium", onSlip ? "text-white/65" : "text-muted-foreground")}>{label}</div>
      <div className={cn("money mt-1 leading-[1.05]", sizes[size], size === "hero" && "tracking-[-0.04em]")}>
        {mark ? <span className={cn("money-mark marked", onSlip && "marked-full ml-[0.16em]")}>{value}</span> : value}
      </div>
      {hint && <div className={cn("mt-1.5 text-sm", onSlip ? "text-white/65" : "text-muted-foreground")}>{hint}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  published: "bg-[hsl(155_60%_92%)] text-paid",
  paused: "bg-pending-bg text-pending",
  pending: "bg-pending-bg text-pending",
  verified: "bg-[hsl(232_90%_95%)] text-primary",
  available: "bg-marker text-ink",
  refunded: "bg-[hsl(0_80%_95%)] text-destructive",
  cancelled: "bg-secondary text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = { draft: "Draft", published: "Live", paused: "Paused" };

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-200",
        STATUS_STYLES[status] ?? STATUS_STYLES.draft,
      )}
    >
      {status === "published" && <span className="h-1.5 w-1.5 rounded-full bg-paid" />}
      {label ?? STATUS_LABEL[status] ?? status}
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
