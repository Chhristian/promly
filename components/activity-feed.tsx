import { BadgeCheck, Bell, CalendarCheck, Undo2, UserPlus, Wallet, type LucideIcon } from "lucide-react";
import { Highlight } from "@/components/live";
import { formatDateTime } from "@/lib/format";

const ICON: Record<string, { icon: LucideIcon; tint: string }> = {
  promoter_joined: { icon: UserPlus, tint: "bg-violet-500/15 text-violet-300" },
  booking_created: { icon: CalendarCheck, tint: "bg-blue-500/15 text-blue-300" },
  booking_verified: { icon: BadgeCheck, tint: "bg-sky-500/15 text-sky-300" },
  commission_available: { icon: Wallet, tint: "bg-emerald-500/15 text-emerald-300" },
  booking_refunded: { icon: Undo2, tint: "bg-red-500/15 text-red-300" },
};

type Item = { id: number; type: string; title: string; created_at: string };

export function ActivityFeed({ items, emptyText }: { items: Item[]; emptyText: string }) {
  return (
    <section className="min-w-0 space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Bell className="h-4 w-4 text-muted-foreground" /> Activity
      </h2>
      {items.length === 0 ? (
        <div className="card p-5 text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const s = ICON[n.type] ?? { icon: Bell, tint: "bg-secondary text-muted-foreground" };
            const Icon = s.icon;
            return (
              <Highlight key={n.id} ids={[n.id]}>
                <div className="card flex items-start gap-3 p-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${s.tint}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-snug">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{formatDateTime(n.created_at)}</div>
                  </div>
                </div>
              </Highlight>
            );
          })}
        </div>
      )}
    </section>
  );
}
