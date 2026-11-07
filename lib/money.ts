/**
 * Promly money maths (docs/PLAN.md section 2).
 *
 * - All amounts are integers in minor units (øre for NOK, cents for EUR).
 * - The promoter keeps 100% of the commission.
 * - The business pays Promly a platform fee ON TOP: PLATFORM_FEE_BPS of the booking price.
 * - Rounding is half-up to a whole minor unit.
 *
 * These functions must match the database exactly:
 *   public.platform_fee_minor(price, bps) = (price * bps + 5000) / 10000   (integer division)
 * and the ledger rows written by verify_booking / _release_booking / refund_booking.
 */

export const PLATFORM_FEE_BPS = 275; // 2.75%

export type Currency = "NOK" | "EUR";

const MAX_MINOR = 10_000_000_000; // 100 million NOK/EUR, keeps all maths in safe-integer range

function assertMinor(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_MINOR) {
    throw new RangeError(`${name} must be a whole number of minor units between 0 and ${MAX_MINOR}`);
  }
}

function assertBps(bps: number, name = "bps"): void {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) {
    throw new RangeError(`${name} must be a whole number of basis points between 0 and 10000`);
  }
}

/** amount × bps / 10000, rounded half-up. Same formula as the database. */
function applyBpsHalfUp(amountMinor: number, bps: number): number {
  return Math.floor((amountMinor * bps + 5_000) / 10_000);
}

/** Promly's fee on a booking price. 50 000 øre → 1 375 øre (13.75 NOK). */
export function platformFeeMinor(priceMinor: number, feeBps: number = PLATFORM_FEE_BPS): number {
  assertMinor(priceMinor, "priceMinor");
  assertBps(feeBps, "feeBps");
  return applyBpsHalfUp(priceMinor, feeBps);
}

/** What the business pays per verified booking: commission + platform fee. */
export function businessTotalMinor(commissionMinor: number, feeMinor: number): number {
  assertMinor(commissionMinor, "commissionMinor");
  assertMinor(feeMinor, "feeMinor");
  return commissionMinor + feeMinor;
}

/**
 * Turn a percentage commission into a fixed amount (done once, when the
 * campaign's agreement is saved). Percent may have up to 2 decimals.
 * 20% of 15 000 cents → 3 000 cents.
 */
export function percentToFixedCommission(priceMinor: number, percent: number): number {
  assertMinor(priceMinor, "priceMinor");
  const bps = Math.round(percent * 100);
  if (Math.abs(percent * 100 - bps) > 1e-9) {
    throw new RangeError("percent may have at most 2 decimals");
  }
  assertBps(bps, "percent");
  return applyBpsHalfUp(priceMinor, bps);
}

export type BookingTerms = {
  priceMinor: number;
  commissionMinor: number; // goes to the promoter
  feeBps: number;
  feeMinor: number; // goes to Promly
  businessTotalMinor: number; // what the business pays
};

/** The terms frozen onto a booking. */
export function bookingTerms(
  priceMinor: number,
  commissionMinor: number,
  feeBps: number = PLATFORM_FEE_BPS,
): BookingTerms {
  assertMinor(priceMinor, "priceMinor");
  assertMinor(commissionMinor, "commissionMinor");
  if (commissionMinor > priceMinor) throw new RangeError("commission cannot exceed the price");
  const feeMinor = platformFeeMinor(priceMinor, feeBps);
  return {
    priceMinor,
    commissionMinor,
    feeBps,
    feeMinor,
    businessTotalMinor: businessTotalMinor(commissionMinor, feeMinor),
  };
}

// ---------------------------------------------------------------------------
// Ledger model: mirrors the rows the database functions append.
// Used by tests and for explaining balances in the UI.
// ---------------------------------------------------------------------------

export type LedgerAccount = "promoter" | "business" | "platform";
export type LedgerBucket = "pending" | "available";
export type LedgerEntryType = "commission" | "platform_fee" | "business_charge" | "release" | "reversal";

export type LedgerEntry = {
  account: LedgerAccount;
  bucket: LedgerBucket;
  entryType: LedgerEntryType;
  amountMinor: number; // signed, never 0
};

export type Balances = Record<LedgerAccount, Record<LedgerBucket, number>>;

/** Rows written when the business verifies the service (verify_booking). */
export function verifyEntries(terms: BookingTerms): LedgerEntry[] {
  const rows: LedgerEntry[] = [
    { account: "promoter", bucket: "pending", entryType: "commission", amountMinor: terms.commissionMinor },
    { account: "business", bucket: "pending", entryType: "business_charge", amountMinor: -terms.businessTotalMinor },
  ];
  if (terms.feeMinor > 0) {
    rows.push({ account: "platform", bucket: "pending", entryType: "platform_fee", amountMinor: terms.feeMinor });
  }
  return rows;
}

/** Sum ledger rows into balances per account and bucket. */
export function balances(entries: LedgerEntry[]): Balances {
  const b: Balances = {
    promoter: { pending: 0, available: 0 },
    business: { pending: 0, available: 0 },
    platform: { pending: 0, available: 0 },
  };
  for (const e of entries) b[e.account][e.bucket] += e.amountMinor;
  return b;
}

const ACCOUNTS: LedgerAccount[] = ["promoter", "business", "platform"];
const BUCKETS: LedgerBucket[] = ["pending", "available"];

/** Rows that move every pending balance to available (_release_booking). */
export function releaseEntries(entries: LedgerEntry[]): LedgerEntry[] {
  const b = balances(entries);
  return ACCOUNTS.filter((a) => b[a].pending !== 0).flatMap((a) => [
    { account: a, bucket: "pending" as const, entryType: "release" as const, amountMinor: -b[a].pending },
    { account: a, bucket: "available" as const, entryType: "release" as const, amountMinor: b[a].pending },
  ]);
}

/** Rows that cancel every remaining balance (refund_booking). Old rows are never changed. */
export function reversalEntries(entries: LedgerEntry[]): LedgerEntry[] {
  const b = balances(entries);
  return ACCOUNTS.flatMap((a) =>
    BUCKETS.filter((k) => b[a][k] !== 0).map((k) => ({
      account: a,
      bucket: k,
      entryType: "reversal" as const,
      amountMinor: -b[a][k],
    })),
  );
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

/**
 * Parse an amount typed by a person ("100", "99.50", "99,5", "1 250") into minor units.
 * Returns null if it isn't a valid non-negative amount with at most 2 decimals.
 */
export function parseMajorToMinor(input: string): number | null {
  const s = input.trim().replace(/[\s ]/g, "").replace(",", ".");
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const minor = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor <= MAX_MINOR ? minor : null;
}

/** 11 375 → "113.75" (for pre-filling inputs). */
export function minorToMajorInput(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2).replace(/\.00$/, "");
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/** 11 375 NOK-øre → "kr 113,75"; 3 413 EUR-cents → "34,13 €". */
export function formatMinor(amountMinor: number, currency: Currency): string {
  const locale = currency === "NOK" ? "nb-NO" : "es-ES";
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 }).format(
    amountMinor / 100,
  );
}
