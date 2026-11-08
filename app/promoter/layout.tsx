import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";
import { paymentsEnabled } from "@/lib/flags";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PromoterLayout({ children }: { children: React.ReactNode }) {
  const { profile, user, supabase } = await requireRole("promoter");
  if (paymentsEnabled() && profile.role === "promoter") {
    // Save the age band chosen at sign-up (16-17 / 18+) the first time the promoter arrives.
    const band = user.user_metadata?.age_band;
    if (band === "16-17" || band === "18+") {
      const { data: saved } = await supabase.from("promoter_age").select("age_band").eq("profile_id", user.id).maybeSingle();
      if (!saved) await createAdminClient().rpc("set_age_band", { p_actor_id: user.id, p_age_band: band });
    }
  }
  return (
    <AppShell
      home="/promoter"
      userName={profile.display_name || "Promoter"}
      roleLabel="Promoter"
      role="promoter"
      nav={[
        { href: "/promoter", label: "Dashboard", icon: "dashboard" },
        { href: "/promoter/explore", label: "Explore campaigns", icon: "explore" },
        ...(paymentsEnabled() ? [{ href: "/promoter/earnings", label: "Earnings", icon: "earnings" } as const] : []),
      ]}
    >
      {children}
    </AppShell>
  );
}
