import { describe, expect, it } from "vitest";
import { PROMO_TYPES, VARIANT_COUNT, allowedPromoTypes, buildPromoText } from "@/lib/promo-templates";

const facts = {
  serviceName: "Premium Haircut",
  businessName: "Demo Barber Club",
  city: "Oslo",
  price: "500,00 kr",
  description: "A premium haircut with wash, styling and a hot-towel finish (about 45 minutes). Second sentence.",
  link: "https://promly-eight.vercel.app/r/abcdef1234",
};

describe("promo text templates", () => {
  it("every type and version includes the link, the price and an ad/commission note", () => {
    for (const t of PROMO_TYPES) {
      for (let v = 0; v < VARIANT_COUNT; v++) {
        const text = buildPromoText(t.type, facts, v);
        expect(text).toContain(facts.link);
        expect(text).toContain(facts.price);
        expect(text.toLowerCase()).toMatch(/\bad\b|reklame|commission/);
      }
    }
  });

  it("never invents discounts, reviews or guarantees", () => {
    const banned = /discount|% off|rabatt|tilbud|free\b|gratis|guarantee|garanti|review|rating|stars?\b|best in|cheapest|#1/i;
    for (const t of PROMO_TYPES) {
      for (let v = 0; v < VARIANT_COUNT; v++) expect(buildPromoText(t.type, facts, v)).not.toMatch(banned);
    }
  });

  it("only uses the business's own first sentence", () => {
    const text = buildPromoText("instagram", facts, 0);
    expect(text).toContain("hot-towel finish (about 45 minutes).");
    expect(text).not.toContain("Second sentence");
  });

  it("only offers types the agreement allows", () => {
    expect(allowedPromoTypes(["whatsapp"]).map((t) => t.type)).toEqual(["whatsapp", "hook", "dm"]);
    expect(allowedPromoTypes(["word_of_mouth"]).map((t) => t.type)).toEqual(["hook"]);
    expect(allowedPromoTypes([])).toEqual([]);
  });
});
