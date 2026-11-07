import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const REFERRAL_CODE = /^[a-z0-9]{10}$/;

/**
 * Public data for the customer booking page. Uses the admin client because
 * customers aren't logged in, so it returns ONLY customer-safe fields
 * (no commission, no promoter identity, no other customers).
 */
export async function getBookingPageData(code: string) {
  if (!REFERRAL_CODE.test(code)) return null;
  const admin = createAdminClient();

  const { data: link } = await admin.from("referral_links").select("campaign_id").eq("code", code).maybeSingle();
  if (!link) return null;

  const { data: c } = await admin
    .from("campaigns")
    .select("id, service_name, description, price_minor, currency, status, business_id, businesses(name, city, country, description)")
    .eq("id", link.campaign_id)
    .single();
  if (!c || !c.businesses) return null;

  const nowIso = new Date().toISOString();
  const [{ data: slots }, { data: taken }] = await Promise.all([
    admin.from("time_slots").select("starts_at, duration_minutes").eq("business_id", c.business_id).gt("starts_at", nowIso).order("starts_at").limit(200),
    admin.from("bookings").select("slot_start").eq("business_id", c.business_id).in("status", ["pending", "verified"]).gt("slot_start", nowIso),
  ]);
  const takenSet = new Set((taken ?? []).map((t) => new Date(t.slot_start).getTime()));
  const free = (slots ?? []).filter((s) => !takenSet.has(new Date(s.starts_at).getTime()));

  return {
    campaign: {
      serviceName: c.service_name,
      description: c.description,
      priceMinor: c.price_minor,
      currency: c.currency,
      open: c.status === "published",
    },
    business: c.businesses,
    freeSlots: free.map((s) => ({ startsAt: s.starts_at, minutes: s.duration_minutes })),
  };
}
