import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  accent,
  icon: Icon,
  size = "md",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: boolean;
  icon?: LucideIcon;
  size?: "md" | "lg" | "quiet";
}) {
  return (
    <div
      className={cn(
        "card h-full p-4 sm:p-5",
        accent && "border-violet-400/50 bg-gradient-to-br from-violet-600/25 via-card/80 to-blue-600/15",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        {Icon && <Icon className={cn("h-5 w-5 shrink-0", accent ? "text-violet-300" : "text-muted-foreground/70")} />}
      </div>
      <div
        className={cn(
          "mt-2 whitespace-nowrap font-bold tabular-nums tracking-tight",
          size === "lg"
            ? "text-[clamp(2.25rem,10vw,3.75rem)] tracking-[-0.03em]"
            : size === "quiet"
              ? "text-[clamp(1.6rem,7vw,1.875rem)] font-semibold text-foreground/90"
              : "text-[clamp(1.6rem,7vw,2.25rem)]",
          accent && "text-gradient",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1.5 text-sm text-muted-foreground">{hint}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground ring-border",
  published: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  paused: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  pending: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  verified: "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  available: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  refunded: "bg-red-500/15 text-red-300 ring-red-500/30",
  cancelled: "bg-secondary text-muted-foreground ring-border",
};

const STATUS_LABEL: Record<string, string> = { draft: "Draft", published: "Live", paused: "Paused" };

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        STATUS_STYLES[status] ?? STATUS_STYLES.draft,
      )}
    >
      {status === "published" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
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
