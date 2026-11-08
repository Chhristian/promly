"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { paymentsEnabled } from "@/lib/flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { startPayoutOnboarding } from "@/lib/payments-server";
import type { ActionState } from "@/components/action-form";

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** The promoter confirms their age band (16-17 or 18+). Under 16 can't use Promly. */
export async function saveAgeBand(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!paymentsEnabled()) return { error: "Payments are not available yet." };
  const { user } = await requireRole("promoter");
  const band = fd.get("age_band");
  if (band !== "16-17" && band !== "18+") return { error: "Choose your age." };
  const { error } = await createAdminClient().rpc("set_age_band", { p_actor_id: user.id, p_age_band: band });
  if (error) {
    if (error.message.includes("age_band_cannot_go_down")) return { error: "You already confirmed you're 18 or older." };
    return { error: "Couldn't save your age. Try again." };
  }
  revalidatePath("/promoter", "layout");
  return { ok: "Saved." };
}

/**
 * Start (or continue) Stripe-hosted onboarding for the payout account.
 * 16-17: a parent/guardian must tick consent and completes onboarding as the account holder.
 */
export async function startPayoutSetup(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!paymentsEnabled()) return { error: "Payments are not available yet." };
  const { user, profile, supabase } = await requireRole("promoter");
  const { data: age } = await supabase.from("promoter_age").select("age_band").eq("profile_id", user.id).maybeSingle();
  if (!age) return { error: "Confirm your age first." };
  const band = age.age_band as "16-17" | "18+";
  if (band === "16-17" && fd.get("guardian_consent") !== "on") {
    return { error: "A parent or guardian needs to tick the consent box and complete the Stripe form." };
  }
  const base = await origin();
  let url: string;
  try {
    url = await startPayoutOnboarding(createAdminClient(), {
      profileId: user.id,
      email: user.email ?? "",
      displayName: profile.display_name || "Promly promoter",
      band,
      guardianConsentAt: band === "16-17" ? new Date().toISOString() : null,
      returnUrl: `${base}/promoter/earnings?stripe=return`,
      refreshUrl: `${base}/promoter/earnings?stripe=refresh`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("payout onboarding failed", msg);
    if (msg.includes("losses collector")) {
      return { error: "Payout setup isn't switched on yet on Promly's Stripe account. Please try again later." };
    }
    return { error: "Couldn't open Stripe right now. Try again in a minute." };
  }
  redirect(url);
}
