/**
 * Shared demo data logic, used by:
 *   - scripts/seed-demo.ts and scripts/reset-demo.ts (terminal)
 *   - the admin page /admin/demo ("Prepare Stage Demo")
 *   - the Playwright end-to-end test
 *
 * It needs an admin (service role) Supabase client. It never creates or reads
 * passwords: demo ACCOUNTS are created only by `npm run seed-demo`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { PLATFORM_FEE_BPS, percentToFixedCommission, platformFeeMinor } from "./money";

type Db = SupabaseClient<Database>;
export type Role = "business" | "promoter" | "admin";

export const DEMO_ACCOUNTS = {
  barber: { envPrefix: "DEMO_BUSINESS", email: "demo-barber@example.com", displayName: "Demo Barber Club", role: "business" as Role },
  spain: { envPrefix: "DEMO_SPAIN_BUSINESS", email: "demo-watersports@example.com", displayName: "Mediterranean Water Sports Demo", role: "business" as Role },
  alex: { envPrefix: "DEMO_PROMOTER", email: "demo-alex@example.com", displayName: "Alex", role: "promoter" as Role },
  admin: { envPrefix: "DEMO_ADMIN", email: "demo-admin@example.com", displayName: "Promly Admin", role: "admin" as Role },
};
export type DemoKey = keyof typeof DEMO_ACCOUNTS;

const OSLO = "Europe/Oslo";
export const SLOT_FIRST_HOUR = 8; // first slot 08:00
export const SLOT_LAST_START_HOUR = 21; // last slot 21:00–22:00

export async function findUserIdByEmail(db: Db, email: string): Promise<string | undefined> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 200) return undefined;
  }
  return undefined;
}

/** Ids of the demo accounts that exist (missing ones are left out). */
export async function findDemoAccountIds(db: Db): Promise<Partial<Record<DemoKey, string>>> {
  const out: Partial<Record<DemoKey, string>> = {};
  for (const [key, a] of Object.entries(DEMO_ACCOUNTS) as [DemoKey, (typeof DEMO_ACCOUNTS)[DemoKey]][]) {
    const id = await findUserIdByEmail(db, a.email);
    if (id) out[key] = id;
  }
  return out;
}

type BusinessSeed = Omit<Database["public"]["Tables"]["businesses"]["Insert"], "owner_id" | "is_demo">;

async function ensureBusiness(db: Db, ownerId: string, b: BusinessSeed) {
  const { data: existing, error } = await db.from("businesses").select("id").eq("owner_id", ownerId).eq("name", b.name).maybeSingle();
  if (error) throw error;
  if (existing) {
    await db.from("businesses").update({ is_demo: true }).eq("id", existing.id);
    return { id: existing.id, created: false };
  }
  const { data, error: iErr } = await db.from("businesses").insert({ ...b, owner_id: ownerId, is_demo: true }).select("id").single();
  if (iErr) throw iErr;
  return { id: data.id, created: true };
}

type CampaignSeed = {
  service_name: string;
  description: string;
  price_minor: number;
  agreement: { commission_minor: number; payout_days: 7 | 14; refund_window_days: number; allowed_channels: string[]; brand_rules: string };
};

async function ensureCampaign(db: Db, businessId: string, c: CampaignSeed) {
  let { data: camp, error } = await db
    .from("campaigns").select("id, status, current_agreement_id")
    .eq("business_id", businessId).eq("service_name", c.service_name).maybeSingle();
  if (error) throw error;
  let created = false;
  if (!camp) {
    const ins = await db.from("campaigns")
      .insert({ business_id: businessId, service_name: c.service_name, description: c.description, price_minor: c.price_minor })
      .select("id, status, current_agreement_id").single();
    if (ins.error) throw ins.error;
    camp = ins.data;
    created = true;
  }
  if (!camp.current_agreement_id) {
    const ag = await db.from("agreements")
      .insert({ campaign_id: camp.id, ...c.agreement, business_accepted_at: new Date().toISOString() })
      .select("id").single();
    if (ag.error) throw ag.error;
    const up = await db.from("campaigns").update({ current_agreement_id: ag.data.id }).eq("id", camp.id);
    if (up.error) throw up.error;
  }
  return { id: camp.id, status: camp.status, created };
}

/** UTC offset (minutes) of Oslo at a given moment, e.g. 60 in winter. */
function osloOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: OSLO, timeZoneName: "longOffset" }).formatToParts(at);
  const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+01:00"; // "GMT+01:00"
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(tz);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 60;
}

