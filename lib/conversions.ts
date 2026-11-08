import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

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
