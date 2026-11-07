import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Role = "business" | "promoter" | "admin";

/** The logged-in user (or null) and their profile (null if the account has no profile yet). */
export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  return { user: data.user, profile: profile ?? null, supabase };
}

/** The logged-in user with a profile, or null. */
export async function getCurrentUser() {
  const s = await getSession();
  if (!s?.profile) return null;
  return { user: s.user, profile: s.profile, supabase: s.supabase };
}

/** Where each role lands after logging in. */
export function homeFor(role: string): string {
  if (role === "admin") return "/admin/demo";
  return role === "business" ? "/business" : "/promoter";
}

/**
 * Require a logged-in user with one of the given roles (admins pass too).
 * Logged in but no profile yet (e.g. an account created before profiles
 * existed) → /onboarding, never back to the login page.
 */
export async function requireRole(...roles: Role[]) {
  const s = await getSession();
  if (!s) redirect("/auth/login");
  if (!s.profile) redirect("/onboarding");
  const role = s.profile.role as Role;
  if (role !== "admin" && !roles.includes(role)) redirect(homeFor(role));
  return { user: s.user, profile: s.profile, supabase: s.supabase };
}
