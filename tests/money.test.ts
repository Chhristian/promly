import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  PLATFORM_FEE_BPS,
  balances,
  bookingTerms,
  businessTotalMinor,
  percentToFixedCommission,
  platformFeeMinor,
  releaseEntries,
  reversalEntries,
  verifyEntries,
} from "@/lib/money";

describe("money maths", () => {
  it("uses a 2.75% platform fee", () => {
    expect(PLATFORM_FEE_BPS).toBe(275);
  });

  it("Demo Barber Club: 500 NOK haircut, 100 NOK commission", () => {
    const t = bookingTerms(50_000, 10_000);
    expect(t.commissionMinor).toBe(10_000); // promoter gets 100.00 NOK
    expect(t.feeMinor).toBe(1_375); // Promly gets 13.75 NOK
    expect(t.businessTotalMinor).toBe(11_375); // business pays 113.75 NOK
  });

  it("Spain jet ski: €150 with 20% commission", () => {
    const commission = percentToFixedCommission(15_000, 20);
    expect(commission).toBe(3_000); // €30.00
    const fee = platformFeeMinor(15_000);
    expect(fee).toBe(413); // 412.5 cents rounds half-up to €4.13
    expect(businessTotalMinor(commission, fee)).toBe(3_413); // €34.13
  });

  it("rounds half-up and rejects non-integer amounts", () => {
    expect(platformFeeMinor(100)).toBe(3); // 2.75 → 3
    expect(platformFeeMinor(18)).toBe(0); // 0.495 → 0
    expect(() => platformFeeMinor(100.5)).toThrow();
    expect(() => bookingTerms(1_000, 2_000)).toThrow(); // commission > price
  });

  it("verify → release → refund before payout brings every balance back to zero", () => {
    const terms = bookingTerms(50_000, 10_000);
    const ledger = [...verifyEntries(terms)];

    let b = balances(ledger);
    expect(b.promoter).toEqual({ pending: 10_000, available: 0 });
    expect(b.platform).toEqual({ pending: 1_375, available: 0 });
    expect(b.business).toEqual({ pending: -11_375, available: 0 });

    ledger.push(...releaseEntries(ledger)); // refund window over
    b = balances(ledger);
    expect(b.promoter).toEqual({ pending: 0, available: 10_000 });

    const rowsBeforeRefund = ledger.length;
    ledger.push(...reversalEntries(ledger)); // refund before payout
    b = balances(ledger);
    for (const account of ["promoter", "business", "platform"] as const) {
      expect(b[account]).toEqual({ pending: 0, available: 0 });
    }
    // append-only: old rows are still there, reversals were added
    expect(ledger.length).toBe(rowsBeforeRefund + 3);
    // and the whole ledger always sums to zero
    expect(ledger.reduce((sum, e) => sum + e.amountMinor, 0)).toBe(0);
  });

  it("a refund before verification creates no ledger rows", () => {
    expect(reversalEntries([])).toEqual([]);
  });
});

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe.skipIf(!url || !key)("TypeScript matches the database", () => {
  it("platform_fee_minor gives the same fee for 500 NOK and €150", async () => {
    const db = createClient(url!, key!, { auth: { persistSession: false } });
    for (const price of [50_000, 15_000]) {
      const { data, error } = await db.rpc("platform_fee_minor", {
        p_price_minor: price,
        p_fee_bps: PLATFORM_FEE_BPS,
      });
      expect(error).toBeNull();
      expect(Number(data)).toBe(platformFeeMinor(price));
    }
  });
});
