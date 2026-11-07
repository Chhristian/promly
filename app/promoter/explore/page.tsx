import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { formatMinor, type Currency } from "@/lib/money";
import { Highlight } from "@/components/live";

const CATEGORY: Record<string, string> = {
  barbershop: "Barbershop", beauty: "Beauty", restaurant: "Restaurant", experience: "Experience",
  water_sports: "Water sports", jet_ski: "Jet ski", boat_tour: "Boat tour", fitness: "Fitness", other: "Other",
};

export default async function ExplorePage() {
  const { user, supabase } = await requireRole("promoter");
  const [{ data: campaigns }, { data: mine }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, service_name, description, price_minor, commission_minor, currency, published_at, businesses(name, city, country, category)")
      .eq("status", "published")
      .order("published_at", { ascending: false }),
    supabase.from("campaign_memberships").select("campaign_id").eq("promoter_id", user.id),
  ]);
  const joined = new Set((mine ?? []).map((m) => m.campaign_id));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Explore campaigns</h1>
        <p className="text-sm text-muted-foreground">Businesses looking for customers. Join one, share your link, earn on verified bookings.</p>
      </div>
      {!campaigns?.length && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No campaigns are live right now. New ones appear here automatically.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns?.map((c) => {
          const cur = c.currency as Currency;
          return (
            <Highlight key={c.id} ids={[c.id]}>
            <Link
              href={`/promoter/campaigns/${c.id}`}
              data-campaign-id={c.id}
              className="flex flex-col rounded-xl border border-border bg-card/70 p-5 transition hover:border-primary/60"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{CATEGORY[c.businesses?.category ?? "other"]} · {c.businesses?.city}{c.businesses?.country === "ES" ? ", Spain" : ", Norway"}</span>
                {joined.has(c.id) && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">Joined</span>}
              </div>
              <div className="mt-2 text-lg font-semibold">{c.service_name}</div>
              <div className="text-sm text-muted-foreground">{c.businesses?.name}</div>
              <div className="mt-4 flex items-end justify-between">
                <div className="text-sm text-muted-foreground">Price {formatMinor(c.price_minor, cur)}</div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">You earn</div>
                  <div className="text-gradient text-2xl font-bold">{formatMinor(c.commission_minor, cur)}</div>
                </div>
              </div>
              <div className="mt-4 rounded-md bg-secondary py-2 text-center text-sm font-medium">
                {joined.has(c.id) ? "Open campaign" : "View & join"}
              </div>
            </Link>
            </Highlight>
          );
        })}
      </div>
    </div>
  );
}
