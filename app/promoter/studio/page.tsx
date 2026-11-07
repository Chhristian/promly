import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { siteUrl } from "@/lib/promoter-data";
import { formatMinor, type Currency } from "@/lib/money";
import { Studio, type StudioCampaign } from "./studio";
import { signedPhotoUrls } from "@/lib/photos";
import { mustMentions } from "@/lib/promo-image-layout";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ campaign?: string }> }) {
  const { campaign: preselect } = await searchParams;
  const { user, supabase } = await requireRole("promoter");
  const base = await siteUrl();

  const { data: memberships } = await supabase
    .from("campaign_memberships")
    .select("campaign_id, campaigns(service_name, description, price_minor, currency, photo_paths, businesses(name, city, category)), agreements(allowed_channels, brand_rules), referral_links(code)")
    .eq("promoter_id", user.id)
    .order("created_at", { ascending: false });

  // Photos of campaigns the promoter has joined (the business's own, approved photos).
  const allPaths = (memberships ?? []).flatMap((m) => m.campaigns?.photo_paths ?? []);
  const signed = allPaths.length ? await signedPhotoUrls(allPaths) : {};

  const campaigns: StudioCampaign[] = (memberships ?? []).flatMap((m) =>
    m.campaigns && m.referral_links && m.agreements
      ? [{
          id: m.campaign_id,
          serviceName: m.campaigns.service_name,
          businessName: m.campaigns.businesses?.name ?? "",
          city: m.campaigns.businesses?.city ?? "",
          price: formatMinor(m.campaigns.price_minor, m.campaigns.currency as Currency),
          description: m.campaigns.description,
          link: `${base}/r/${m.referral_links.code}`,
          allowedChannels: m.agreements.allowed_channels,
          brandRules: m.agreements.brand_rules,
          category: m.campaigns.businesses?.category ?? "other",
          photos: m.campaigns.photo_paths.flatMap((p) => (signed[p] ? [signed[p]] : [])),
          mustMentions: mustMentions(m.agreements.brand_rules, m.campaigns.description),
        }]
      : [],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[clamp(2rem,5vw,2.75rem)]">Marketing Studio</h1>
        <p className="text-sm text-muted-foreground">
          Ready-to-use texts for your campaigns, filled with the business&apos;s own details and your link. Edit them, then copy.
        </p>
      </div>
      {campaigns.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-input p-8 text-sm text-muted-foreground">
          Join a campaign first. <Link href="/promoter/explore" className="underline">Explore campaigns</Link>
        </p>
      ) : (
        <Studio campaigns={campaigns} initialCampaignId={campaigns.some((c) => c.id === preselect) ? preselect! : campaigns[0].id} />
      )}
    </div>
  );
}
