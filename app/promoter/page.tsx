import Link from "next/link";
import { BadgeCheck, CalendarClock, Compass, Sparkles, Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getPromoterOverview, siteUrl } from "@/lib/promoter-data";
import { formatMinor, type Currency } from "@/lib/money";
import { formatDate, formatSlot } from "@/lib/format";
import { Stat, StatusBadge, bookingStage } from "@/components/stat";
import { ShareTools } from "@/components/share-tools";
import { Button } from "@/components/ui/button";
import { Highlight, MoneyPulse } from "@/components/live";
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
  const multi = currencies.length > 1;
  // Next real payout date among commissions that are already available.
  const nextPayout = o.bookings
    .filter((b) => b.status === "verified" && b.released_at && b.payout_at && new Date(b.payout_at).getTime() > Date.now())
    .map((b) => b.payout_at!)
    .sort()[0];
  const covers = await coverUrls(o.memberships.flatMap((m) => (m.campaigns ? [m.campaigns] : [])));

  const totalAvailable = currencies.reduce((sum, cur) => sum + (o.earnings[cur]?.available ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(2rem,5vw,2.75rem)]">Hi {profile.display_name || "there"}</h1>
          <p className="mt-1.5 text-muted-foreground">Share your links. Every verified booking earns you the full commission.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/promoter/studio"><Sparkles className="h-4 w-4" /> Create content</Link>
          </Button>
          <Button asChild>
            <Link href="/promoter/explore"><Compass className="h-4 w-4" /> Find campaigns</Link>
          </Button>
        </div>
      </div>

      {/* The payout slip: the one dark element on the page. Labels come before amounts. */}
      <section className="slip grid gap-6 p-6 sm:px-8 sm:py-7 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-10">
        <div className="space-y-6">
          {currencies.map((cur) => (
            <MoneyPulse key={`a-${cur}`}>
              <Stat
                onSlip
                size="hero"
                label={`Available${multi ? ` (${cur})` : ""}`}
                value={formatMinor(o.earnings[cur]?.available ?? 0, cur)}
                mark={(o.earnings[cur]?.available ?? 0) > 0}
                hint={nextPayout ? `Ready for payout, paid out ${formatDate(nextPayout)}` : totalAvailable > 0 ? "Ready for payout" : "Verified commissions land here after the refund window"}
              />
            </MoneyPulse>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/15 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          {currencies.map((cur) => (
            <Stat
              key={`p-${cur}`}
              onSlip
              className="col-span-2"
              label={`Pending${multi ? ` (${cur})` : ""}`}
              value={formatMinor(o.earnings[cur]?.pending ?? 0, cur)}
              hint="Verified, refund window still open"
            />
          ))}
          <Stat onSlip size="sm" label="Link clicks" value={String(o.totalClicks)} />
          <Stat onSlip size="sm" label="Bookings" value={String(o.bookings.length)} hint={`${verified.length} verified`} />
        </div>
      </section>

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
                body="Local businesses are looking for customers. Pick one you'd happily recommend."
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
