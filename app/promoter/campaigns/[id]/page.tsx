import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { formatMinor, type Currency } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { siteUrl } from "@/lib/promoter-data";
import { AgreementView } from "@/components/agreement-view";
import { ShareTools } from "@/components/share-tools";
import { JoinForm } from "./join-form";

export default async function PromoterCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, supabase } = await requireRole("promoter");

  const { data: c } = await supabase.from("campaigns").select("*, businesses(name, city, country)").eq("id", id).maybeSingle();
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

  const cur = c.currency as Currency;
  const base = await siteUrl();
  const link = membership?.referral_links?.code ? `${base}/r/${membership.referral_links.code}` : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/promoter/explore" className="text-sm text-muted-foreground hover:text-foreground">← Explore</Link>
        <h1 className="mt-1 text-2xl font-bold">{c.service_name}</h1>
        <p className="text-sm text-muted-foreground">
          {c.businesses.name} · {c.businesses.city}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card/70 p-4">
          <div className="text-xs text-muted-foreground">Customer pays</div>
          <div className="text-2xl font-bold">{formatMinor(c.price_minor, cur)}</div>
        </div>
        <div className="rounded-xl border border-primary/50 bg-primary/10 p-4">
          <div className="text-xs text-muted-foreground">You earn per verified booking</div>
          <div className="text-gradient text-2xl font-bold">{formatMinor(agreement?.commission_minor ?? c.commission_minor, cur)}</div>
        </div>
      </div>

      {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}

      {link ? (
        <section className="space-y-2 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
          <h2 className="font-semibold">Your personal link</h2>
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
              Create promo text →
            </Link>
          </div>
        </section>
      ) : c.status !== "published" ? (
        <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">This campaign isn&apos;t accepting new promoters right now.</p>
      ) : null}

      {agreement && (
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
