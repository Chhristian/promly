import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("business");
  return (
    <AppShell
      home="/business"
      userName={profile.display_name || "Business"}
      roleLabel="Business"
      nav={[
        { href: "/business", label: "Dashboard" },
        { href: "/business/bookings", label: "Bookings" },
        { href: "/business/campaigns/new", label: "New campaign" },
      ]}
    >
      {children}
    </AppShell>
  );
}
