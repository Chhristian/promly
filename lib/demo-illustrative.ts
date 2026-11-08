/**
 * ILLUSTRATIVE DEMO DATA (labelled as such in the app). Fictional online-checkout businesses,
 * campaigns and promoters, plus four weeks of history, so dashboards aren't empty.
 *
 * - Everything is is_demo and recreated by "Prepare Stage Demo" (the purge deletes demo businesses,
 *   and with them their campaigns, links, bookings and ledger rows).
 * - Never touches the stage-demo businesses or Alex.
 * - Invented names only, @example.com emails, random passwords that are never stored or printed.
 * - History goes through the real money functions (create_booking, verify_booking,
 *   release_commission, refund_booking), so the ledger stays consistent. Only timestamps on
 *   bookings, visits and notifications are moved into the past afterwards (ledger rows are
 *   append-only and keep their real creation time).
 */
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { PLATFORM_FEE_BPS } from "./money";

type Db = SupabaseClient<Database>;
type Category = Database["public"]["Tables"]["businesses"]["Insert"]["category"];

const DAY = 86_400_000;

// Deterministic pseudo-random numbers, so every reset looks the same.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

type CampaignDef = { name: string; description: string; price: number; commission: number; rating: "16+" | "18+"; bookings: number };
type BusinessDef = {
  key: string; owner: string; name: string; description: string; city: string;
  country: "NO" | "ES"; currency: "NOK" | "EUR"; category: Category; campaigns: CampaignDef[];
};

/** 8 fictional businesses, 13 campaigns. Prices in minor units. */
export const ILLUSTRATIVE_BUSINESSES: BusinessDef[] = [
  {
    key: "kayak", owner: "Torild", name: "Fjordpadle Kayak Rental", city: "Oslo", country: "NO", currency: "NOK", category: "water_sports",
    description: "Sit-on-top kayaks for exploring the inner Oslofjord, booked and paid online. Illustrative demo business.",
    campaigns: [
      { name: "2-hour kayak rental", description: "A single or double kayak for two hours, life jacket and dry bag included.", price: 45_000, commission: 8_000, rating: "16+", bookings: 8 },
      { name: "Guided sunset paddle", description: "A guided 2.5-hour evening paddle for beginners. All gear included.", price: 69_000, commission: 12_000, rating: "16+", bookings: 5 },
    ],
  },
  {
    key: "escape", owner: "Ola", name: "Bunkerkoden Escape Rooms", city: "Oslo", country: "NO", currency: "NOK", category: "activity",
    description: "Three escape rooms in a former storage cellar, booked online per group. Illustrative demo business.",
    campaigns: [
      { name: "Escape room for 2–6 players", description: "60 minutes, one room, price per group. Book a time slot online.", price: 129_000, commission: 20_000, rating: "16+", bookings: 6 },
    ],
  },
  {
    key: "climb", owner: "Sigrid", name: "Kvarts Climbing Gym", city: "Oslo", country: "NO", currency: "NOK", category: "fitness",
    description: "Bouldering and rope climbing with online memberships and class booking. Illustrative demo business.",
    campaigns: [
      { name: "1-month climbing membership", description: "Unlimited climbing for 30 days, shoes not included. Buy online and start the same day.", price: 69_000, commission: 15_000, rating: "16+", bookings: 5 },
      { name: "Intro to bouldering class", description: "A 90-minute beginner class with an instructor, shoes included.", price: 35_000, commission: 6_000, rating: "16+", bookings: 4 },
    ],
  },
  {
    key: "club", owner: "Henrik", name: "Nattlys Club", city: "Oslo", country: "NO", currency: "NOK", category: "club",
    description: "Weekend club nights with tickets sold online. 18+ only. Illustrative demo business.",
    campaigns: [
      { name: "Saturday entry ticket", description: "Entry before midnight on Saturday. ID checked at the door; 18+ only.", price: 25_000, commission: 4_000, rating: "18+", bookings: 7 },
      { name: "Table booking for 6", description: "A reserved table for six on Friday or Saturday. 18+ only.", price: 300_000, commission: 40_000, rating: "18+", bookings: 2 },
    ],
  },
  {
    key: "cooking", owner: "Marit", name: "Saltvann Cooking School", city: "Oslo", country: "NO", currency: "NOK", category: "experience",
    description: "Small-group cooking classes with online booking. Illustrative demo business.",
    campaigns: [
      { name: "Seafood cooking class", description: "A 3-hour hands-on class: prepare and eat a three-course seafood dinner.", price: 99_000, commission: 15_000, rating: "16+", bookings: 4 },
    ],
  },
  {
    key: "jetski", owner: "Toni", name: "Cala Verda Jet Ski", city: "Alcúdia, Mallorca", country: "ES", currency: "EUR", category: "jet_ski",
    description: "Guided jet ski rides on the bay, booked and paid online. Illustrative demo business.",
    campaigns: [
      { name: "30-minute guided jet ski ride", description: "Safety briefing, life jacket and a guide. Drivers must be 18+.", price: 9_000, commission: 1_500, rating: "18+", bookings: 6 },
    ],
  },
  {
    key: "catamaran", owner: "Aina", name: "Blau Mar Catamarans", city: "Palma, Mallorca", country: "ES", currency: "EUR", category: "boat_tour",
    description: "Catamaran day trips and sunset cruises, booked online. Illustrative demo business.",
    campaigns: [
      { name: "Full-day catamaran trip with lunch", description: "Six hours along the coast with swimming stops and lunch on board.", price: 12_000, commission: 2_000, rating: "16+", bookings: 5 },
      { name: "Sunset catamaran cruise", description: "A 2-hour cruise at sunset with soft drinks included.", price: 7_500, commission: 1_200, rating: "16+", bookings: 4 },
    ],
  },
  {
    key: "festival", owner: "Joan", name: "Ritme Festival", city: "Palma, Mallorca", country: "ES", currency: "EUR", category: "event",
    description: "A two-day open-air music festival with tickets sold online. Illustrative demo business.",
    campaigns: [
      { name: "Weekend festival pass", description: "Entry on both days. 18+ only; ID checked at the gate.", price: 14_000, commission: 1_500, rating: "18+", bookings: 3 },
      { name: "Saturday day ticket", description: "Entry on Saturday only. Under 18s must come with an adult.", price: 6_500, commission: 800, rating: "16+", bookings: 3 },
    ],
  },
];

