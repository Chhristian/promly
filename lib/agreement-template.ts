import { formatMinor, type Currency } from "@/lib/money";

export const AGREEMENT_TEMPLATE_VERSION = "promly-standard-v1";
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
  /** The business's own agreement PDF included in this version, if any. */
  attachedPdf?: { version: number; sha256: string } | null;
};

/** The standard agreement, filled in with the editable fields. Returns paragraphs. */
export function renderAgreement(t: AgreementTerms): { heading: string; body: string }[] {
  const money = (m: number) => formatMinor(m, t.currency);
  const channels = t.allowedChannels.length ? t.allowedChannels.map(channelLabel).join(", ") : "none listed";
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
      body: t.brandRules.trim() || (t.attachedPdf ? "See the attached PDF." : "No additional brand rules."),
    },
    {
      heading: "6. Honest marketing",
      body: "The Promoter must not invent discounts, guarantees, reviews or claims that are not part of this campaign, and must not spam or mislead customers.",
    },
    ...(t.attachedPdf
      ? [{
          heading: "7. Attached agreement (PDF)",
          body: `The Business's own agreement, PDF version ${t.attachedPdf.version} (SHA-256 ${t.attachedPdf.sha256}), is part of this agreement. If it conflicts with sections 2 to 3, those sections apply, because Promly calculates commission from them.`,
        }]
      : []),
  ];
}
