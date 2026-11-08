"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { paymentsEnabled } from "@/lib/flags";
import { createMonthlyInvoices, payTestInvoice, runPayouts } from "@/lib/payments-server";

export type PaymentsResult = { ok: boolean; lines: string[]; at: string };

/** Admin + Demo Mode + payments flag. Only demo businesses/promoters are touched. */
async function guard() {
  await requireRole("admin");
  if (!paymentsEnabled()) throw new Error("Payments are off (PAYMENTS_ENABLED).");
  if (process.env.DEMO_MODE !== "true") throw new Error("Demo Mode is off.");
  return createAdminClient();
}

async function result(fn: () => Promise<string[]>): Promise<PaymentsResult> {
  try {
    const lines = await fn();
    revalidatePath("/", "layout");
    return { ok: true, lines, at: new Date().toISOString() };
  } catch (e) {
    return { ok: false, lines: [e instanceof Error ? e.message : String(e)], at: new Date().toISOString() };
  }
}

async function demoBusinesses(db: ReturnType<typeof createAdminClient>) {
  const { data } = await db.from("businesses").select("id, owner_id, name").eq("is_demo", true);
  return data ?? [];
}

/** "Simulate end of 14-day holding period": verified demo bookings become final now. */
export async function simulateHoldingEnd() {
  return result(async () => {
    const db = await guard();
    const businesses = await demoBusinesses(db);
    const { data: bookings } = await db
      .from("bookings")
      .select("id, business_id")
      .eq("status", "verified")
      .is("final_at", null)
      .in("business_id", businesses.map((b) => b.id));
    const lines: string[] = [];
    for (const bk of bookings ?? []) {
      const owner = businesses.find((b) => b.id === bk.business_id)!.owner_id;
      const { error } = await db.rpc("simulate_end_of_holding_period", { p_booking_id: bk.id, p_actor_id: owner });
      lines.push(error ? `booking ${bk.id.slice(0, 8)}: ${error.message}` : `booking ${bk.id.slice(0, 8)} is now final`);
    }
    return lines.length ? lines : ["no verified demo bookings waiting"];
  });
}

/** "Create this month's invoices" for the demo businesses (real Stripe test-mode invoices). */
export async function createInvoicesNow() {
  return result(async () => {
    const db = await guard();
    return createMonthlyInvoices(db, (await demoBusinesses(db)).map((b) => b.id));
  });
}

/** "Pay test invoice": Stripe's test card pays each open demo invoice; the webhook then marks it paid. */
export async function payTestInvoices() {
  return result(async () => {
    const db = await guard();
    const ids = (await demoBusinesses(db)).map((b) => b.id);
    const { data: open } = await db.from("business_invoices").select("id").eq("status", "open").in("business_id", ids);
    if (!open?.length) return ["no open demo invoices"];
    const lines: string[] = [];
    for (const inv of open) lines.push(`invoice ${inv.id.slice(0, 8)}: ${await payTestInvoice(db, inv.id)}`);
    // Wait (up to ~15 s) for the signed webhook to mark them paid. Nothing here marks them paid.
    for (let i = 0; i < 15; i++) {
      const { data } = await db.from("business_invoices").select("id").in("id", open.map((o) => o.id)).eq("status", "paid");
      if ((data?.length ?? 0) === open.length) {
        lines.push("✓ webhook confirmed: paid by business");
        return lines;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    lines.push("Stripe accepted the payment, but no webhook has confirmed it yet. Is the webhook reaching this deployment?");
    return lines;
  });
}

/** "Run payouts" for the demo promoters: only commission from PAID invoices, from available funds. */
export async function runPayoutsNow() {
  return result(async () => {
    const db = await guard();
    const { data: demo } = await db.from("profiles").select("id").eq("is_demo", true).eq("role", "promoter");
    return runPayouts(db, { runKey: `demo-${Date.now()}`, promoterIds: (demo ?? []).map((p) => p.id) });
  });
}
