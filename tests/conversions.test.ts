import { describe, expect, it } from "vitest";
import {
  SIGNATURE_TOLERANCE_SECONDS,
  conversionSchema,
  normalizePhone,
  signConversion,
  verifyConversionSignature,
} from "@/lib/conversions";

const secret = "test-secret-not-real";
const now = 1_800_000_000;
const body = JSON.stringify({
  ref: "abc123def4",
  external_id: "order-1001",
  amount_minor: 50_000,
  customer_name: "Kari Nordmann",
  customer_phone: "+47 400 00 000",
  status: "paid",
});

describe("conversion signature", () => {
  const sig = signConversion(secret, now, body);

  it("accepts a correct signature within the time window", () => {
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(verifyConversionSignature(secret, body, String(now), sig, now)).toEqual({ ok: true });
    expect(verifyConversionSignature(secret, body, String(now), sig, now + SIGNATURE_TOLERANCE_SECONDS)).toEqual({ ok: true });
  });

  it("rejects a missing secret, timestamp or signature", () => {
    expect(verifyConversionSignature("", body, String(now), sig, now)).toEqual({ ok: false, reason: "missing" });
    expect(verifyConversionSignature(secret, body, null, sig, now)).toEqual({ ok: false, reason: "missing" });
    expect(verifyConversionSignature(secret, body, String(now), null, now)).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects the wrong secret, a changed body, a changed timestamp or a malformed signature", () => {
    expect(verifyConversionSignature("other-secret", body, String(now), sig, now).ok).toBe(false);
    expect(verifyConversionSignature(secret, body.replace("50000", "99999"), String(now), sig, now).ok).toBe(false);
    expect(verifyConversionSignature(secret, body, String(now + 1), sig, now).ok).toBe(false);
    expect(verifyConversionSignature(secret, body, String(now), sig.slice(0, -2), now).ok).toBe(false);
    expect(verifyConversionSignature(secret, body, String(now), "garbage", now).ok).toBe(false);
    expect(verifyConversionSignature(secret, body, "12abc", sig, now)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects old or future timestamps (replays)", () => {
    const old = now - SIGNATURE_TOLERANCE_SECONDS - 1;
    expect(verifyConversionSignature(secret, body, String(old), signConversion(secret, old, body), now)).toEqual({ ok: false, reason: "stale" });
    const future = now + SIGNATURE_TOLERANCE_SECONDS + 1;
    expect(verifyConversionSignature(secret, body, String(future), signConversion(secret, future, body), now)).toEqual({ ok: false, reason: "stale" });
  });
});

describe("conversion body", () => {
  const valid = JSON.parse(body);

  it("accepts a paid conversion", () => {
    expect(conversionSchema.parse(valid)).toEqual(valid);
  });

  it("rejects other statuses, bad amounts, bad refs and missing fields", () => {
    expect(conversionSchema.safeParse({ ...valid, status: "refunded" }).success).toBe(false);
    expect(conversionSchema.safeParse({ ...valid, amount_minor: 500.5 }).success).toBe(false);
    expect(conversionSchema.safeParse({ ...valid, amount_minor: 0 }).success).toBe(false);
    expect(conversionSchema.safeParse({ ...valid, amount_minor: "50000" }).success).toBe(false);
    expect(conversionSchema.safeParse({ ...valid, ref: "ALEX-7K3Q" }).success).toBe(false);
    expect(conversionSchema.safeParse({ ...valid, external_id: "has space" }).success).toBe(false);
    expect(conversionSchema.safeParse({ ...valid, customer_phone: "call me" }).success).toBe(false);
    expect(conversionSchema.safeParse({ ...valid, customer_name: undefined }).success).toBe(false);
  });

  it("normalises phone numbers like the database does", () => {
    expect(normalizePhone("+47 400 00 000")).toBe("4740000000");
    expect(normalizePhone("(+47) 400-00-000")).toBe("4740000000");
  });
});
