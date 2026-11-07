import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("admin");
  return (
    <AppShell
      home="/admin/demo"
      userName={profile.display_name || "Admin"}
      roleLabel="Admin"
      role="admin"
      nav={[{ href: "/admin/demo", label: "Demo Control Center", icon: "admin" }]}
    >
      {children}
    </AppShell>
  );
}
