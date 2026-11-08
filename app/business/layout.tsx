import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { getMarket } from "@/lib/market-server";
import { paymentsEnabled } from "@/lib/flags";

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("business");
  const market = await getMarket();
  return (
    <AppShell
      market={market.key}
      home="/business"
      userName={profile.display_name || "Business"}
      roleLabel="Business"
      role="business"
      nav={[
        { href: "/business", label: "Dashboard", icon: "dashboard" },
        { href: "/business/bookings", label: "Bookings", icon: "bookings" },
        { href: "/business/campaigns/new", label: "New campaign", icon: "new" },
        ...(paymentsEnabled() ? [{ href: "/business/billing", label: "Billing", icon: "billing" } as const] : []),
      ]}
    >
      {children}
    </AppShell>
  );
}
