import { describe, expect, it } from "vitest";
import {
  GLANS_DEMO_PATH,
  demoModeOn,
  isReferralCode,
  pointsToGlansDemo,
  processConversion,
  type Conversion,
  type ConversionDb,
} from "@/lib/conversions";

describe("Glans demo helpers", () => {
  it("is on only when DEMO_MODE is exactly true", () => {
    expect(demoModeOn({ DEMO_MODE: "true" })).toBe(true);
    expect(demoModeOn({ DEMO_MODE: "1" })).toBe(false);
    expect(demoModeOn({})).toBe(false);
  });

  it("accepts only 10 lowercase letters or digits as ref", () => {
    expect(isReferralCode("abc123def4")).toBe(true);
    expect(isReferralCode("ABC123DEF4")).toBe(false);
    expect(isReferralCode("abc123def")).toBe(false);
    expect(isReferralCode(undefined)).toBe(false);
  });

  it("matches only this host's /demo/glans", () => {
    const host = "promly-eight.vercel.app";
    expect(pointsToGlansDemo(`https://${host}${GLANS_DEMO_PATH}`, host)).toBe(true);
    expect(pointsToGlansDemo(`https://${host}${GLANS_DEMO_PATH}/`, host)).toBe(true);
    expect(pointsToGlansDemo(`https://${host}${GLANS_DEMO_PATH}?utm=x`, host)).toBe(true);
    expect(pointsToGlansDemo(`https://other.example${GLANS_DEMO_PATH}`, host)).toBe(false);
    expect(pointsToGlansDemo(`https://${host}/demo/glans-other`, host)).toBe(false);
    expect(pointsToGlansDemo(`https://${host}/book/abc`, host)).toBe(false);
    expect(pointsToGlansDemo(null, host)).toBe(false);
    expect(pointsToGlansDemo("not a url", host)).toBe(false);
    expect(pointsToGlansDemo(`https://${host}${GLANS_DEMO_PATH}`, null)).toBe(false);
  });
});

/** Fake admin client that answers only the first lookup (ref → campaign). Anything further fails the test. */
function fakeDb(link: unknown): ConversionDb {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: link, error: null }),
  };
  return {
    from: (table: string) => {
      if (table !== "referral_links") throw new Error(`unexpected table ${table}`);
      return chain;
    },
    rpc: () => {
      throw new Error("unexpected rpc");
    },
  } as unknown as ConversionDb;
}

const paid: Conversion = {
  ref: "abc123def4",
  external_id: "glans-demo-1",
  amount_minor: 50_000,
  customer_name: "Kari Nordmann",
  customer_phone: "+47 400 00 000",
  status: "paid",
};

const campaign = {
  id: "c1",
  status: "published",
  external_booking_url: "https://promly-eight.vercel.app/demo/glans",
  price_minor: 50_000,
  currency: "NOK",
  businesses: { owner_id: "owner-1" },
};

describe("processConversion (checks before any write)", () => {
  it("returns 404 for an unknown ref", async () => {
    expect(await processConversion(fakeDb(null), paid)).toEqual({ status: 404, body: { error: "referral_link_not_found" } });
  });

  it("rejects a campaign that isn't published or has no external link", async () => {
    const draft = fakeDb({ id: "l1", campaigns: { ...campaign, status: "draft" } });
    expect((await processConversion(draft, paid)).body.error).toBe("campaign_not_published");
    const internal = fakeDb({ id: "l1", campaigns: { ...campaign, external_booking_url: null } });
    expect((await processConversion(internal, paid)).body.error).toBe("no_external_url");
  });

  it("rejects an amount that isn't the campaign price", async () => {
    const db = fakeDb({ id: "l1", campaigns: campaign });
    expect(await processConversion(db, { ...paid, amount_minor: 49_999 })).toEqual({
      status: 422,
      body: { error: "amount_mismatch", expected_amount_minor: 50_000, currency: "NOK" },
    });
  });
});
