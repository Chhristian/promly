/**
 * Payment rules as plain functions (docs/PAYMENTS.md). The database enforces the
 * same rules in its server-only functions; these mirror them for the UI and tests.
 * All money is in minor units (øre / cents).
 */
import { formatMinor, platformFeeMinor, type Currency } from "./money";

export const FINAL_AFTER_DAYS = 14;
export const VERIFY_WITHIN_DAYS = 7;
export const INVOICE_DUE_DAYS = 14;
const DAY = 86_400_000;

/** Commission becomes final 14 days after the business verifies the service. */
export function finalDueAt(verifiedAt: Date): Date {
  return new Date(verifiedAt.getTime() + FINAL_AFTER_DAYS * DAY);
}

export function isFinal(verifiedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= finalDueAt(verifiedAt).getTime();
}

/** A refund reverses commission and fee only inside the 14 days. */
export function canRefund(verifiedAt: Date | null, now: Date = new Date()): boolean {
  return verifiedAt === null || !isFinal(verifiedAt, now);
}

/** A booking not verified within 7 days of its time counts as cancelled. */
export function isStaleUnverified(bookingTime: Date, now: Date = new Date()): boolean {
  return now.getTime() > bookingTime.getTime() + VERIFY_WITHIN_DAYS * DAY;
}

export type InvoiceLine = { kind: "booking" | "fee_credit" | "commission_credit"; commissionMinor: number; feeMinor: number };

/** One booking's invoice line: the commission plus Promly's fee on the booking price. */
export function bookingInvoiceLine(priceMinor: number, commissionMinor: number, feeBps?: number): InvoiceLine {
  return { kind: "booking", commissionMinor, feeMinor: platformFeeMinor(priceMinor, feeBps) };
}

/** Invoice totals. Credits are negative; an invoice is only sent if the total is above zero. */
export function invoiceTotals(lines: InvoiceLine[]) {
  const commissionMinor = lines.reduce((s, l) => s + l.commissionMinor, 0);
  const feeMinor = lines.reduce((s, l) => s + l.feeMinor, 0);
  const totalMinor = commissionMinor + feeMinor;
  return { commissionMinor, feeMinor, totalMinor, send: totalMinor > 0 };
}

/** Minimum bank payout from the promoter's Stripe balance. Smaller balances roll over. */
export const PAYOUT_MINIMUM_MINOR: Record<Currency, number> = { NOK: 30_000, EUR: 3_000 };

export function bankPayoutDue(balanceMinor: number, currency: Currency): { payMinor: number; rollOverMinor: number } {
  return balanceMinor >= PAYOUT_MINIMUM_MINOR[currency]
    ? { payMinor: balanceMinor, rollOverMinor: 0 }
    : { payMinor: 0, rollOverMinor: Math.max(balanceMinor, 0) };
}

// ---------------------------------------------------------------------------
// Age rules (16+ / 18+)
// ---------------------------------------------------------------------------
export type AgeBand = "16-17" | "18+";
export type AgeRating = "16+" | "18+";
export const AGE_RESTRICTED_CATEGORIES = ["nightlife", "club", "alcohol"] as const;

export function isAgeRestrictedCategory(category: string): boolean {
  return (AGE_RESTRICTED_CATEGORIES as readonly string[]).includes(category);
}

/** The rating a campaign must have: age-restricted categories and campaigns are always 18+. */
export function effectiveAgeRating(category: string, ageRestricted: boolean, chosen: AgeRating): AgeRating {
  return ageRestricted || isAgeRestrictedCategory(category) ? "18+" : chosen;
}

/** Can a promoter with this band see/join a campaign with this rating? No band = existing account. */
export function canSeeCampaign(band: AgeBand | null, rating: AgeRating): boolean {
  return rating === "16+" || band !== "16-17";
}

/** Who must hold the payout account. */
export function payoutHolderFor(band: AgeBand): "self" | "guardian" {
  return band === "18+" ? "self" : "guardian";
}

// ---------------------------------------------------------------------------
// Statuses (rule 3)
// ---------------------------------------------------------------------------
export type SettlementStatus =
  | "not_verified" | "pending" | "final" | "invoiced" | "awaiting_business_payment"
  | "paid_by_business" | "paid_out" | "refunded" | "cancelled" | "clawed_back";

export const SETTLEMENT_LABEL: Record<SettlementStatus, string> = {
  not_verified: "Awaiting verification",
  pending: "Pending",
  final: "Final",
  invoiced: "Invoiced",
  awaiting_business_payment: "Awaiting business payment",
  paid_by_business: "Paid by business",
  paid_out: "Paid out",
  refunded: "Refunded",
  cancelled: "Cancelled",
  clawed_back: "Reversed (fraud review)",
};

/** Order of the happy path, for progress displays. */
export const SETTLEMENT_STEPS: SettlementStatus[] = ["pending", "final", "invoiced", "paid_by_business", "paid_out"];

export function stripeAmountLabel(minor: number, currency: Currency): string {
  return formatMinor(minor, currency);
}
