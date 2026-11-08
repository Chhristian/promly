import { formatMinor, type Currency } from "@/lib/money";

export const AGREEMENT_TEMPLATE_VERSION = "promly-standard-v1";
/** With payments (docs/PAYMENTS.md): 14-day finality, monthly invoicing, payouts only from paid invoices, age rules. */
export const AGREEMENT_TEMPLATE_VERSION_V2 = "promly-standard-v2";
export const AGREEMENT_LEGAL_LABEL = "Agreement template, to be reviewed by a lawyer before real use";

export const CHANNELS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "snapchat", label: "Snapchat" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "facebook", label: "Facebook" },
  { value: "word_of_mouth", label: "Word of mouth" },
  { value: "qr_print", label: "Printed QR code" },
  { value: "other", label: "Other lawful channels" },
] as const;

export type ChannelValue = (typeof CHANNELS)[number]["value"];
export const CHANNEL_VALUES = CHANNELS.map((c) => c.value) as [ChannelValue, ...ChannelValue[]];

export function channelLabel(v: string): string {
  return CHANNELS.find((c) => c.value === v)?.label ?? v;
}

export type AgreementTerms = {
  businessName: string;
  serviceName: string;
  currency: Currency;
  priceMinor: number;
  commissionMinor: number;
  payoutDays: number;
  refundWindowDays: number;
  allowedChannels: string[];
  brandRules: string;
  /** The template the agreement was accepted under (default v1). */
  templateVersion?: string | null;
};

/** The standard agreement, filled in with the editable fields. Returns paragraphs. */
export function renderAgreement(t: AgreementTerms): { heading: string; body: string }[] {
  const money = (m: number) => formatMinor(m, t.currency);
  const channels = t.allowedChannels.length ? t.allowedChannels.map(channelLabel).join(", ") : "none listed";
  if (t.templateVersion === AGREEMENT_TEMPLATE_VERSION_V2) return renderV2(t, money, channels);
  return [
    {
      heading: "1. Parties and service",
      body: `This agreement is between ${t.businessName} (the Business) and the promoter who accepts it (the Promoter), through Promly. It covers the service "${t.serviceName}" at ${money(t.priceMinor)}.`,
    },
    {
      heading: "2. Commission",
      body: `For each booking made through the Promoter's personal Promly link and verified by the Business as completed, the Promoter earns ${money(t.commissionMinor)}. Promly's platform fee is paid by the Business on top and is never deducted from the Promoter's commission.`,
    },
    {
      heading: "3. Verification, refunds and payout",
      body: `A commission stays pending until the Business verifies the service and the ${t.refundWindowDays}-day refund window has passed. If the booking is refunded before payout, the commission is reversed. Commission is paid out ${t.payoutDays} days after the service is verified.`,
    },
    {
      heading: "4. Marketing channels",
      body: `The Promoter may promote the campaign through: ${channels}. All marketing must be lawful and honest.`,
    },
    {
      heading: "5. Brand rules",
      body: t.brandRules.trim() || "No additional brand rules.",
    },
    {
      heading: "6. Honest marketing",
      body: "The Promoter must not invent discounts, guarantees, reviews or claims that are not part of this campaign, and must not spam or mislead customers.",
    },
  ];
}

/** Template v2: the payment and age terms of docs/PAYMENTS.md. */
function renderV2(t: AgreementTerms, money: (m: number) => string, channels: string): { heading: string; body: string }[] {
  return [
    {
      heading: "1. Parties and service",
      body: `This agreement is between ${t.businessName} (the Business) and the promoter who accepts it (the Promoter), through Promly. It covers "${t.serviceName}" at ${money(t.priceMinor)}, sold through the Business's own online checkout. The customer books and pays the Business directly; Promly never handles the customer's payment.`,
    },
    {
      heading: "2. Commission",
      body: `For each booking made on the Business's online checkout through the Promoter's personal Promly link, and verified by the Business as completed, the Promoter earns ${money(t.commissionMinor)}. Promly's platform fee of 2.75% of the booking price is paid by the Business on top and is never deducted from the Promoter's commission.`,
    },
    {
      heading: "3. Verification and when commission is final",
      body: "The Business verifies each completed service within 7 days of the appointment; otherwise the booking counts as cancelled. A commission becomes final 14 days after verification. If the booking is refunded within those 14 days, the commission and Promly's fee are reversed. After 14 days the Promoter keeps the commission and Promly keeps its fee; later refunds or claims are between the Business and its customer. The only exception is a fraud review by Promly, recorded with a written reason.",
    },
    {
      heading: "4. Invoicing (the Business)",
      body: "Once a month Promly sends the Business one invoice for the commissions that became final plus Promly's fee, a line per booking, payable within 14 days by bank transfer where available, otherwise by card. If an invoice is unpaid after its due date, the Business's campaigns are paused until it is paid. The Business is responsible for any payment disputes (chargebacks) it raises on Promly's invoices.",
    },
    {
      heading: "5. Payouts (the Promoter)",
      body: "Promly pays the Promoter only commission that the Business has paid, and never advances commission. Payouts are made monthly to the Promoter's Stripe account; Stripe pays balances of at least 300 NOK or 30 EUR on to the bank and smaller amounts roll over. Promoters aged 16 or 17 may promote only 16+ campaigns and are paid through a parent or guardian who holds the payout account and has given consent.",
    },
    {
      heading: "6. Marketing channels",
      body: `The Promoter may promote the campaign through: ${channels}. All marketing must be lawful and honest.`,
    },
    {
      heading: "7. Brand rules",
      body: t.brandRules.trim() || "No additional brand rules.",
    },
    {
      heading: "8. Honest marketing",
      body: "The Promoter must not invent discounts, guarantees, reviews or claims that are not part of this campaign, and must not spam or mislead customers.",
    },
  ];
}
