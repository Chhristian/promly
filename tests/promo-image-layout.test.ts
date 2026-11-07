import { describe, expect, it } from "vitest";
import { FORMATS, fitText, mustMentions, promoLayout, wrapLines, type Measure } from "@/lib/promo-image-layout";

// Approximate a bold sans font: average glyph ≈ 0.6 × font size wide.
const measure: Measure = (t, size) => t.length * size * 0.6;

describe("promo image text layout", () => {
  it("wraps normal text onto lines that all fit", () => {
    const r = wrapLines("Premium Haircut at Demo Barber Club", 60, 800, 3, measure);
    expect(r.truncated).toBe(false);
    for (const l of r.lines) expect(measure(l, 60)).toBeLessThanOrEqual(800);
  });

  it("long names never overflow: limited lines, each within the width, ending in …", () => {
    const name = "The Extraordinarily Long Name Of A Very Premium Signature Haircut And Beard Treatment Experience Deluxe";
    for (const format of ["story", "post"] as const) {
      const L = promoLayout(format);
      const r = fitText(name, { maxWidth: L.textW, maxLines: L.service.maxLines, maxSize: L.service.maxSize, minSize: L.service.minSize, measure });
      expect(r.lines.length).toBeLessThanOrEqual(L.service.maxLines);
      for (const l of r.lines) expect(measure(l, r.size)).toBeLessThanOrEqual(L.textW);
      expect(r.size).toBeGreaterThanOrEqual(L.service.minSize);
      expect(r.truncated).toBe(true);
      expect(r.lines.at(-1)!.endsWith("…")).toBe(true);
    }
  });

  it("breaks a single word that is wider than the box", () => {
    const r = wrapLines("A".repeat(200), 40, 300, 2, measure);
    expect(r.lines.length).toBe(2);
    for (const l of r.lines) expect(measure(l, 40)).toBeLessThanOrEqual(300);
  });

  it("shrinks the font before truncating", () => {
    const L = promoLayout("post");
    const r = fitText("Premium Haircut", { maxWidth: L.textW, maxLines: 2, maxSize: L.service.maxSize, minSize: L.service.minSize, measure });
    expect(r.truncated).toBe(false);
    expect(r.size).toBe(L.service.maxSize);
  });

  it("layout boxes stay inside the canvas", () => {
    for (const format of ["story", "post"] as const) {
      const L = promoLayout(format);
      const { width, height } = FORMATS[format];
      for (const b of [L.photo, L.qr]) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(width);
        expect(b.y + b.h).toBeLessThanOrEqual(height);
      }
      expect(L.textX + L.textW).toBeLessThanOrEqual(width);
      expect(L.qr.y).toBeGreaterThan(L.photo.y + L.photo.h); // QR never sits on the photo
    }
  });
});

describe("brand rule must-mentions", () => {
  it("uses the business's own sentence for an 'Always mention' rule", () => {
    const r = mustMentions(
      "Always mention the safety briefing. Don't promise weather conditions.",
      "A guided 60-minute jet ski tour along the coast. Safety briefing and life jacket included.",
    );
    expect(r).toEqual([{ phrase: "safety briefing", sentence: "Safety briefing and life jacket included." }]);
  });

  it("returns no sentence (never invents one) when the description doesn't cover it", () => {
    expect(mustMentions("Must mention our opening hours.", "Great cuts.")).toEqual([{ phrase: "our opening hours", sentence: null }]);
  });

  it("finds nothing when there is no must-mention rule", () => {
    expect(mustMentions("Use only the official photos. No discounts.", "Anything.")).toEqual([]);
  });
});
