import Link from "next/link";
import { ArrowRight, Check, Compass, MapPin } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { formatMinor, type Currency } from "@/lib/money";
import { Highlight } from "@/components/live";
import { CampaignCover, categoryLabel } from "@/components/campaign-cover";
import { EmptyState } from "@/components/empty-state";
import { coverUrls } from "@/lib/photos";

export default async function ExplorePage() {
  const { user, supabase } = await requireRole("promoter");
  const [{ data: campaigns }, { data: mine }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, service_name, description, photo_paths, price_minor, commission_minor, currency, published_at, businesses(name, city, country, category)")
      .eq("status", "published")
      .order("published_at", { ascending: false }),
    supabase.from("campaign_memberships").select("campaign_id").eq("promoter_id", user.id),
  ]);
  const joined = new Set((mine ?? []).map((m) => m.campaign_id));
  const covers = await coverUrls(campaigns ?? []);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Marketplace</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Explore campaigns</h1>
        <p className="mt-1 text-muted-foreground">Local businesses looking for customers. Join one, share your link, earn on every verified booking.</p>
      </div>
      {!campaigns?.length ? (
        <EmptyState
          icon={Compass}
          title="No live campaigns right now"
          body="New campaigns appear here the moment a business publishes. No need to refresh."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => {
            const cur = c.currency as Currency;
            const isJoined = joined.has(c.id);
            return (
              <Highlight key={c.id} ids={[c.id]} className="h-full">
                <Link
                  href={`/promoter/campaigns/${c.id}`}
                  data-campaign-id={c.id}
                  className="card group flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-violet-400/60"
                >
                  <div className="relative h-36">
                    <CampaignCover category={c.businesses?.category} imageUrl={covers[c.id]} />
                    <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                      {categoryLabel(c.businesses?.category)}
                    </span>
                    {isJoined && (
                      <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-emerald-950">
                        <Check className="h-3.5 w-3.5" /> Joined
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="text-xl font-semibold leading-tight">{c.service_name}</div>
                    <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      {c.businesses?.name} · <MapPin className="h-3.5 w-3.5" /> {c.businesses?.city}
                      {c.businesses?.country === "ES" ? ", Spain" : ", Norway"}
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <div className="text-sm text-muted-foreground">Price {formatMinor(c.price_minor, cur)}</div>
                      <div className="text-right">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">You earn</div>
                        <div className="text-gradient text-3xl font-bold tabular-nums">{formatMinor(c.commission_minor, cur)}</div>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-2.5 text-sm font-semibold transition group-hover:bg-violet-500/25">
                      {isJoined ? "Open campaign" : "View & join"} <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              </Highlight>
            );
          })}
        </div>
      )}
    </div>
  );
}