/** 22 fictional promoters: invented first name + last initial. Two are 16-17 (they browse 16+ campaigns only). */
export const ILLUSTRATIVE_PROMOTERS: { name: string; band: "16-17" | "18+" }[] = [
  "Ingrid S.", "Mateo R.", "Sofie L.", "Jonas B.", "Lucía M.", "Emil H.", "Nora K.", "Pau F.", "Thea N.", "Marc V.",
  "Ida J.", "Andreas P.", "Clara G.", "Henrik O.", "Elena T.", "Sander D.", "Maja E.", "Nil C.",
].map((name): { name: string; band: "16-17" | "18+" } => ({ name, band: "18+" }))
  .concat([{ name: "Vilde A.", band: "18+" }, { name: "Oriol S.", band: "18+" }, { name: "Live R.", band: "16-17" }, { name: "Aleix P.", band: "16-17" }]);

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const emailFor = (kind: "owner" | "promoter", name: string) => `demo-${kind}-${slug(name)}@example.com`;

async function listAllUsers(db: Db): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) if (u.email) out.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 200) break;
  }
  return out;
}

/** Find or create an account. New accounts get a random password that is never stored or shown. */
async function ensureUser(db: Db, users: Map<string, string>, email: string, role: "business" | "promoter", displayName: string) {
  let id = users.get(email);
  if (!id) {
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: randomBytes(24).toString("base64url"),
      email_confirm: true,
      user_metadata: { role, display_name: displayName },
    });
    if (error) throw error;
    id = data.user.id;
    users.set(email, id);
  }
  const { error } = await db.from("profiles").update({ role, display_name: displayName, is_demo: true }).eq("id", id);
  if (error) throw error;
  return id;
}

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data as NonNullable<T>;
}

