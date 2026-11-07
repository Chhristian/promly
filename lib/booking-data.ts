import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { signedPhotoUrls } from "@/lib/photos";

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

  // "*" (not a column list) so the page keeps working whether or not the
  // external_booking_url migration has been applied yet.
  const { data: c } = await admin
    .from("campaigns")
    .select("*, businesses(name, city, country, description, category)")
    .eq("id", link.campaign_id)
    .single();
  if (!c || !c.businesses) return null;

  const nowIso = new Date().toISOString();
  const [{ data: slots }, { data: taken }] = await Promise.all([
    admin.from("time_slots").select("starts_at, duration_minutes").eq("business_id", c.business_id).gt("starts_at", nowIso).order("starts_at").limit(200),
    admin.from("bookings").select("slot_start").eq("business_id", c.business_id).in("status", ["pending", "verified"]).gt("slot_start", nowIso),
  ]);
  const takenSet = new Set((taken ?? []).flatMap((t) => (t.slot_start ? [new Date(t.slot_start).getTime()] : [])));
  const free = (slots ?? []).filter((s) => !takenSet.has(new Date(s.starts_at).getTime()));

  const coverPath = c.status === "published" ? c.photo_paths[0] : undefined;
  const coverUrl = coverPath ? (await signedPhotoUrls([coverPath]))[coverPath] : undefined;

  return {
    coverUrl,
    campaign: {
      serviceName: c.service_name,
      description: c.description,
      priceMinor: c.price_minor,
      currency: c.currency,
      open: c.status === "published",
      // Only whether it's external: the URL itself is looked up again on the server when sending the customer on.
      external: !!c.external_booking_url,
    },
    business: c.businesses,
    freeSlots: free.map((s) => ({ startsAt: s.starts_at, minutes: s.duration_minutes })),
  };
}

/** Where to send the customer after an external referral: the business URL with ?ref=<code>. */
export async function getExternalRedirect(code: string): Promise<{ url: string; promoterId: string } | null> {
  if (!REFERRAL_CODE.test(code)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("referral_links")
    .select("promoter_id, campaigns(external_booking_url)")
    .eq("code", code)
    .maybeSingle();
  const raw = data?.campaigns?.external_booking_url;
  if (!data || !raw || !URL.canParse(raw)) return null;
  const url = new URL(raw);
  if (url.protocol !== "https:") return null;
  url.searchParams.set("ref", code);
  return { url: url.toString(), promoterId: data.promoter_id };
}
