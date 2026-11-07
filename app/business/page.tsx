import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getBusinessOverview, getMyBusiness, moneyTotals } from "@/lib/business-data";
import { formatMinor, type Currency } from "@/lib/money";
import { formatDate, formatDateTime, formatSlot } from "@/lib/format";
import { Stat, StatusBadge, bookingStage } from "@/components/stat";
import { Button } from "@/components/ui/button";
import { CreateBusinessForm } from "./create-business-form";
import { Highlight } from "@/components/live";

export default async function BusinessDashboard() {
  const { user, supabase } = await requireRole("business");
  const business = await getMyBusiness(supabase, user.id);
  if (!business) return <CreateBusinessForm />;

  const o = await getBusinessOverview(supabase, business.id);
  const cur = business.currency as Currency;
  const money = (m: number) => formatMinor(m, cur);
  const t = moneyTotals(o.bookings);
  const membersByCampaign = new Map<string, number>();
  for (const m of o.memberships) membersByCampaign.set(m.campaign_id, (membersByCampaign.get(m.campaign_id) ?? 0) + 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Business dashboard</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{business.name}</h1>
        </div>
        <Button asChild className="bg-brand text-white">
          <Link href="/business/campaigns/new">New campaign</Link>
        </Button>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Verified sales" value={money(t.salesMinor)} hint={`${t.salesCount} booking${t.salesCount === 1 ? "" : "s"}`} accent />
        <Stat label="Commission pending" value={money(t.commissionPendingMinor)} hint="Until refund window ends" />
        <Stat label="Commission available" value={money(t.commissionAvailableMinor)} hint={t.nextPayoutAt ? `Next payout ${formatDate(t.nextPayoutAt)}` : "Owed to promoters"} />
        <Stat label="Platform fees (2.75%)" value={money(t.feesMinor)} hint={`Total cost ${money(t.totalCostMinor)}`} />
        <Stat label="Awaiting service" value={t.awaitingServiceCount} hint="Bookings to verify" />
        <Stat label="Promoters" value={o.memberships.length} hint="Joined your campaigns" />
        <Stat label="Link visits" value={o.clicks} hint="Referral link clicks" />
        <Stat label="Active campaigns" value={o.campaigns.filter((c) => c.status === "published").length} hint={`${o.campaigns.length} total`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          <h2 className="font-semibold">Campaigns</h2>
          {o.campaigns.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No campaigns yet. Create one to start getting customers.
            </p>
          )}
          {o.campaigns.map((c) => (
            <Highlight key={c.id} ids={[c.id]}>
            <Link
              href={`/business/campaigns/${c.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-4 hover:border-primary/60"
            >
              <div>
                <div className="font-medium">{c.service_name}</div>
                <div className="text-sm text-muted-foreground">
                  {money(c.price_minor)} · commission {money(c.commission_minor)} · {membersByCampaign.get(c.id) ?? 0} promoter(s)
                </div>
              </div>
              <StatusBadge status={c.status} />
            </Link>
            </Highlight>
          ))}

          <div className="flex items-center justify-between pt-4">
            <h2 className="font-semibold">Recent bookings</h2>
            <Link href="/business/bookings" className="text-sm text-muted-foreground hover:text-foreground">All bookings →</Link>
          </div>
          {o.bookings.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No bookings yet. They appear here as soon as a referred customer books.
            </p>
          )}
          {o.bookings.slice(0, 6).map((b) => {
            const stage = bookingStage(b);
            return (
              <Highlight key={b.id} ids={[b.id]}>
              <Link
                href={`/business/bookings/${b.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-4 hover:border-primary/60"
              >
                <div>
                  <div className="font-medium">{b.campaigns?.service_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatSlot(b.slot_start)} · commission {money(b.commission_minor)}
                  </div>
                </div>
                <StatusBadge status={stage.key} label={stage.label} />
              </Link>
              </Highlight>
            );
          })}
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Activity</h2>
          {o.notifications.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
          {o.notifications.map((n) => (
            <Highlight key={n.id} ids={[n.id]}>
            <div className="rounded-lg border border-border bg-card/50 p-3 text-sm">
              <div>{n.title}</div>
              <div className="text-xs text-muted-foreground">{formatDateTime(n.created_at)}</div>
            </div>
            </Highlight>
          ))}
        </section>
      </div>
    </div>
  );
}
