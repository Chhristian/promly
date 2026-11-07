import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarClock, CalendarDays, Clock, Coins, Eye, Megaphone, Plus, Receipt, Users, Wallet } from "lucide-react";
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
import { coverUrls } from "@/lib/photos";

export default async function BusinessDashboard() {
  const { user, supabase } = await requireRole("business");
  const business = await getMyBusiness(supabase, user.id);
  if (!business) return <CreateBusinessForm />;

  const o = await getBusinessOverview(supabase, business.id);
  const cur = business.currency as Currency;
  const money = (m: number) => formatMinor(m, cur);
  const t = moneyTotals(o.bookings);
  const covers = await coverUrls(o.campaigns);
  const membersByCampaign = new Map<string, number>();
  for (const m of o.memberships) membersByCampaign.set(m.campaign_id, (membersByCampaign.get(m.campaign_id) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="line-clamp-2 text-3xl font-bold tracking-tight sm:text-4xl">{business.name}</h1>
          <p className="mt-1 text-muted-foreground">{business.city}{business.country === "ES" ? ", Spain" : ", Norway"}</p>
        </div>
        <Button asChild className="bg-brand text-white shadow-lg shadow-violet-900/40">
          <Link href="/business/campaigns/new">
            <Plus className="h-4 w-4" /> New campaign
          </Link>
        </Button>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Verified sales" value={money(t.salesMinor)} hint={`${t.salesCount} booking${t.salesCount === 1 ? "" : "s"}`} accent icon={Receipt} />
        <Stat label="Commission pending" value={money(t.commissionPendingMinor)} hint="Until refund window ends" icon={Clock} />
        <Stat label="Commission available" value={money(t.commissionAvailableMinor)} hint={t.nextPayoutAt ? `Next payout ${formatDate(t.nextPayoutAt)}` : "Owed to promoters"} icon={Wallet} />
        <Stat label="Platform fees (2.75%)" value={money(t.feesMinor)} hint={`Total cost ${money(t.totalCostMinor)}`} icon={Coins} />
      </section>

      {/* Secondary numbers: one quiet strip, so bookings and activity stay above the fold on a projector */}
      <div className="card grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
        {[
          { icon: CalendarClock, label: "Awaiting service", value: t.awaitingServiceCount },
          { icon: Users, label: "Promoters", value: o.memberships.length },
          { icon: Eye, label: "Link visits", value: o.clicks },
          { icon: Megaphone, label: "Live campaigns", value: o.campaigns.filter((c) => c.status === "published").length },
        ].map((k) => (
          <div key={k.label} className="flex items-center gap-3 px-4 py-3">
            <k.icon className="h-5 w-5 shrink-0 text-violet-300" />
            <div className="text-2xl font-bold tabular-nums leading-none">{k.value}</div>
            <div className="min-w-0 truncate text-sm text-muted-foreground">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <section className="min-w-0 space-y-3">
            <h2 className="text-lg font-semibold">Campaigns</h2>
            {o.campaigns.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="Create your first campaign"
                body="Pick a service, set a commission, accept the agreement and publish. Promoters see it instantly."
                action={{ href: "/business/campaigns/new", label: "New campaign" }}
              />
            ) : (
              o.campaigns.map((c) => (
                <Highlight key={c.id} ids={[c.id]}>
                  <Link href={`/business/campaigns/${c.id}`} className="card group flex items-center gap-4 p-3 transition hover:border-violet-400/60">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                      <CampaignCover category={business.category} imageUrl={covers[c.id]} size="sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-lg font-semibold">{c.service_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {money(c.price_minor)} · promoter earns {money(c.commission_minor)} · {membersByCampaign.get(c.id) ?? 0} promoter
                        {(membersByCampaign.get(c.id) ?? 0) === 1 ? "" : "s"}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                    <ArrowRight className="hidden h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 sm:block" />
                  </Link>
                </Highlight>
              ))
            )}
          </section>

          <section className="min-w-0 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent bookings</h2>
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
              o.bookings.slice(0, 6).map((b) => {
                const stage = bookingStage(b);
                return (
                  <Highlight key={b.id} ids={[b.id]}>
                    <Link href={`/business/bookings/${b.id}`} className="card flex items-center gap-4 p-4 transition hover:border-violet-400/60">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
                        {stage.key === "pending" ? <CalendarClock className="h-5 w-5" /> : <BadgeCheck className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{b.campaigns?.service_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatSlot(b.slot_start)} · commission {money(b.commission_minor)}
                        </div>
                      </div>
                      <StatusBadge status={stage.key} label={stage.label} />
                    </Link>
                  </Highlight>
                );
              })
            )}
          </section>
        </div>

        <ActivityFeed items={o.notifications} emptyText="Joins, bookings and verifications show up here in real time." />
      </div>
    </div>
  );
}
