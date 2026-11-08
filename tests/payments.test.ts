import { describe, expect, it } from "vitest";
import {
  bankPayoutDue,
  bookingInvoiceLine,
  canRefund,
  canSeeCampaign,
  effectiveAgeRating,
  finalDueAt,
  invoiceTotals,
  isFinal,
  isStaleUnverified,
  payoutHolderFor,
} from "@/lib/payments";

const DAY = 86_400_000;

describe("monthly invoice", () => {
  it("500 kr booking with 100 kr commission invoices 113.75 kr (100 commission + 13.75 fee)", () => {
    const line = bookingInvoiceLine(50_000, 10_000);
    expect(line.feeMinor).toBe(1_375);
    expect(invoiceTotals([line])).toEqual({ commissionMinor: 10_000, feeMinor: 1_375, totalMinor: 11_375, send: true });
  });

  it("credits for a fraud clawback reduce the invoice; nothing is sent if they cover it all", () => {
    const booking = bookingInvoiceLine(50_000, 10_000);
    const credits = [
      { kind: "fee_credit" as const, commissionMinor: 0, feeMinor: -1_375 },
      { kind: "commission_credit" as const, commissionMinor: -10_000, feeMinor: 0 },
    ];
    expect(invoiceTotals([booking, booking, ...credits]).totalMinor).toBe(11_375);
    expect(invoiceTotals([booking, ...credits]).send).toBe(false);
  });
});

describe("14-day rule", () => {
  const verified = new Date("2026-11-01T12:00:00Z");

  it("is final exactly 14 days after verification, not a second earlier", () => {
    expect(finalDueAt(verified).toISOString()).toBe("2026-11-15T12:00:00.000Z");
    expect(isFinal(verified, new Date(verified.getTime() + 14 * DAY - 1_000))).toBe(false);
    expect(isFinal(verified, new Date(verified.getTime() + 14 * DAY))).toBe(true);
  });

  it("a refund is possible before the 14 days and not after", () => {
    expect(canRefund(verified, new Date(verified.getTime() + 13 * DAY))).toBe(true);
    expect(canRefund(verified, new Date(verified.getTime() + 14 * DAY))).toBe(false);
    expect(canRefund(null)).toBe(true); // not verified yet
  });

  it("a service not verified within 7 days counts as cancelled", () => {
    const slot = new Date("2026-11-01T10:00:00Z");
    expect(isStaleUnverified(slot, new Date(slot.getTime() + 7 * DAY))).toBe(false);
    expect(isStaleUnverified(slot, new Date(slot.getTime() + 7 * DAY + 1))).toBe(true);
  });
});

describe("bank payout minimum", () => {
  it("below 300 NOK / 30 EUR rolls over to next month", () => {
    expect(bankPayoutDue(29_999, "NOK")).toEqual({ payMinor: 0, rollOverMinor: 29_999 });
    expect(bankPayoutDue(2_999, "EUR")).toEqual({ payMinor: 0, rollOverMinor: 2_999 });
  });
  it("at or above the minimum is paid in full", () => {
    expect(bankPayoutDue(30_000, "NOK")).toEqual({ payMinor: 30_000, rollOverMinor: 0 });
    expect(bankPayoutDue(4_500, "EUR")).toEqual({ payMinor: 4_500, rollOverMinor: 0 });
  });
});

describe("agreement template v2", () => {
  const terms = {
    businessName: "Demo Barber Club", serviceName: "Premium Haircut", currency: "NOK" as const, priceMinor: 50_000,
    commissionMinor: 10_000, payoutDays: 14, refundWindowDays: 7, allowedChannels: ["instagram"], brandRules: "",
  };
  it("v1 (existing agreements) is unchanged; v2 adds the payment and age terms", async () => {
    const { renderAgreement, AGREEMENT_TEMPLATE_VERSION_V2 } = await import("@/lib/agreement-template");
    const v1 = renderAgreement(terms).map((p) => p.body).join(" ");
    expect(v1).toContain("7-day refund window");
    const v2 = renderAgreement({ ...terms, templateVersion: AGREEMENT_TEMPLATE_VERSION_V2 }).map((p) => `${p.heading} ${p.body}`).join(" ");
    for (const phrase of ["final 14 days after verification", "within 7 days", "never advances commission", "parent or guardian", "payment disputes", "2.75%", "pays the Business directly"]) {
      expect(v2).toContain(phrase);
    }
  });
});

describe("age rules", () => {
  it("16-17 promoters only see 16+ campaigns; existing accounts (no band) see everything", () => {
    expect(canSeeCampaign("16-17", "16+")).toBe(true);
    expect(canSeeCampaign("16-17", "18+")).toBe(false);
    expect(canSeeCampaign("18+", "18+")).toBe(true);
    expect(canSeeCampaign(null, "18+")).toBe(true);
  });
  it("under 18 can't hold their own payout account: a guardian does", () => {
    expect(payoutHolderFor("16-17")).toBe("guardian");
    expect(payoutHolderFor("18+")).toBe("self");
  });
  it("nightlife, clubs, alcohol and age-restricted campaigns are always 18+", () => {
    expect(effectiveAgeRating("nightlife", false, "16+")).toBe("18+");
    expect(effectiveAgeRating("alcohol", false, "16+")).toBe("18+");
    expect(effectiveAgeRating("barbershop", true, "16+")).toBe("18+");
    expect(effectiveAgeRating("barbershop", false, "16+")).toBe("16+");
  });
});
