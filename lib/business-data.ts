import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Db = SupabaseClient<Database>;
export type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

/** Totals from the frozen terms on each booking. */
export function moneyTotals(bookings: BookingRow[]) {
  const live = bookings.filter((b) => b.status === "verified");
  const pending = live.filter((b) => !b.released_at);
  const available = live.filter((b) => b.released_at);
  const sum = (rows: BookingRow[], k: "price_minor" | "commission_minor" | "fee_minor" | "business_total_minor") =>
    rows.reduce((t, b) => t + b[k], 0);
  const upcoming = live
    .filter((b) => b.payout_at && new Date(b.payout_at).getTime() > Date.now())
    .map((b) => b.payout_at!)
    .sort();
  return {
    salesCount: live.length,
    salesMinor: sum(live, "price_minor"),
    commissionPendingMinor: sum(pending, "commission_minor"),
    commissionAvailableMinor: sum(available, "commission_minor"),
    feesMinor: sum(live, "fee_minor"),
    totalCostMinor: sum(live, "business_total_minor"),
    awaitingServiceCount: bookings.filter((b) => b.status === "pending").length,
    nextPayoutAt: upcoming[0] ?? null,
  };
}

export async function getMyBusiness(db: Db, ownerId: string) {
  const { data } = await db.from("businesses").select("*").eq("owner_id", ownerId).order("created_at").limit(1).maybeSingle();
  return data;
}

export async function getBusinessOverview(db: Db, businessId: string) {
  const [campaigns, bookings, memberships, notifications] = await Promise.all([
    db.from("campaigns").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
    db.from("bookings").select("*, campaigns(service_name)").eq("business_id", businessId).order("created_at", { ascending: false }),
    db.from("campaign_memberships").select("id, campaign_id, created_at, profiles(display_name), campaigns!inner(business_id)").eq("campaigns.business_id", businessId),
    db.from("notifications").select("*").order("created_at", { ascending: false }).limit(8),
  ]);

  const campaignIds = (campaigns.data ?? []).map((c) => c.id);
  const { data: links } = campaignIds.length
    ? await db.from("referral_links").select("id, campaign_id").in("campaign_id", campaignIds)
    : { data: [] as { id: string; campaign_id: string }[] };
  const linkIds = (links ?? []).map((l) => l.id);
  const { count: clicks } = linkIds.length
    ? await db.from("referral_events").select("id", { count: "exact", head: true }).in("referral_link_id", linkIds)
    : { count: 0 };

  return {
    campaigns: campaigns.data ?? [],
    bookings: bookings.data ?? [],
    memberships: memberships.data ?? [],
    notifications: notifications.data ?? [],
    clicks: clicks ?? 0,
  };
}
