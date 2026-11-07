import "server-only";

import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Db = SupabaseClient<Database>;

/** Base URL of the site the user is on (works on localhost, previews and production). */
export async function siteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export type Earnings = Record<string, { pending: number; available: number }>; // per currency

export async function getPromoterOverview(db: Db, promoterId: string) {
  const [memberships, bookings, ledger, notifications] = await Promise.all([
    db
      .from("campaign_memberships")
      .select("id, created_at, campaign_id, campaigns(id, service_name, price_minor, currency, status, businesses(name, city)), agreements(commission_minor, payout_days, refund_window_days), referral_links(id, code)")
      .eq("promoter_id", promoterId)
      .order("created_at", { ascending: false }),
    db.from("bookings").select("*, campaigns(service_name)").eq("promoter_id", promoterId).order("created_at", { ascending: false }),
    db.from("ledger_entries").select("booking_id, bucket, amount_minor, currency, entry_type, created_at").eq("account", "promoter").eq("party_id", promoterId),
    db.from("notifications").select("*").order("created_at", { ascending: false }).limit(8),
  ]);

  const linkIds = (memberships.data ?? []).flatMap((m) => (m.referral_links ? [m.referral_links.id] : []));
  const { data: events } = linkIds.length
    ? await db.from("referral_events").select("referral_link_id").in("referral_link_id", linkIds)
    : { data: [] as { referral_link_id: string }[] };
  const clicksByLink = new Map<string, number>();
  for (const e of events ?? []) clicksByLink.set(e.referral_link_id, (clicksByLink.get(e.referral_link_id) ?? 0) + 1);

  // Earnings straight from the append-only ledger.
  const earnings: Earnings = {};
  for (const r of ledger.data ?? []) {
    earnings[r.currency] ??= { pending: 0, available: 0 };
    earnings[r.currency][r.bucket as "pending" | "available"] += r.amount_minor;
  }

  return {
    memberships: memberships.data ?? [],
    bookings: bookings.data ?? [],
    notifications: notifications.data ?? [],
    earnings,
    clicksByLink,
    totalClicks: events?.length ?? 0,
  };
}
