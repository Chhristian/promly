import Link from "next/link";
import { Check, Compass, MapPin } from "lucide-react";
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
        <h1 className="text-[clamp(2rem,5vw,2.75rem)]">Explore campaigns</h1>
        <p className="mt-1 text-muted-foreground">Businesses that sell online (tours, rentals, experiences, tickets) looking for customers. Join one, share your link, earn on every verified booking.</p>
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
                  className="card group flex h-full flex-col overflow-hidden transition-[transform,border-color] duration-200 ease-out hover:border-ink/40 [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5"
                >
                  <div className="relative h-40 overflow-hidden">
                    <CampaignCover category={c.businesses?.category} imageUrl={covers[c.id]} />
                    <span className="absolute left-3 top-3 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-ink">
                      {categoryLabel(c.businesses?.category)}
                    </span>
                    {isJoined && (
                      <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-marker px-2.5 py-1 text-xs font-bold text-ink">
                        <Check className="h-3.5 w-3.5" /> Joined
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="line-clamp-3 text-xl font-extrabold leading-tight tracking-[-0.015em]">{c.service_name}</div>
                    <div className="mt-1 line-clamp-1 text-sm font-medium">{c.businesses?.name}</div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> {c.businesses?.city}
                      {c.businesses?.country === "ES" ? ", Spain" : ", Norway"}
                    </div>
                    {/* Ticket stub: perforation, then what you earn */}
                    <div className="relative -mx-5 mt-auto pt-5">
                      <div className="mx-5 border-t border-dashed border-input" />
                      <span className="absolute -left-2.5 top-[1.1rem] h-5 w-5 rounded-full border border-border bg-background" />
                      <span className="absolute -right-2.5 top-[1.1rem] h-5 w-5 rounded-full border border-border bg-background" />
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-4">
                      <div>
                        <div className="text-sm text-muted-foreground">You earn</div>
                        <div className="money text-3xl leading-none">{formatMinor(c.commission_minor, cur)}</div>
                      </div>
                      <div className="min-w-0 text-right text-sm text-muted-foreground">
                        <span className="font-semibold text-primary group-hover:underline">{isJoined ? "Open campaign" : "View and join"}</span>
                        <div className="whitespace-nowrap">price {formatMinor(c.price_minor, cur)}</div>
                      </div>
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
