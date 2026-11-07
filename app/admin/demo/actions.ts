"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resetDemo, runServerHealthChecks, type Check } from "@/lib/demo-seed";

const PRODUCTION_URL =process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://promly-eight.vercel.app";

export async function prepareStageDemo(): Promise<{ ok: boolean; lines: string[]; at: string }> {
  await requireRole("admin");
  try {
    const { lines } = await resetDemo(createAdminClient());
    revalidatePath("/", "layout");
    return { ok: true, lines, at: new Date().toISOString() };
  } catch (e) {
    return { ok: false, lines: [e instanceof Error ? e.message : String(e)], at: new Date().toISOString() };
  }
}

export async function runHealthCheck(): Promise<{ checks: Check[]; at: string }> {
  await requireRole("admin");
  const checks = await runServerHealthChecks(createAdminClient(), PRODUCTION_URL);
  return { checks, at: new Date().toISOString() };
}
