import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarClock, CalendarDays, Megaphone, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getBusinessOverview, getMyBusiness, moneyTotals } from "@/lib/business-data";
import { formatMinor, type Currency } from "@/lib/money";
import { formatDate, formatSlot } from "@/lib/format";
import { Stat, StatusBadge, bookingStage } from "@/components/stat";
import { Button } from "@/components/ui/button";
import { Highlight } from "@/components/live";
import { ActivityFeed } from "@/components/activity-feed";
import { CampaignCover } from "@/components/campaign-cover";
import { EmptyState } from "@/components/empty-state";
import { CreateBusinessForm } from "./create-business-form";
import { getMarket } from "@/lib/market-server";
import { MARKETS, marketForCurrency } from "@/lib/market";
import { SwitchMarketButton } from "@/components/market-picker";
import { demoBusinessImage } from "@/lib/demo-images";
import { coverUrls } from "@/lib/photos";

export default async function BusinessDashboard() {
  const { user, supabase } = await requireRole("business");
  const market = await getMarket();
  const business = await getMyBusiness(supabase, user.id, market.currency);
  if (!business) {
    // The owner's business may be in the other market: offer to switch instead of a new form.
    const elsewhere = await getMyBusiness(supabase, user.id);
    if (elsewhere) {
      const there = MARKETS[marketForCurrency(elsewhere.currency)];
      return (
        <div className="mx-auto max-w-lg space-y-4 py-10 text-center" data-testid="other-market-business">
          <h1 className="text-3xl">{elsewhere.name} is in {there.label}</h1>
          <p className="text-muted-foreground">
            You&apos;re looking at {market.label} ({market.currency}). Your business sells in {there.place} ({there.currency}).
          </p>
          <SwitchMarketButton to={there.key}>Switch to {there.label}</SwitchMarketButton>
        </div>
      );
    }
    return <CreateBusinessForm defaultCountry={market.country} />;
  }

  const o = await getBusinessOverview(supabase, business.id);
  const businessImage = await demoBusinessImage(business);
  const cur = business.currency as Currency;
  const money = (m: number) => formatMinor(m, cur);
  const t = moneyTotals(o.bookings);
  const covers = await coverUrls(o.campaigns);
  const membersByCampaign = new Map<string, number>();
  for (const m of o.memberships) membersByCampaign.set(m.campaign_id, (membersByCampaign.get(m.campaign_id) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 text-[clamp(2rem,5vw,2.75rem)]">
            {businessImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={businessImage} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-2xl" data-testid="business-image" />
            )}
            <span className="line-clamp-2">{business.name}</span>
          </h1>
          <p className="mt-1.5 text-muted-foreground">{business.city}{business.country === "ES" ? ", Spain" : ", Norway"}</p>
        </div>
        <Button asChild>
          <Link href="/business/campaigns/new">
            <Plus className="h-4 w-4" /> New campaign
          </Link>
        </Button>
      </div>

      {/* The statement: four figures in one panel, small counts underneath. Labels come before amounts. */}
      <section className="ledger">
        <div className="grid grid-cols-2 lg:grid-cols-4 [&>*]:border-border [&>*:nth-child(even)]:border-l max-lg:[&>*:nth-child(n+3)]:border-t lg:[&>*+*]:border-l">
          <Stat className="p-4 sm:p-5" label="Verified sales" value={money(t.salesMinor)} hint={`${t.salesCount} booking${t.salesCount === 1 ? "" : "s"}`} />
          <Stat className="p-4 sm:p-5" label="Commission pending" value={money(t.commissionPendingMinor)} hint="Until the refund window ends" />
          <Stat className="p-4 sm:p-5" label="Commission available" value={money(t.commissionAvailableMinor)} hint={t.nextPayoutAt ? `Next payout ${formatDate(t.nextPayoutAt)}` : "Owed to promoters"} />
          <Stat className="p-4 sm:p-5" label="Platform fees (2.75%)" value={money(t.feesMinor)} hint={`Total cost ${money(t.totalCostMinor)}`} />
        </div>
        <div className="grid grid-cols-2 bg-secondary/60 sm:grid-cols-4">
          {[
            { label: "Awaiting service", value: t.awaitingServiceCount },
            { label: "Promoters", value: o.memberships.length },
            { label: "Link visits", value: o.clicks },
            { label: "Live campaigns", value: o.campaigns.filter((c) => c.status === "published").length },
          ].map((k) => (
            <div key={k.label} className="flex items-baseline gap-2 px-5 py-3">
              <span className="money text-lg">{k.value}</span>
              <span className="min-w-0 truncate text-sm text-muted-foreground">{k.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <section className="min-w-0 space-y-3">
            <h2 className="text-lg">Campaigns</h2>
            {o.campaigns.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="Create your first campaign"
                body="Pick a service, set a commission, accept the agreement and publish. Promoters see it instantly."
                action={{ href: "/business/campaigns/new", label: "New campaign" }}
              />
            ) : (
              <div className="ledger">
              {o.campaigns.map((c) => (
                <Highlight key={c.id} ids={[c.id]}>
                  <Link href={`/business/campaigns/${c.id}`} className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/60 sm:px-5">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[10px]">
                      <CampaignCover category={business.category} imageUrl={covers[c.id]} size="sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-lg font-bold">{c.service_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {money(c.price_minor)}, promoter earns <span className="font-semibold text-foreground">{money(c.commission_minor)}</span>,{" "}
                        {membersByCampaign.get(c.id) ?? 0} promoter{(membersByCampaign.get(c.id) ?? 0) === 1 ? "" : "s"}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                    <ArrowRight className="hidden h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 sm:block" />
                  </Link>
                </Highlight>
              ))}
              </div>
            )}
          </section>

          <section className="min-w-0 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg">Recent bookings</h2>
              <Link href="/business/bookings" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                All bookings <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {o.bookings.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No bookings yet"
                body="When a customer books through a promoter's link, it appears here instantly."
              />
            ) : (
              <div className="ledger">
              {o.bookings.slice(0, 6).map((b) => {
                const stage = bookingStage(b);
                return (
                  <Highlight key={b.id} ids={[b.id]}>
                    <Link href={`/business/bookings/${b.id}`} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-secondary/60 sm:px-5">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${stage.key === "pending" ? "bg-pending-bg text-pending" : stage.key === "available" ? "bg-marker text-ink" : "bg-[hsl(232_90%_95%)] text-primary"}`}>
                        {stage.key === "pending" ? <CalendarClock className="h-5 w-5" /> : <BadgeCheck className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{b.campaigns?.service_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatSlot(b.slot_start)}, commission {money(b.commission_minor)}
                        </div>
                        <div className="mt-1.5 sm:hidden"><StatusBadge status={stage.key} label={stage.label} /></div>
                      </div>
                      <span className="hidden sm:inline-flex"><StatusBadge status={stage.key} label={stage.label} /></span>
                    </Link>
                  </Highlight>
                );
              })}
              </div>
            )}
          </section>
        </div>

        <ActivityFeed items={o.notifications} emptyText="Joins, bookings and verifications show up here in real time." />
      </div>
    </div>
  );
}
