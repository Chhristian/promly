import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLATFORM_FEE_BPS } from "@/lib/money";
import {
  MAX_BODY_BYTES,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  conversionSchema,
  normalizePhone,
  verifyConversionSignature,
  type Conversion,
} from "@/lib/conversions";

export const dynamic = "force-dynamic";

type Db = ReturnType<typeof createAdminClient>;
type Booking = { id: string; status: string; refund_window_ends_at: string | null; payout_at: string | null };

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

/**
 * A business's own booking/checkout system reports a paid, referred customer.
 *
 * Every request must carry a valid HMAC signature made with CONVERSIONS_SECRET;
 * anything else is rejected before the body is even parsed. With no secret set,
 * the endpoint is off.
 *
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
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CONVERSIONS_SECRET ?? "";
  if (!secret) return fail(503, "conversions_disabled");

  const raw = await request.text();
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return fail(413, "body_too_large");

  const sig = verifyConversionSignature(secret, raw, request.headers.get(TIMESTAMP_HEADER), request.headers.get(SIGNATURE_HEADER));
  if (!sig.ok) return fail(401, `signature_${sig.reason}`);

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail(400, "invalid_json");
  }
  const parsed = conversionSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(issue?.path[0] === "status" ? 422 : 400, "invalid_body", { field: issue?.path.join("."), message: issue?.message });
  }
  const c = parsed.data;

  const db = createAdminClient();
  try {
    return await handlePaid(db, c);
  } catch (e) {
    console.error("conversion failed", c.ref, c.external_id, e instanceof Error ? e.message : e);
    return fail(500, "internal_error");
  }
}

async function handlePaid(db: Db, c: Conversion) {
  // ref → referral link → campaign → business owner.
  const { data: link, error: linkErr } = await db
    .from("referral_links")
    .select("id, campaigns(id, status, external_booking_url, price_minor, currency, businesses(owner_id))")
    .eq("code", c.ref)
    .maybeSingle();
  if (linkErr) throw new Error(linkErr.message);
  const campaign = link?.campaigns;
  const ownerId = campaign?.businesses?.owner_id;
  if (!link || !campaign || !ownerId) return fail(404, "referral_link_not_found");
  if (campaign.status !== "published") return fail(422, "campaign_not_published");
  if (!campaign.external_booking_url) return fail(422, "no_external_url");
  // Commission and fee are frozen from the campaign price, so a different amount isn't this campaign's service.
  if (c.amount_minor !== campaign.price_minor) {
    return fail(422, "amount_mismatch", { expected_amount_minor: campaign.price_minor, currency: campaign.currency });
  }

  // 1. Seen this external_id before? Then finish (or just report) that booking.
  const known = await bookingIdForExternalId(db, ownerId, c.external_id);
  if (known) return verifyAndRespond(db, known, ownerId, true);

  // 2. The customer may already have a pending booking from the referral page (/book/<code>).
  let bookingId = await activeBookingForCustomer(db, campaign.id, link.id, c.customer_phone);
  if (bookingId === "other_promoter") return fail(409, "attributed_to_other_promoter");

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
      if (bookingId === "other_promoter") return fail(409, "attributed_to_other_promoter");
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
    return fail(409, "customer_already_converted", { booking_id: bookingId });
  }

  return verifyAndRespond(db, bookingId, ownerId, false);
}

async function bookingIdForExternalId(db: Db, ownerId: string, externalId: string): Promise<string | null> {
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
async function activeBookingForCustomer(db: Db, campaignId: string, linkId: string, phone: string): Promise<string | "other_promoter" | null> {
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
async function tagExternalId(db: Db, ownerId: string, bookingId: string, externalId: string): Promise<"ok" | "other_external_id"> {
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

async function verifyAndRespond(db: Db, bookingId: string, ownerId: string, duplicate: boolean) {
  const { data, error } = await db.rpc("verify_booking", { p_booking_id: bookingId, p_actor_id: ownerId });
  if (error?.message?.includes("booking_not_pending")) return fail(409, "booking_not_pending", { booking_id: bookingId });
  if (error || !data) throw new Error(error?.message ?? "verify_booking returned nothing");
  const b = data as unknown as Booking;
  return NextResponse.json({
    booking_id: b.id,
    status: b.status, // "verified": the commission is pending until the refund window ends
    refund_window_ends_at: b.refund_window_ends_at,
    payout_at: b.payout_at,
    duplicate,
  });
}
