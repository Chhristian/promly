"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, LayoutDashboard, PlusCircle, Receipt, ShieldCheck, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  bookings: CalendarDays,
  new: PlusCircle,
  explore: Compass,
  admin: ShieldCheck,
  billing: Receipt,
  earnings: Wallet,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

export function NavLinks({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <div className="flex gap-0.5 overflow-x-auto rounded-full bg-secondary p-1 [scrollbar-width:none]">
      {items.map((n) => {
        const Icon = ICONS[n.icon];
        const active = n.href === path || (n.href !== "/business" && n.href !== "/promoter" && path.startsWith(n.href));
        return (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors duration-150",
              active ? "bg-ink text-white" : "text-muted-foreground hover:bg-card hover:text-foreground",
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
