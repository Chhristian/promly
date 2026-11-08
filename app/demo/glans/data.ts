import "server-only";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isReferralCode, pointsToGlansDemo } from "@/lib/conversions";

export type GlansCheckout = {
  ref: string;
  promoterId: string;
  serviceName: string;
  description: string | null;
  priceMinor: number;
  currency: string;
};

/**
 * The service and price come from the campaign the ref belongs to, so the amount
 * always matches. Only published campaigns whose external booking link is this
 * Glans demo page qualify.
 */
export async function getGlansCheckout(ref: string | undefined): Promise<GlansCheckout | null> {
  if (!isReferralCode(ref)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("referral_links")
    .select("promoter_id, campaigns(service_name, description, price_minor, currency, status, external_booking_url)")
    .eq("code", ref)
    .maybeSingle();
  const c = data?.campaigns;
  if (!data || !c || c.status !== "published") return null;
  if (!pointsToGlansDemo(c.external_booking_url, (await headers()).get("host"))) return null;
  return {
    ref,
    promoterId: data.promoter_id,
    serviceName: c.service_name,
    description: c.description,
    priceMinor: c.price_minor,
    currency: c.currency,
  };
}
