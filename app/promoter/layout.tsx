import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export default async function PromoterLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("promoter");
  return (
    <AppShell
      home="/promoter"
      userName={profile.display_name || "Promoter"}
      roleLabel="Promoter"
      nav={[
        { href: "/promoter", label: "Dashboard" },
        { href: "/promoter/explore", label: "Explore campaigns" },
        { href: "/promoter/studio", label: "Marketing Studio" },
      ]}
    >
      {children}
    </AppShell>
  );
}