/** Create the illustrative data with four weeks of history. Call after the purge (fresh state). */
export async function seedIllustrativeData(db: Db): Promise<string[]> {
  const rand = rng(20261108);
  const users = await listAllUsers(db);
  const now = Date.now();

  // Promoters (accounts persist between resets; profiles are re-marked as demo).
  const promoters: { id: string; name: string; band: "16-17" | "18+" }[] = [];
  for (const p of ILLUSTRATIVE_PROMOTERS) {
    const id = await ensureUser(db, users, emailFor("promoter", p.name), "promoter", p.name);
    await must(db.rpc("set_age_band", { p_actor_id: id, p_age_band: p.band }), "age band");
    promoters.push({ id, ...p });
  }
  const adults = promoters.filter((p) => p.band === "18+");

  let campaigns = 0, bookings = 0, visits = 0;
  await Promise.all(ILLUSTRATIVE_BUSINESSES.map(async (b, bi) => {
    const r = rng(1000 + bi);
    const ownerId = await ensureUser(db, users, emailFor("owner", b.key), "business", `${b.owner} (${b.name})`);
    const biz = await must(db.from("businesses").insert({
      owner_id: ownerId, name: b.name, description: b.description, city: b.city, country: b.country,
      currency: b.currency, category: b.category, is_demo: true, checkout_url: `https://example.com/${slug(b.name)}/book`,
    }).select("id").single(), "business");

    // Bookable times: a block 40+ days ahead used only to create history bookings (then moved into the
    // past), plus normal free times for the next week.
    let hour = 0;
    const usedHours = new Set<number>(); // one active booking per business per hour
    const freshSlot = async () => {
      const at = new Date(now + 40 * DAY + (hour++) * 3_600_000);
      at.setUTCMinutes(0, 0, 0);
      await must(db.from("time_slots").insert({ business_id: biz.id, starts_at: at.toISOString() }), "slot");
      return at.toISOString();
    };
    const week: { business_id: string; starts_at: string }[] = [];
    for (let d = 1; d <= 7; d++) for (const h of [9, 11, 13, 15, 17]) {
      const t = new Date(now + d * DAY); t.setUTCHours(h, 0, 0, 0);
      week.push({ business_id: biz.id, starts_at: t.toISOString() });
    }
    await must(db.from("time_slots").insert(week), "week slots");

    for (const c of b.campaigns) {
      const camp = await must(db.from("campaigns").insert({
        business_id: biz.id, service_name: c.name, description: c.description, price_minor: c.price, age_rating: c.rating,
      }).select("id").single(), "campaign");
      const ag = await must(db.from("agreements").insert({
        campaign_id: camp.id, commission_minor: c.commission, payout_days: 14, refund_window_days: 7,
        allowed_channels: ["instagram", "tiktok", "whatsapp", "word_of_mouth", "qr_print"],
        brand_rules: "Only use the business's own photos and facts. No invented discounts.", business_accepted_at: new Date().toISOString(),
      }).select("id").single(), "agreement");
      await must(db.from("campaigns").update({ current_agreement_id: ag.id, status: "published" }).eq("id", camp.id), "publish");
      await db.from("campaigns").update({ published_at: new Date(now - 28 * DAY).toISOString() }).eq("id", camp.id);
      campaigns++;

      // 3-5 promoters join (18+ only for 18+ campaigns; the 16-17 promoters have no guardian account yet, so they don't join).
      const pool = adults.slice().sort(() => r() - 0.5).slice(0, 3 + Math.floor(r() * 3));
      const links: { code: string; promoterId: string }[] = [];
      for (const p of pool) {
        const m = await must(db.from("campaign_memberships").insert({ campaign_id: camp.id, promoter_id: p.id, agreement_id: ag.id }).select("id").single(), "join");
        const joinedAt = new Date(now - (20 + r() * 8) * DAY).toISOString();
        await db.from("campaign_memberships").update({ created_at: joinedAt, promoter_accepted_at: joinedAt }).eq("id", m.id);
        await db.from("notifications").update({ created_at: joinedAt }).eq("payload->>membership_id", m.id);
        const link = await must(db.from("referral_links").select("code").eq("membership_id", m.id).single(), "link");
        links.push({ code: link.code, promoterId: p.id });
        // Link visits over the last four weeks (no personal data).
        const n = 8 + Math.floor(r() * 30);
        const ev = Array.from({ length: n }, () => ({ referral_link_id: undefined as unknown as string, created_at: new Date(now - r() * 27 * DAY).toISOString() }));
        const { data: lr } = await db.from("referral_links").select("id").eq("membership_id", m.id).single();
        await must(db.from("referral_events").insert(ev.map((e) => ({ ...e, referral_link_id: lr!.id, type: "visit" }))), "visits");
        visits += n;
      }

      // Bookings through the real functions, then moved back in time.
      for (let i = 0; i < c.bookings; i++) {
        const link = links[Math.floor(r() * links.length)];
        const id = await must(db.rpc("create_booking", {
          p_referral_code: link.code, p_slot_start: await freshSlot(),
          p_customer_name: `Guest ${String.fromCharCode(65 + Math.floor(r() * 26))}.`,
          p_customer_phone: b.country === "NO" ? `+47 400 00 ${String(100 + Math.floor(r() * 899))}` : `+34 600 000 ${String(100 + Math.floor(r() * 899))}`,
          p_fee_bps: PLATFORM_FEE_BPS,
        }), "booking") as unknown as string;
        bookings++;
        const ageDays = 1 + r() * 26; // when the visit happened
        const roll = r();
        const kind = ageDays < 3 && roll < 0.5 ? "upcoming" : roll < 0.08 ? "refunded" : ageDays < 9 ? "verified" : "released";
        const visitAt = kind === "upcoming" ? new Date(now + (1 + r() * 5) * DAY) : new Date(now - ageDays * DAY);
        visitAt.setUTCMinutes(0, 0, 0);
        while (usedHours.has(visitAt.getTime())) visitAt.setTime(visitAt.getTime() + 3_600_000);
        usedHours.add(visitAt.getTime());
        const bookedAt = new Date(visitAt.getTime() - (1 + r() * 6) * DAY);
        const verifiedAt = new Date(visitAt.getTime() + 3 * 3_600_000);

        if (kind !== "upcoming") await must(db.rpc("verify_booking", { p_booking_id: id, p_actor_id: ownerId }), "verify");
        if (kind === "refunded") await must(db.rpc("refund_booking", { p_booking_id: id, p_actor_id: ownerId }), "refund");

        // Move the booking into the past (or near future for upcoming ones).
        const patch: Database["public"]["Tables"]["bookings"]["Update"] = { slot_start: visitAt.toISOString(), created_at: bookedAt.toISOString() };
        if (kind !== "upcoming") {
          patch.verified_at = verifiedAt.toISOString();
          patch.refund_window_ends_at = new Date(verifiedAt.getTime() + 7 * DAY).toISOString();
          patch.payout_at = new Date(verifiedAt.getTime() + 14 * DAY).toISOString();
        }
        if (kind === "refunded") patch.refunded_at = new Date(verifiedAt.getTime() + 2 * DAY).toISOString();
        await must(db.from("bookings").update(patch).eq("id", id), "move booking");
        if (kind === "released") {
          await must(db.rpc("release_commission", { p_booking_id: id, p_actor_id: ownerId }), "release");
          await db.from("bookings").update({ released_at: new Date(verifiedAt.getTime() + 7 * DAY).toISOString() }).eq("id", id);
        }
        // Notifications about this booking get the matching (past) time.
        await db.from("notifications").update({ created_at: (kind === "upcoming" ? bookedAt : verifiedAt).toISOString() }).eq("payload->>booking_id", id);
      }
    }
    // Free the helper slots used to create the history.
    await db.from("time_slots").delete().eq("business_id", biz.id).gte("starts_at", new Date(now + 39 * DAY).toISOString());
  }));

  return [`illustrative ${ILLUSTRATIVE_BUSINESSES.length} businesses, ${campaigns} campaigns, ${promoters.length} promoters, ${bookings} bookings, ${visits} link visits (four weeks)`];
}
