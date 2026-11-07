import { BadgeCheck, Bell, CalendarCheck, Undo2, UserPlus, Wallet, type LucideIcon } from "lucide-react";
import { Highlight } from "@/components/live";
import { formatDateTime } from "@/lib/format";

const ICON: Record<string, { icon: LucideIcon; tint: string }> = {
  promoter_joined: { icon: UserPlus, tint: "bg-[hsl(232_90%_95%)] text-primary" },
  booking_created: { icon: CalendarCheck, tint: "bg-secondary text-ink" },
  booking_verified: { icon: BadgeCheck, tint: "bg-[hsl(232_90%_95%)] text-primary" },
  commission_available: { icon: Wallet, tint: "bg-marker text-ink" },
  booking_refunded: { icon: Undo2, tint: "bg-[hsl(0_80%_95%)] text-destructive" },
};

type Item = { id: number; type: string; title: string; created_at: string };

/** Activity as a timeline: one rail, one dot per real event. */
export function ActivityFeed({ items, emptyText }: { items: Item[]; emptyText: string }) {
  return (
    <section className="min-w-0 space-y-3">
      <h2 className="text-lg">Activity</h2>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-input p-5 text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[1.4rem] before:top-3 before:w-px before:bg-border">
          {items.map((n) => {
            const s = ICON[n.type] ?? { icon: Bell, tint: "bg-secondary text-muted-foreground" };
            const Icon = s.icon;
            return (
              <li key={n.id}>
                <Highlight ids={[n.id]} className="rounded-xl">
                  <div className="flex items-start gap-3 rounded-xl px-2 py-2">
                    <span className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-full ring-4 ring-background ${s.tint}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <div className="text-sm font-semibold leading-snug">{n.title}</div>
                      <div className="text-xs text-muted-foreground">{formatDateTime(n.created_at)}</div>
                    </div>
                  </div>
                </Highlight>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
