"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, LayoutDashboard, PlusCircle, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  bookings: CalendarDays,
  new: PlusCircle,
  explore: Compass,
  studio: Sparkles,
  admin: ShieldCheck,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <div className="flex gap-1 overflow-x-auto">
      {items.map((n) => {
        const Icon = ICONS[n.icon];
        const active = n.href === path || (n.href !== "/business" && n.href !== "/promoter" && path.startsWith(n.href));
        return (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition",
              active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {n.label}
          </Link>
        );
      })}
    </div>
  );
}
