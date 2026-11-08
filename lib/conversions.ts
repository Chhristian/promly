import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/database.types";
import { PLATFORM_FEE_BPS } from "@/lib/money";

/** Same format as REFERRAL_CODE in lib/booking-data.ts (that file is server-only, so it can't be imported in unit tests). */
const REFERRAL_CODE = /^[a-z0-9]{10}$/;

/**
 * POST /api/conversions: a business's own booking or checkout system tells Promly
 * that a referred customer has paid. See docs/CONVERSIONS.md.
 *
 * Signing: X-Promly-Timestamp = unix seconds, X-Promly-Signature = "sha256=" +
 * hex(HMAC-SHA256(CONVERSIONS_SECRET, `${timestamp}.${rawBody}`)).
 */
export const SIGNATURE_HEADER = "x-promly-signature";
export const TIMESTAMP_HEADER = "x-promly-timestamp";
export const SIGNATURE_TOLERANCE_SECONDS = 300;
export const MAX_BODY_BYTES = 16 * 1024;

export function signConversion(secret: string, timestamp: string | number, rawBody: string): string {
  return "sha256=" + createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export type SignatureCheck = { ok: true } | { ok: false; reason: "missing" | "stale" | "invalid" };

/** Constant-time check of the signature, plus a timestamp window so old requests can't be replayed. */
export function verifyConversionSignature(
  secret: string,
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): SignatureCheck {
  if (!secret || !timestamp || !signature) return { ok: false, reason: "missing" };
  if (!/^\d{1,12}$/.test(timestamp)) return { ok: false, reason: "invalid" };
  if (Math.abs(nowSeconds - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return { ok: false, reason: "stale" };
  const expected = Buffer.from(signConversion(secret, timestamp, rawBody));
  const given = Buffer.from(signature.trim());
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "invalid" };
  return { ok: true };
}

export const conversionSchema = z.object({
  ref: z.string().regex(REFERRAL_CODE, "ref must be a 10-character referral code"),
  external_id: z.string().trim().min(1).max(200).regex(/^[\x21-\x7E]+$/, "external_id must be printable ASCII without spaces"),
  amount_minor: z.number().int().positive().max(10_000_000_000),
  customer_name: z.string().trim().min(1).max(100),
  customer_phone: z.string().trim().min(5).max(40).regex(/^[+0-9 ()-]+$/, "customer_phone may contain digits, spaces, +, ( ) and -"),
  status: z.literal("paid", { message: 'status must be "paid"' }),
});

export type Conversion = z.infer<typeof conversionSchema>;

/** Digits only, the same as booking_contacts.customer_phone_norm. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

// ---------------------------------------------------------------------------
// Processing a paid conversion. Used by POST /api/conversions (after the HMAC
// check) and by the Glans demo checkout (/demo/glans, server only, no HTTP).
// ---------------------------------------------------------------------------

/** An admin (service role) client. Passed in, so this file stays free of server-only imports. */
export type ConversionDb = SupabaseClient<Database>;

/** HTTP-style result: the API route sends it as JSON, the demo checkout reads it directly. */
export type ConversionOutcome = { status: number; body: Record<string, unknown> };

type VerifiedBooking = { id: string; status: string; refund_window_ends_at: string | null; payout_at: string | null };

const outcome = (status: number, error: string, extra: Record<string, unknown> = {}): ConversionOutcome => ({
  status,
  body: { error, ...extra },
});

/**
 * "paid" → create_external_referral (terms frozen, as on the booking page), then
 * verify_booking as the business owner, so the commission becomes pending with the
 * agreement's normal refund window. Money maths and ledger rules are the existing
 * database functions; nothing here computes money.
 *
 * Idempotent on external_id: the id is kept in the payload of the booking's
 * "booking_created" notification for the business owner (no extra table needed).
 * A replay returns the same booking with duplicate: true. Concurrent requests for
 * the same customer are serialised by create_external_referral's duplicate guard,
 * and verify_booking never pays twice.
 *
 * Throws on unexpected database errors (the caller answers 500).
 */
export async function processConversion(db: ConversionDb, c: Conversion): Promise<ConversionOutcome> {
  // ref → referral link → campaign → business owner.
  const { data: link, error: linkErr } = await db
    .from("referral_links")
    .select("id, campaigns(id, status, external_booking_url, price_minor, currency, businesses(owner_id))")
    .eq("code", c.ref)
    .maybeSingle();
  if (linkErr) throw new Error(linkErr.message);
  const campaign = link?.campaigns;
  const ownerId = campaign?.businesses?.owner_id;
  if (!link || !campaign || !ownerId) return outcome(404, "referral_link_not_found");
  if (campaign.status !== "published") return outcome(422, "campaign_not_published");
  if (!campaign.external_booking_url) return outcome(422, "no_external_url");
  // Commission and fee are frozen from the campaign price, so a different amount isn't this campaign's service.
  if (c.amount_minor !== campaign.price_minor) {
    return outcome(422, "amount_mismatch", { expected_amount_minor: campaign.price_minor, currency: campaign.currency });
  }

  // 1. Seen this external_id before? Then finish (or just report) that booking.
  const known = await bookingIdForExternalId(db, ownerId, c.external_id);
  if (known) return verifyBooking(db, known, ownerId, true);

  // 2. The customer may already have a pending booking from the referral page (/book/<code>).
  let bookingId = await activeBookingForCustomer(db, campaign.id, link.id, c.customer_phone);
  if (bookingId === "other_promoter") return outcome(409, "attributed_to_other_promoter");

  // 3. Otherwise create it, exactly like the booking page does.
  if (!bookingId) {
    const { data: created, error } = await db.rpc("create_external_referral", {
      p_referral_code: c.ref,
      p_customer_name: c.customer_name,
      p_customer_phone: c.customer_phone,
      p_consent: true, // the business is reporting its own paying customer
      p_fee_bps: PLATFORM_FEE_BPS,
    });
    if (error?.message?.includes("duplicate_referral")) {
      // A concurrent request (or the booking page) got there first: use that booking.
      bookingId = await activeBookingForCustomer(db, campaign.id, link.id, c.customer_phone);
      if (bookingId === "other_promoter") return outcome(409, "attributed_to_other_promoter");
      if (!bookingId) throw new Error("duplicate_referral without an active booking");
    } else if (error || !created) {
      throw new Error(error?.message ?? "create_external_referral returned nothing");
    } else {
      bookingId = created;
    }
  }

  // 4. Remember the external_id before verifying, so a retry after a failure finds it.
  const tagged = await tagExternalId(db, ownerId, bookingId, c.external_id);
  if (tagged === "other_external_id") {
    // This customer already converted under another order id; one active booking per customer per campaign.
    return outcome(409, "customer_already_converted", { booking_id: bookingId });
  }

  return verifyBooking(db, bookingId, ownerId, false);
}

async function bookingIdForExternalId(db: ConversionDb, ownerId: string, externalId: string): Promise<string | null> {
  const { data, error } = await db
    .from("notifications")
    .select("payload")
    .eq("user_id", ownerId)
    .eq("type", "booking_created")
    .eq("payload->>external_id", externalId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const id = (data?.payload as { booking_id?: unknown } | undefined)?.booking_id;
  return typeof id === "string" ? id : null;
}

/** The customer's pending/verified booking on this campaign: its id, "other_promoter" if another link has it, or null. */
async function activeBookingForCustomer(
  db: ConversionDb,
  campaignId: string,
  linkId: string,
  phone: string,
): Promise<string | "other_promoter" | null> {
  const { data, error } = await db
    .from("bookings")
    .select("id, referral_link_id, booking_contacts!inner(customer_phone_norm)")
    .eq("campaign_id", campaignId)
    .in("status", ["pending", "verified"])
    .eq("booking_contacts.customer_phone_norm", normalizePhone(phone))
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return data.referral_link_id === linkId ? data.id : "other_promoter";
}

/** Adds external_id to the booking's "booking_created" notification for the owner. */
async function tagExternalId(db: ConversionDb, ownerId: string, bookingId: string, externalId: string): Promise<"ok" | "other_external_id"> {
  const { data, error } = await db
    .from("notifications")
    .select("id, payload")
    .eq("user_id", ownerId)
    .eq("type", "booking_created")
    .eq("payload->>booking_id", bookingId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("booking_created notification not found");
  const payload = (data.payload ?? {}) as Record<string, unknown>;
  if (payload.external_id === externalId) return "ok";
  if (typeof payload.external_id === "string") return "other_external_id";
  const { error: upErr } = await db
    .from("notifications")
    .update({ payload: { ...payload, external_id: externalId } })
    .eq("id", data.id);
  if (upErr) throw new Error(upErr.message);
  return "ok";
}

async function verifyBooking(db: ConversionDb, bookingId: string, ownerId: string, duplicate: boolean): Promise<ConversionOutcome> {
  const { data, error } = await db.rpc("verify_booking", { p_booking_id: bookingId, p_actor_id: ownerId });
  if (error?.message?.includes("booking_not_pending")) return outcome(409, "booking_not_pending", { booking_id: bookingId });
  if (error || !data) throw new Error(error?.message ?? "verify_booking returned nothing");
  const b = data as unknown as VerifiedBooking;
  return {
    status: 200,
    body: {
      booking_id: b.id,
      status: b.status, // "verified": the commission is pending until the refund window ends
      refund_window_ends_at: b.refund_window_ends_at,
      payout_at: b.payout_at,
      duplicate,
    },
  };
}

// ---------------------------------------------------------------------------
// Glans demo checkout (Demo Mode only).
// ---------------------------------------------------------------------------

export const GLANS_DEMO_PATH = "/demo/glans";
export const GLANS_REF_COOKIE = "promly_glans_ref";
export const GLANS_REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function demoModeOn(env: Record<string, string | undefined> = process.env): boolean {
  return env.DEMO_MODE === "true";
}

export function isReferralCode(code: unknown): code is string {
  return typeof code === "string" && REFERRAL_CODE.test(code);
}

/**
 * Whether a campaign's external_booking_url is Promly's own Glans demo page on
 * this host. Only those campaigns can be "paid" through the demo checkout, so the
 * demo can't verify bookings for real businesses.
 */
export function pointsToGlansDemo(externalBookingUrl: string | null | undefined, host: string | null | undefined): boolean {
  if (!externalBookingUrl || !host || !URL.canParse(externalBookingUrl)) return false;
  const url = new URL(externalBookingUrl);
  return url.host === host && url.pathname.replace(/\/+$/, "") === GLANS_DEMO_PATH;
}
