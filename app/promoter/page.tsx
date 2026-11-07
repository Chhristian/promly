import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getPromoterOverview, siteUrl } from "@/lib/promoter-data";
import { formatMinor, type Currency } from "@/lib/money";
import { formatDate, formatDateTime, formatSlot } from "@/lib/format";
import { Stat, StatusBadge, bookingStage } from "@/components/stat";
import { ShareTools } from "@/components/share-tools";
import { Button } from "@/components/ui/button";
import { Highlight } from "@/components/live";

export default async function PromoterDashboard() {
  const { user, profile, supabase } = await requireRole("promoter");
  const o = await getPromoterOverview(supabase, user.id);
  const base = await siteUrl();

  // Show money in the currency the promoter earns most in (NOK first for the demo).
  const currencies = Object.keys(o.earnings).length ? (Object.keys(o.earnings) as Currency[]) : (["NOK"] as Currency[]);
  const verified = o.bookings.filter((b) => b.status === "verified");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Promoter dashboard</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Hi {profile.display_name || "there"} 👋</h1>
        </div>
        <Button asChild className="bg-brand text-white">
          <Link href="/promoter/explore">Find campaigns</Link>
        </Button>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {currencies.map((cur) => (
          <Stat
            key={`a-${cur}`}
            label={`Available${currencies.length > 1 ? ` (${cur})` : ""}`}
            value={formatMinor(o.earnings[cur]?.available ?? 0, cur)}
            hint="Ready for payout"
            accent
          />
        ))}
        {currencies.map((cur) => (
          <Stat
            key={`p-${cur}`}
            label={`Pending${currencies.length > 1 ? ` (${cur})` : ""}`}
            value={formatMinor(o.earnings[cur]?.pending ?? 0, cur)}
            hint="Verified, refund window open"
          />
        ))}
        <Stat label="Link clicks" value={o.totalClicks} />
        <Stat label="Bookings" value={o.bookings.length} hint={`${verified.length} verified`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          <h2 className="font-semibold">Commissions</h2>
          {!o.bookings.length && (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No bookings yet. Share your link to get your first customer.
            </p>
          )}
          {o.bookings.map((b) => {
            const stage = bookingStage(b);
            const cur = b.currency as Currency;
            return (
              <Highlight key={b.id} ids={[b.id]}>
              <div data-booking-id={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-4">
                <div>
                  <div className="font-medium">{b.campaigns?.service_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatSlot(b.slot_start)}
                    {b.status === "verified" && b.payout_at ? ` · payout ${formatDate(b.payout_at)}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold tabular-nums">{formatMinor(b.commission_minor, cur)}</div>
                  <StatusBadge status={stage.key} label={stage.label} />
                </div>
              </div>
              </Highlight>
            );
          })}

          <h2 className="pt-4 font-semibold">My campaigns</h2>
          {!o.memberships.length && (
            <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              You haven&apos;t joined a campaign yet. <Link href="/promoter/explore" className="underline">Explore campaigns</Link>.
            </p>
          )}
          {o.memberships.map((m) => {
            const c = m.campaigns;
            const code = m.referral_links?.code;
            const cur = (c?.currency ?? "NOK") as Currency;
            return (
              <div key={m.id} className="space-y-3 rounded-xl border border-border bg-card/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/promoter/campaigns/${m.campaign_id}`} className="hover:underline">
                    <div className="font-medium">{c?.service_name}</div>
                    <div className="text-sm text-muted-foreground">{c?.businesses?.name}</div>
                  </Link>
                  <div className="text-right text-sm">
                    <div className="font-semibold">{formatMinor(m.agreements?.commission_minor ?? 0, cur)}</div>
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
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Activity</h2>
          {!o.notifications.length && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
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
