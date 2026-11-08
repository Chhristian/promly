import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { formatMinor, platformFeeMinor, type Currency } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/stat";
import { AgreementView } from "@/components/agreement-view";
import { AgreementForm, EditCampaignForm, StatusButtons } from "../campaign-forms";
import { paymentsEnabled } from "@/lib/flags";
import { demoAvatarUrls } from "@/lib/demo-images";
import { isAgeRestrictedCategory } from "@/lib/payments";
import { CampaignCover } from "@/components/campaign-cover";
import { signedPhotoUrls } from "@/lib/photos";
import { PhotoManager } from "./photo-manager";
import { Highlight } from "@/components/live";

export default async function CampaignEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRole("business");

  const { data: campaign } = await supabase.from("campaigns").select("*, businesses(name, currency, category)").eq("id", id).maybeSingle();
  if (!campaign || !campaign.businesses) notFound();

  const [{ data: agreement }, { data: members }] = await Promise.all([
    campaign.current_agreement_id
      ? supabase.from("agreements").select("*").eq("id", campaign.current_agreement_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("campaign_memberships")
      .select("id, created_at, promoter_accepted_at, profiles(display_name, is_demo), agreements(version)")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const avatars = await demoAvatarUrls((members ?? []).flatMap((m) => (m.profiles ? [m.profiles] : [])));
  const signed = campaign.photo_paths.length ? await signedPhotoUrls(campaign.photo_paths) : {};
  const photos = campaign.photo_paths.filter((p) => signed[p]).map((p) => ({ path: p, url: signed[p] }));
  const cur = campaign.businesses.currency as Currency;
  const money = (m: number) => formatMinor(m, cur);
  const fee = platformFeeMinor(campaign.price_minor);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border">
            <CampaignCover category={campaign.businesses.category} imageUrl={photos[0]?.url} size="sm" />
          </div>
          <div>
            <Link href="/business" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="line-clamp-3 text-[clamp(1.6rem,4.5vw,2.25rem)]">{campaign.service_name}</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="line-clamp-1 text-muted-foreground">{campaign.businesses.name}</p>
          </div>
        </div>
      </div>

      {/* One panel, one primary action: what it costs, and Publish. */}
      <section className="card flex flex-col gap-5 border-2 border-ink p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        {agreement ? (
          <dl className="grid flex-1 grid-cols-3 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Promoter earns</dt>
              <dd className="mt-1 money text-2xl sm:text-3xl">{money(agreement.commission_minor)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Promly fee (2.75%)</dt>
              <dd className="mt-1 money text-2xl sm:text-3xl">{money(fee)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">You pay per verified booking</dt>
              <dd className="mt-1 money text-2xl sm:text-3xl"><span className="marked">{money(agreement.commission_minor + fee)}</span></dd>
            </div>
          </dl>
        ) : (
          <p className="flex-1 text-muted-foreground">Set the commission and accept the agreement below. Then publish.</p>
        )}
        <StatusButtons campaignId={campaign.id} status={campaign.status} canPublish={!!agreement} />
      </section>

      <PhotoManager campaignId={campaign.id} photos={photos} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 card p-5">
          <h2 className="text-lg">Campaign details</h2>
          <EditCampaignForm
            campaignId={campaign.id}
            currency={cur}
            serviceName={campaign.service_name}
            description={campaign.description}
            priceMinor={campaign.price_minor}
            externalBookingUrl={campaign.external_booking_url ?? ""}
            age={
              paymentsEnabled()
                ? { rating: campaign.age_rating as "16+" | "18+", restricted: campaign.age_restricted, categoryRestricted: isAgeRestrictedCategory(campaign.businesses.category) }
                : undefined
            }
          />
        </section>

        <section className="space-y-3 card p-5">
          <h2 className="text-lg">Agreement terms</h2>
          <p className="text-sm text-muted-foreground">
            {agreement
              ? "Changing terms creates a new version. Promoters who already joined keep the version they accepted."
              : "Set the terms and accept them. You can publish once the agreement is accepted."}
          </p>
          <AgreementForm
            campaignId={campaign.id}
            currency={cur}
            defaults={{
              commissionMinor: agreement?.commission_minor,
              payoutDays: agreement?.payout_days ?? 7,
              refundWindowDays: agreement?.refund_window_days ?? 3,
              allowedChannels: agreement?.allowed_channels ?? ["instagram", "tiktok", "whatsapp", "word_of_mouth"],
              brandRules: agreement?.brand_rules ?? "",
            }}
          />
        </section>
      </div>

      {agreement && (
        <AgreementView
          version={agreement.version}
          acceptedAt={formatDateTime(agreement.business_accepted_at)}
          terms={{
            businessName: campaign.businesses.name,
            serviceName: campaign.service_name,
            currency: cur,
            priceMinor: campaign.price_minor,
            commissionMinor: agreement.commission_minor,
            payoutDays: agreement.payout_days,
            refundWindowDays: agreement.refund_window_days,
            allowedChannels: agreement.allowed_channels,
            brandRules: agreement.brand_rules,
            templateVersion: agreement.template_version,
          }}
        />
      )}

      <section className="space-y-3">
        <h2 className="text-lg">Promoters ({members?.length ?? 0})</h2>
        {!members?.length && <p className="text-sm text-muted-foreground">No promoters have joined yet.</p>}
        {!!members?.length && <div className="ledger">{members.map((m) => (
          <Highlight key={m.id} ids={[m.id]}>
          <div className="flex flex-wrap items-center justify-between gap-x-3 px-4 py-3 text-sm">
            <span className="flex items-center gap-2 font-medium">
              {m.profiles && avatars[m.profiles.display_name] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatars[m.profiles.display_name]} alt="" width={28} height={28} className="h-7 w-7 rounded-full" data-testid="promoter-avatar" />
              )}
              {m.profiles?.display_name || "Promoter"}
            </span>
            <span className="text-muted-foreground">
              accepted v{m.agreements?.version}, {formatDateTime(m.promoter_accepted_at)}
            </span>
          </div>
          </Highlight>
        ))}</div>}
      </section>
    </div>
  );
}