/** Hourly 60-minute slots from 08:00 to 22:00 Oslo time (last one starts 21:00), today's remaining hours and the next 3 days. */
async function ensureSlots(db: Db, businessId: string): Promise<number> {
  const rows: { business_id: string; starts_at: string }[] = [];
  const now = Date.now();
  for (let d = 0; d <= 3; d++) {
    const dayDate = new Date(now + d * 86_400_000);
    const day = dayDate.toLocaleDateString("sv-SE", { timeZone: OSLO }); // YYYY-MM-DD
    const off = osloOffsetMinutes(dayDate);
    const sign = off >= 0 ? "+" : "-";
    const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
    const mm = String(Math.abs(off) % 60).padStart(2, "0");
    for (let h = SLOT_FIRST_HOUR; h <= SLOT_LAST_START_HOUR; h++) {
      const startsAt = new Date(`${day}T${String(h).padStart(2, "0")}:00:00${sign}${hh}:${mm}`);
      if (startsAt.getTime() > now + 15 * 60_000) rows.push({ business_id: businessId, starts_at: startsAt.toISOString() });
    }
  }
  if (!rows.length) return 0;
  const { error, count } = await db.from("time_slots").upsert(rows, { onConflict: "business_id,starts_at", ignoreDuplicates: true, count: "exact" });
  if (error) throw error;
  return count ?? 0;
}

export type SeedSummary = { lines: string[]; haircutCampaignId: string };

/** Mark demo profiles and create the demo businesses, draft campaigns and slots. Accounts must already exist. */
export async function seedDemoData(db: Db): Promise<SeedSummary> {
  const ids = await findDemoAccountIds(db);
  const missing = (Object.keys(DEMO_ACCOUNTS) as DemoKey[]).filter((k) => !ids[k]);
  if (missing.length) {
    throw new Error(`Demo accounts missing (${missing.map((k) => DEMO_ACCOUNTS[k].email).join(", ")}). Run: npm run seed-demo`);
  }
  for (const k of Object.keys(DEMO_ACCOUNTS) as DemoKey[]) {
    const a = DEMO_ACCOUNTS[k];
    const { error } = await db.from("profiles").update({ role: a.role, display_name: a.displayName, is_demo: true }).eq("id", ids[k]!);
    if (error) throw error;
  }

  const lines: string[] = [];
  const barber = await ensureBusiness(db, ids.barber!, {
    name: "Demo Barber Club", description: "Classic cuts and beard trims in the heart of Oslo. Illustrative demo business.",
    city: "Oslo", country: "NO", currency: "NOK", category: "barbershop",
  });
  const spain = await ensureBusiness(db, ids.spain!, {
    name: "Mediterranean Water Sports Demo", description: "Jet ski adventures on the Mediterranean coast. Illustrative demo business.",
    city: "Málaga", country: "ES", currency: "EUR", category: "jet_ski",
  });
  lines.push(`business ${barber.created ? "created" : "exists "}  Demo Barber Club`);
  lines.push(`business ${spain.created ? "created" : "exists "}  Mediterranean Water Sports Demo`);

  const haircut = await ensureCampaign(db, barber.id, {
    service_name: "Premium Haircut",
    description: "A premium haircut with wash, styling and a hot-towel finish (about 45 minutes).",
    price_minor: 50_000,
    agreement: {
      commission_minor: 10_000, payout_days: 7, refund_window_days: 3,
      allowed_channels: ["tiktok", "instagram", "snapchat", "whatsapp", "word_of_mouth", "qr_print"],
      brand_rules: "Use only the official photos. No discounts or guarantees that aren't in the campaign.",
    },
  });
  const jetski = await ensureCampaign(db, spain.id, {
    service_name: "Jet Ski Adventure",
    description: "A guided 60-minute jet ski tour along the coast. Safety briefing and life jacket included.",
    price_minor: 15_000,
    agreement: {
      commission_minor: percentToFixedCommission(15_000, 20), payout_days: 14, refund_window_days: 7,
      allowed_channels: ["tiktok", "instagram", "whatsapp", "word_of_mouth", "qr_print"],
      brand_rules: "Always mention the safety briefing. Don't promise weather conditions.",
    },
  });
  lines.push(`campaign ${haircut.created ? "created" : "exists "}  Premium Haircut — 500 NOK, 100 NOK commission (${haircut.status})`);
  lines.push(`campaign ${jetski.created ? "created" : "exists "}  Jet Ski Adventure — €150, 20% = €30 commission (${jetski.status})`);

  const s1 = await ensureSlots(db, barber.id);
  const s2 = await ensureSlots(db, spain.id);
  lines.push(`slots    added ${s1} for Demo Barber Club, ${s2} for Mediterranean Water Sports Demo`);
  return { lines, haircutCampaignId: haircut.id };
}

/** "Prepare Stage Demo": delete ALL demo-flagged data, then seed it fresh. */
export async function resetDemo(db: Db): Promise<SeedSummary> {
  const { error } = await db.rpc("purge_demo_data");
  if (error) throw new Error("purge_demo_data failed: " + error.message);
  const summary = await seedDemoData(db);
  return { ...summary, lines: ["purged all demo data", ...summary.lines] };
}

