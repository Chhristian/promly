import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Role = "business" | "promoter" | "admin";

/** The logged-in user and their profile, or null. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
  if (!profile) return null;
  return { user: data.user, profile, supabase };
}

/** Where each role lands after logging in. */
export function homeFor(role: string): string {
  if (role === "admin") return "/admin/demo";
  return role === "business" ? "/business" : "/promoter";
}

/** Require a logged-in user with one of the given roles (admins pass too). */
export async function requireRole(...roles: Role[]) {
  const current = await getCurrentUser();
  if (!current) redirect("/auth/login");
  const role = current.profile.role as Role;
  if (role !== "admin" && !roles.includes(role)) redirect(homeFor(role));
  return current;
}
