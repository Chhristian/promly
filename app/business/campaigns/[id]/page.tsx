import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { formatMinor, platformFeeMinor, type Currency } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/stat";
import { AgreementView } from "@/components/agreement-view";
import { AgreementForm, EditCampaignForm, StatusButtons } from "../campaign-forms";
import { Highlight } from "@/components/live";

export default async function CampaignEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRole("business");

  const { data: campaign } = await supabase.from("campaigns").select("*, businesses(name, currency)").eq("id", id).maybeSingle();
  if (!campaign || !campaign.businesses) notFound();

  const [{ data: agreement }, { data: members }] = await Promise.all([
    campaign.current_agreement_id
      ? supabase.from("agreements").select("*").eq("id", campaign.current_agreement_id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("campaign_memberships")
      .select("id, created_at, promoter_accepted_at, profiles(display_name), agreements(version)")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const cur = campaign.businesses.currency as Currency;
  const money = (m: number) => formatMinor(m, cur);
  const fee = platformFeeMinor(campaign.price_minor);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/business" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold">
            {campaign.service_name} <StatusBadge status={campaign.status} />
          </h1>
          <p className="text-sm text-muted-foreground">{campaign.businesses.name}</p>
        </div>
        <StatusButtons campaignId={campaign.id} status={campaign.status} canPublish={!!agreement} />
      </div>

      {agreement && (
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-xl border border-border bg-card/70 p-3">
            <div className="text-xs text-muted-foreground">Promoter earns</div>
            <div className="text-lg font-bold">{money(agreement.commission_minor)}</div>
          </div>
          <div className="rounded-xl border border-border bg-card/70 p-3">
            <div className="text-xs text-muted-foreground">Promly fee (2.75% of price)</div>
            <div className="text-lg font-bold">{money(fee)}</div>
          </div>
          <div className="rounded-xl border border-primary/50 bg-primary/10 p-3">
            <div className="text-xs text-muted-foreground">You pay per verified booking</div>
            <div className="text-gradient text-lg font-bold">{money(agreement.commission_minor + fee)}</div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-border bg-card/70 p-5">
          <h2 className="font-semibold">Campaign details</h2>
          <EditCampaignForm
            campaignId={campaign.id}
            currency={cur}
            serviceName={campaign.service_name}
            description={campaign.description}
            priceMinor={campaign.price_minor}
          />
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-card/70 p-5">
          <h2 className="font-semibold">Agreement terms</h2>
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
          }}
        />
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Promoters ({members?.length ?? 0})</h2>
        {!members?.length && <p className="text-sm text-muted-foreground">No promoters have joined yet.</p>}
        {members?.map((m) => (
          <Highlight key={m.id} ids={[m.id]}>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card/50 p-3 text-sm">
            <span className="font-medium">{m.profiles?.display_name || "Promoter"}</span>
            <span className="text-muted-foreground">
              accepted v{m.agreements?.version} · {formatDateTime(m.promoter_accepted_at)}
            </span>
          </div>
          </Highlight>
        ))}
      </section>
    </div>
  );
}