// ---------------------------------------------------------------------------
// Health check (server side). Realtime is checked in the browser separately.
// ---------------------------------------------------------------------------
export type Check = { name: string; ok: boolean; detail: string };

function osloDay(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString("sv-SE", { timeZone: OSLO });
}

export async function runServerHealthChecks(db: Db, liveUrl: string | null): Promise<Check[]> {
  const checks: Check[] = [];
  const run = async (name: string, fn: () => Promise<{ ok: boolean; detail: string }>) => {
    try {
      checks.push({ name, ...(await fn()) });
    } catch (e) {
      checks.push({ name, ok: false, detail: e instanceof Error ? e.message : String(e) });
    }
  };

  await run("Database reachable", async () => {
    const t0 = Date.now();
    const { error, count } = await db.from("profiles").select("id", { count: "exact", head: true });
    if (error) return { ok: false, detail: error.message };
    return { ok: true, detail: `${count} profiles, ${Date.now() - t0} ms` };
  });

  await run("All 4 demo accounts exist", async () => {
    const ids = await findDemoAccountIds(db);
    const problems: string[] = [];
    for (const k of Object.keys(DEMO_ACCOUNTS) as DemoKey[]) {
      const a = DEMO_ACCOUNTS[k];
      if (!ids[k]) { problems.push(`${a.email} missing`); continue; }
      const { data } = await db.from("profiles").select("role").eq("id", ids[k]!).maybeSingle();
      if (data?.role !== a.role) problems.push(`${a.displayName} has role ${data?.role ?? "none"}, expected ${a.role}`);
    }
    return problems.length ? { ok: false, detail: problems.join("; ") } : { ok: true, detail: "Demo Barber Club, Water Sports, Alex, Admin" };
  });

  await run("Fee maths: 500 NOK → 13.75 NOK", async () => {
    const ts = platformFeeMinor(50_000);
    const { data, error } = await db.rpc("platform_fee_minor", { p_price_minor: 50_000, p_fee_bps: PLATFORM_FEE_BPS });
    if (error) return { ok: false, detail: error.message };
    const dbFee = Number(data);
    return { ok: ts === 1375 && dbFee === 1375, detail: `app ${ts / 100} NOK, database ${dbFee / 100} NOK` };
  });

  await run("Demo campaigns ready", async () => {
    const { data } = await db
      .from("campaigns")
      .select("service_name, status, current_agreement_id, businesses!inner(is_demo)")
      .eq("businesses.is_demo", true);
    const haircut = data?.find((c) => c.service_name === "Premium Haircut");
    if (!haircut) return { ok: false, detail: "Premium Haircut not found. Run Prepare Stage Demo." };
    if (!haircut.current_agreement_id) return { ok: false, detail: "Premium Haircut has no accepted agreement." };
    return { ok: true, detail: (data ?? []).map((c) => `${c.service_name}: ${c.status}`).join(", ") };
  });

  await run("Free time slots today and tomorrow", async () => {
    const { data: biz } = await db.from("businesses").select("id").eq("name", "Demo Barber Club").eq("is_demo", true).maybeSingle();
    if (!biz) return { ok: false, detail: "Demo Barber Club not found" };
    const nowIso = new Date().toISOString();
    const [{ data: slots }, { data: taken }] = await Promise.all([
      db.from("time_slots").select("starts_at").eq("business_id", biz.id).gt("starts_at", nowIso),
      db.from("bookings").select("slot_start").eq("business_id", biz.id).in("status", ["pending", "verified"]),
    ]);
    const takenSet = new Set((taken ?? []).map((t) => new Date(t.slot_start).getTime()));
    const free = (slots ?? []).filter((s) => !takenSet.has(new Date(s.starts_at).getTime()));
    const dayOf = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: OSLO });
    const today = free.filter((s) => dayOf(s.starts_at) === osloDay(0)).length;
    const tomorrow = free.filter((s) => dayOf(s.starts_at) === osloDay(1)).length;
    // After the last slot of the day there are none left today; tomorrow must always have some.
    const lateEvening = Number(new Date().toLocaleString("en-GB", { timeZone: OSLO, hour: "2-digit", hour12: false })) >= SLOT_LAST_START_HOUR;
    const ok = tomorrow > 0 && (today > 0 || lateEvening);
    return { ok, detail: `${today} free today${today === 0 && lateEvening ? " (none left this late, OK)" : ""}, ${tomorrow} free tomorrow` };
  });

  await run("Live site responding", async () => {
    if (!liveUrl) return { ok: false, detail: "No production URL configured" };
    const t0 = Date.now();
    const res = await fetch(liveUrl, { cache: "no-store", redirect: "follow" });
    const text = await res.text();
    const ok = res.ok && text.includes("People get paid");
    return { ok, detail: `${liveUrl} → HTTP ${res.status} in ${Date.now() - t0} ms${ok ? "" : ", landing page text missing"}` };
  });

  return checks;
}
