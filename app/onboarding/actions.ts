"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession, homeFor } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/components/action-form";

const schema = z.object({
  role: z.enum(["business", "promoter"], { message: "Choose business or promoter" }),
  display_name: z.string().trim().min(1, "Enter your name").max(80),
});

/**
 * Create the missing profile for the logged-in user. Only ever for the
 * caller's own id, only business/promoter (never admin), and never overwrites
 * an existing profile.
 */
export async function finishSetup(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await getSession();
  if (!s) redirect("/auth/login");
  if (s.profile) redirect(homeFor(s.profile.role));
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };

  const { error } = await createAdminClient()
    .from("profiles")
    .upsert({ id: s.user.id, role: parsed.data.role, display_name: parsed.data.display_name }, { onConflict: "id", ignoreDuplicates: true });
  if (error) return { error: "Couldn't finish setting up your account. Please try again." };
  redirect(homeFor(parsed.data.role));
}
