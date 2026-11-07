import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { formatMinor, type Currency } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { siteUrl } from "@/lib/promoter-data";
import { AgreementView } from "@/components/agreement-view";
import { ShareTools } from "@/components/share-tools";
import { JoinForm } from "./join-form";
import { ArrowLeft, MapPin } from "lucide-react";
import { CampaignCover, categoryLabel } from "@/components/campaign-cover";
import { signedPhotoUrls } from "@/lib/photos";

export default async function PromoterCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, supabase } = await requireRole("promoter");

  const { data: c } = await supabase.from("campaigns").select("*, businesses(name, city, country, category)").eq("id", id).maybeSingle();
  if (!c || !c.businesses) notFound();

  const { data: membership } = await supabase
    .from("campaign_memberships")
    .select("id, promoter_accepted_at, agreement_id, referral_links(code)")
    .eq("campaign_id", id)
    .eq("promoter_id", user.id)
    .maybeSingle();

  // Show the version the promoter accepted, or the current one if they haven't joined.
  const agreementId = membership?.agreement_id ?? c.current_agreement_id;
  const { data: agreement } = agreementId
    ? await supabase.from("agreements").select("*").eq("id", agreementId).maybeSingle()
    : { data: null };

  const signed = c.photo_paths.length ? await signedPhotoUrls(c.photo_paths.slice(0, 1)) : {};
  const cover = c.photo_paths[0] ? signed[c.photo_paths[0]] : undefined;
  const cur = c.currency as Currency;
  const base = await siteUrl();
  const link = membership?.referral_links?.code ? `${base}/r/${membership.referral_links.code}` : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/promoter/explore" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Explore
      </Link>

      <div className="card overflow-hidden">
        <div className={link ? "relative h-32 sm:h-36" : "relative h-44 sm:h-52"}>
          <CampaignCover category={c.businesses.category} imageUrl={cover} size="lg" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5">
            <span className="rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">{categoryLabel(c.businesses.category)}</span>
            <h1 className="mt-2 line-clamp-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">{c.service_name}</h1>
            <p className="flex items-center gap-1 text-sm text-white/80">
              {c.businesses.name} · <MapPin className="h-3.5 w-3.5" /> {c.businesses.city}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="p-5">
            <div className="text-sm text-muted-foreground">Customer pays</div>
            <div className="text-3xl font-bold tabular-nums">{formatMinor(c.price_minor, cur)}</div>
          </div>
          <div className="bg-gradient-to-br from-violet-600/20 to-blue-600/10 p-5">
            <div className="text-sm text-muted-foreground">You earn per verified booking</div>
            <div className="text-gradient text-3xl font-bold tabular-nums">{formatMinor(agreement?.commission_minor ?? c.commission_minor, cur)}</div>
          </div>
        </div>
      </div>

      {c.description && !link && <p className="text-muted-foreground">{c.description}</p>}

      {link ? (
        <section className="card space-y-3 border-emerald-500/40 bg-emerald-500/5 p-5">
          <h2 className="text-lg font-semibold">Your personal link</h2>
          <p className="text-sm text-muted-foreground">Share it anywhere the agreement allows. Bookings through it are credited to you.</p>
          <ShareTools
            url={link}
            serviceName={c.service_name}
            businessName={c.businesses.name}
            whatsappAllowed={!!agreement?.allowed_channels.includes("whatsapp")}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-xs text-muted-foreground">You accepted the agreement on {formatDateTime(membership?.promoter_accepted_at)}.</p>
            <Link href={`/promoter/studio?campaign=${c.id}`} className="text-sm font-medium text-blue-300 hover:underline">
              Create promo text
            </Link>
          </div>
        </section>
      ) : c.status !== "published" ? (
        <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">This campaign isn&apos;t accepting new promoters right now.</p>
      ) : null}

      {agreement && link && (
        <details className="card group p-0">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
            <span>Agreement you accepted (version {agreement.version})</span>
            <span className="text-muted-foreground transition group-open:rotate-180">⌄</span>
          </summary>
          <div className="px-4 pb-4">
            <AgreementView
              version={agreement.version}
              terms={{
                businessName: c.businesses.name,
                serviceName: c.service_name,
                currency: cur,
                priceMinor: c.price_minor,
                commissionMinor: agreement.commission_minor,
                payoutDays: agreement.payout_days,
                refundWindowDays: agreement.refund_window_days,
                allowedChannels: agreement.allowed_channels,
                brandRules: agreement.brand_rules,
              }}
            />
          </div>
        </details>
      )}

      {agreement && !link && (
        <AgreementView
          version={agreement.version}
          terms={{
            businessName: c.businesses.name,
            serviceName: c.service_name,
            currency: cur,
            priceMinor: c.price_minor,
            commissionMinor: agreement.commission_minor,
            payoutDays: agreement.payout_days,
            refundWindowDays: agreement.refund_window_days,
            allowedChannels: agreement.allowed_channels,
            brandRules: agreement.brand_rules,
          }}
        />
      )}

      {!membership && agreement && c.status === "published" && <JoinForm campaignId={c.id} agreementId={agreement.id} />}
    </div>
  );
}
