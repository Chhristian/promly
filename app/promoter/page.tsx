import Link from "next/link";
import { BadgeCheck, CalendarClock, Compass, Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getPromoterOverview, siteUrl } from "@/lib/promoter-data";
import { formatMinor, type Currency } from "@/lib/money";
import { formatDate, formatSlot } from "@/lib/format";
import { StatusBadge, bookingStage } from "@/components/stat";
import { ShareTools } from "@/components/share-tools";
import { Button } from "@/components/ui/button";
import { Highlight } from "@/components/live";
import { EarningsSummary } from "./earnings-summary";
import { ActivityFeed } from "@/components/activity-feed";
import { CampaignCover } from "@/components/campaign-cover";
import { EmptyState } from "@/components/empty-state";
import { coverUrls } from "@/lib/photos";

export default async function PromoterDashboard() {
  const { user, profile, supabase } = await requireRole("promoter");
  const o = await getPromoterOverview(supabase, user.id);
  const base = await siteUrl();

  const currencies = Object.keys(o.earnings).length ? (Object.keys(o.earnings) as Currency[]) : (["NOK"] as Currency[]);
  const verified = o.bookings.filter((b) => b.status === "verified");
  // Next real payout date among commissions that are already available.
  const nextPayout = o.bookings
    .filter((b) => b.status === "verified" && b.released_at && b.payout_at && new Date(b.payout_at).getTime() > Date.now())
    .map((b) => b.payout_at!)
    .sort()[0];
  const covers = await coverUrls(o.memberships.flatMap((m) => (m.campaigns ? [m.campaigns] : [])));

  // Display only: the refund window from the agreements (e.g. 3 or 14 days), so the text never states the wrong number.
  const waiting = o.bookings.filter((b) => b.status === "verified" && !b.released_at);
  const windowDays = new Set(
    waiting.length
      ? waiting.map((b) => b.refund_window_days)
      : o.memberships.flatMap((m) => (m.agreements ? [m.agreements.refund_window_days] : [])),
  );
  const onlyDays = windowDays.size === 1 ? [...windowDays][0] : null;
  const pendingHint = onlyDays !== null ? `Waiting for refund window (${onlyDays} ${onlyDays === 1 ? "day" : "days"})` : "Waiting for refund window";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="line-clamp-2 text-[clamp(2rem,5vw,2.75rem)]">Hi {profile.display_name || "there"}</h1>
          <p className="mt-1.5 text-muted-foreground">Share your links. Every verified booking earns you the full commission.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/promoter/explore"><Compass className="h-4 w-4" /> Find campaigns</Link>
          </Button>
        </div>
      </div>

      <EarningsSummary
        earnings={o.earnings}
        currencies={currencies}
        nextPayout={nextPayout}
        pendingHint={pendingHint}
        clicks={o.totalClicks}
        bookings={o.bookings.length}
        verified={verified.length}
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 space-y-8 lg:col-span-2">
          <section className="min-w-0 space-y-3">
            <h2 className="text-lg">Commissions</h2>
            {!o.bookings.length ? (
              <EmptyState
                icon={Wallet}
                title="Your first commission is one share away"
                body="Share your link or QR code. When a customer books and the business confirms the service, the money shows up here."
              />
            ) : (
              <div className="ledger">
                {o.bookings.map((b) => {
                  const stage = bookingStage(b);
                  const cur = b.currency as Currency;
                  return (
                    <Highlight key={b.id} ids={[b.id]}>
                      <div data-booking-id={b.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                        <span className={`hidden h-10 w-10 shrink-0 place-items-center rounded-full sm:grid ${stage.key === "available" ? "bg-marker text-ink" : stage.key === "pending" ? "bg-pending-bg text-pending" : "bg-[hsl(232_90%_95%)] text-primary"}`}>
                          {stage.key === "pending" ? <CalendarClock className="h-5 w-5" /> : stage.key === "available" ? <Wallet className="h-5 w-5" /> : <BadgeCheck className="h-5 w-5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">{b.campaigns?.service_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatSlot(b.slot_start)}
                            {b.status === "verified" && b.payout_at ? `, payout ${formatDate(b.payout_at)}` : ""}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <div className="money text-lg">{formatMinor(b.commission_minor, cur)}</div>
                          <StatusBadge status={stage.key} label={stage.label} />
                        </div>
                      </div>
                    </Highlight>
                  );
                })}
              </div>
            )}
          </section>

          <section className="min-w-0 space-y-3">
            <h2 className="text-lg">My campaigns</h2>
            {!o.memberships.length ? (
              <EmptyState
                icon={Compass}
                title="Join your first campaign"
                body="Businesses that sell online are looking for customers. Pick an experience you'd happily recommend."
                action={{ href: "/promoter/explore", label: "Explore campaigns" }}
              />
            ) : (
              <div className="ledger">
              {o.memberships.map((m) => {
                const c = m.campaigns;
                const code = m.referral_links?.code;
                const cur = (c?.currency ?? "NOK") as Currency;
                return (
                  <div key={m.id} className="min-w-0 space-y-4 p-4 sm:p-5">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px]">
                        <CampaignCover category={c?.businesses?.category} imageUrl={c ? covers[c.id] : undefined} size="sm" />
                      </div>
                      <Link href={`/promoter/campaigns/${m.campaign_id}`} className="min-w-0 flex-1 hover:underline">
                        <div className="truncate text-lg font-semibold">{c?.service_name}</div>
                        <div className="truncate text-sm text-muted-foreground">{c?.businesses?.name}</div>
                      </Link>
                      <div className="shrink-0 text-right">
                        <div className="money text-lg">{formatMinor(m.agreements?.commission_minor ?? 0, cur)}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.referral_links ? o.clicksByLink.get(m.referral_links.id) ?? 0 : 0} clicks
                        </div>
                      </div>
                    </div>
                    {code && (
                      <ShareTools
                        compact
                        url={`${base}/r/${code}`}
                        serviceName={c?.service_name ?? ""}
                        businessName={c?.businesses?.name ?? ""}
                        whatsappAllowed={!!m.agreements?.allowed_channels?.includes("whatsapp")}
                      />
                    )}
                  </div>
                );
              })}
              </div>
            )}
          </section>
        </div>

        <ActivityFeed items={o.notifications} emptyText="Verifications and payouts show up here in real time." />
      </div>
    </div>
  );
}
