/**
 * npm run seed-demo
 *
 * Creates (or updates) the stage demo data on the hosted Supabase project:
 *   - accounts: Demo Barber Club (business), Mediterranean Water Sports Demo (business),
 *     Alex (promoter), Promly Admin (admin)
 *   - the Norway and Spain campaigns as DRAFTS with accepted agreements (ready to publish)
 *   - bookable time slots for today (remaining hours) and the next 3 days, 10:00–17:00
 *
 * Everything is flagged is_demo. Safe to run repeatedly: existing rows are reused.
 * Passwords are generated once and stored ONLY in .env.local; they are never printed.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import { percentToFixedCommission } from "../lib/money";

const root = path.resolve(__dirname, "..");
loadEnvConfig(root);
const envPath = path.join(root, ".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Missing Supabase URL or service role key in .env.local");

const db = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Role = "business" | "promoter" | "admin";
type DemoAccount = { envPrefix: string; email: string; displayName: string; role: Role };

const ACCOUNTS: Record<"barber" | "spain" | "alex" | "admin", DemoAccount> = {
  barber: { envPrefix: "DEMO_BUSINESS", email: "demo-barber@example.com", displayName: "Demo Barber Club", role: "business" },
  spain: { envPrefix: "DEMO_SPAIN_BUSINESS", email: "demo-watersports@example.com", displayName: "Mediterranean Water Sports Demo", role: "business" },
  alex: { envPrefix: "DEMO_PROMOTER", email: "demo-alex@example.com", displayName: "Alex", role: "promoter" },
  admin: { envPrefix: "DEMO_ADMIN", email: "demo-admin@example.com", displayName: "Promly Admin", role: "admin" },
};

// ---------------------------------------------------------------------------
// .env.local: reuse existing values, append missing ones (never printed)
// ---------------------------------------------------------------------------
function envFileValue(name: string): string | undefined {
  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(name + "="));
  return line ? line.slice(name.length + 1) : undefined;
}

function ensureEnv(name: string, make: () => string): string {
  const existing = envFileValue(name);
  if (existing) return existing;
  const value = make();
  const text = readFileSync(envPath, "utf8");
  const header = text.includes("# Demo accounts") ? "" : "\n# Demo accounts (created by npm run seed-demo). Never commit.\n";
  appendFileSync(envPath, `${text.endsWith("\n") ? "" : "\n"}${header}${name}=${value}\n`);
  return value;
}

const newPassword = () => "Pm-" + randomBytes(15).toString("base64url");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function findUserIdByEmail(email: string): Promise<string | undefined> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 200) return undefined;
  }
  return undefined;
}

async function ensureAccount(a: DemoAccount): Promise<{ id: string; created: boolean }> {
  ensureEnv(`${a.envPrefix}_EMAIL`, () => a.email);
  const password = ensureEnv(`${a.envPrefix}_PASSWORD`, newPassword);
  const metadata = { role: a.role === "admin" ? "promoter" : a.role, display_name: a.displayName };

  let id = await findUserIdByEmail(a.email);
  let created = false;
  if (id) {
    // Keep the password in sync with .env.local
    const { error } = await db.auth.admin.updateUserById(id, { password, user_metadata: metadata, email_confirm: true });
    if (error) throw error;
  } else {
    const { data, error } = await db.auth.admin.createUser({
      email: a.email, password, email_confirm: true, user_metadata: metadata,
    });
    if (error) throw error;
    id = data.user.id;
    created = true;
  }

  const { error: pErr } = await db
    .from("profiles")
    .update({ role: a.role, display_name: a.displayName, is_demo: true })
    .eq("id", id);
  if (pErr) throw pErr;
  return { id, created };
}

type BusinessSeed = Omit<Database["public"]["Tables"]["businesses"]["Insert"], "owner_id" | "is_demo">;

async function ensureBusiness(ownerId: string, b: BusinessSeed): Promise<{ id: string; created: boolean }> {
  const { data: existing, error } = await db
    .from("businesses").select("id").eq("owner_id", ownerId).eq("name", b.name).maybeSingle();
  if (error) throw error;
  if (existing) {
    await db.from("businesses").update({ is_demo: true }).eq("id", existing.id);
    return { id: existing.id, created: false };
  }
  const { data, error: iErr } = await db
    .from("businesses").insert({ ...b, owner_id: ownerId, is_demo: true }).select("id").single();
  if (iErr) throw iErr;
  return { id: data.id, created: true };
}

type CampaignSeed = {
  service_name: string;
  description: string;
  price_minor: number;
  agreement: {
    commission_minor: number;
    payout_days: 7 | 14;
    refund_window_days: number;
    allowed_channels: string[];
    brand_rules: string;
  };
};

async function ensureCampaign(businessId: string, c: CampaignSeed) {
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

/** Hourly slots 10:00–17:00 local time (CET, UTC+1 in November) for today's remaining hours and the next 3 days. */
async function ensureSlots(businessId: string): Promise<number> {
  const rows: { business_id: string; starts_at: string }[] = [];
  const now = Date.now();
  for (let d = 0; d <= 3; d++) {
    const day = new Date(now + d * 86_400_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" }); // YYYY-MM-DD
    for (let h = 10; h <= 17; h++) {
      const startsAt = new Date(`${day}T${String(h).padStart(2, "0")}:00:00+01:00`);
      if (startsAt.getTime() > now + 15 * 60_000) rows.push({ business_id: businessId, starts_at: startsAt.toISOString() });
    }
  }
  const { error, count } = await db.from("time_slots")
    .upsert(rows, { onConflict: "business_id,starts_at", ignoreDuplicates: true, count: "exact" });
  if (error) throw error;
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
async function main() {
  const ids: Record<string, string> = {};
  for (const [key, a] of Object.entries(ACCOUNTS)) {
    const r = await ensureAccount(a);
    ids[key] = r.id;
    console.log(`account  ${r.created ? "created " : "updated "} ${a.role.padEnd(8)} ${a.displayName} <${a.email}>  (password: ${a.envPrefix}_PASSWORD in .env.local)`);
  }

  const barber = await ensureBusiness(ids.barber, {
    name: "Demo Barber Club", description: "Classic cuts and beard trims in the heart of Oslo. Illustrative demo business.",
    city: "Oslo", country: "NO", currency: "NOK", category: "barbershop",
  });
  const spain = await ensureBusiness(ids.spain, {
    name: "Mediterranean Water Sports Demo", description: "Jet ski adventures on the Mediterranean coast. Illustrative demo business.",
    city: "Málaga", country: "ES", currency: "EUR", category: "jet_ski",
  });
  console.log(`business ${barber.created ? "created " : "exists  "} Demo Barber Club`);
  console.log(`business ${spain.created ? "created " : "exists  "} Mediterranean Water Sports Demo`);

  const haircut = await ensureCampaign(barber.id, {
    service_name: "Premium Haircut",
    description: "A premium haircut with wash, styling and a hot-towel finish (about 45 minutes).",
    price_minor: 50_000, // 500 NOK
    agreement: {
      commission_minor: 10_000, // 100 NOK
      payout_days: 7,
      refund_window_days: 3,
      allowed_channels: ["tiktok", "instagram", "snapchat", "whatsapp", "word_of_mouth", "qr_print"],
      brand_rules: "Use only the official photos. No discounts or guarantees that aren't in the campaign.",
    },
  });
  const jetski = await ensureCampaign(spain.id, {
    service_name: "Jet Ski Adventure",
    description: "A guided 60-minute jet ski tour along the coast. Safety briefing and life jacket included.",
    price_minor: 15_000, // €150
    agreement: {
      commission_minor: percentToFixedCommission(15_000, 20), // 20% → €30
      payout_days: 14,
      refund_window_days: 7,
      allowed_channels: ["tiktok", "instagram", "whatsapp", "word_of_mouth", "qr_print"],
      brand_rules: "Always mention the safety briefing. Don't promise weather conditions.",
    },
  });
  console.log(`campaign ${haircut.created ? "created " : "exists  "} Premium Haircut — 500 NOK, 100 NOK commission (${haircut.status})`);
  console.log(`campaign ${jetski.created ? "created " : "exists  "} Jet Ski Adventure — €150, 20% = €30 commission (${jetski.status})`);

  const s1 = await ensureSlots(barber.id);
  const s2 = await ensureSlots(spain.id);
  console.log(`slots    added ${s1} for Demo Barber Club, ${s2} for Mediterranean Water Sports Demo (existing ones kept)`);
  console.log("done");
}

main().catch((e) => {
  console.error("seed-demo failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
