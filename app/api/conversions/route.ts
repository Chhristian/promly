import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MAX_BODY_BYTES,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  conversionSchema,
  processConversion,
  verifyConversionSignature,
} from "@/lib/conversions";

export const dynamic = "force-dynamic";

const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

/**
 * A business's own booking/checkout system reports a paid, referred customer.
 *
 * Every request must carry a valid HMAC signature made with CONVERSIONS_SECRET;
 * anything else is rejected before the body is even parsed. With no secret set,
 * the endpoint is off. The processing itself (create_external_referral, then
 * verify_booking as the owner, idempotent on external_id) is processConversion
 * in lib/conversions.ts, shared with the Glans demo checkout.
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

  try {
    const result = await processConversion(createAdminClient(), c);
    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    console.error("conversion failed", c.ref, c.external_id, e instanceof Error ? e.message : e);
    return fail(500, "internal_error");
  }
}
