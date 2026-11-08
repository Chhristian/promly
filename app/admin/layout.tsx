import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { demoAvatarUrls } from "@/lib/demo-images";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole("admin");
  const avatarUrl = (await demoAvatarUrls([profile]))[profile.display_name] ?? null;
  return (
    <AppShell
      avatarUrl={avatarUrl}
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
