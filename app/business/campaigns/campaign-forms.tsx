"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHANNELS } from "@/lib/agreement-template";
import { minorToMajorInput } from "@/lib/money";
import { acceptAgreement, createCampaign, setCampaignStatus, updateCampaign } from "../actions";
import { selectClass, textareaClass } from "../create-business-form";

/** Age rating settings; only shown when payments (and age ratings) are switched on. */
export type AgeProps = { rating: "16+" | "18+"; restricted: boolean; categoryRestricted: boolean };

export function NewCampaignForm({ currency, age }: { currency: string; age?: AgeProps }) {
  return (
    <ActionForm action={createCampaign} className="mt-6 space-y-4 card p-5">
      <CampaignFields currency={currency} age={age} />
      <SubmitButton className="w-full">Create campaign</SubmitButton>
    </ActionForm>
  );
}

function CampaignFields({
  currency,
  serviceName = "",
  description = "",
  priceMinor,
  externalBookingUrl = "",
  age,
}: {
  currency: string;
  serviceName?: string;
  description?: string;
  priceMinor?: number;
  externalBookingUrl?: string;
  age?: AgeProps;
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="service_name">Service</Label>
        <Input id="service_name" name="service_name" required maxLength={120} defaultValue={serviceName} placeholder="Sunset Fjord Cruise" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="price">Price ({currency})</Label>
        <Input id="price" name="price" required inputMode="decimal" defaultValue={priceMinor ? minorToMajorInput(priceMinor) : ""} placeholder="500" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <textarea id="description" name="description" maxLength={4000} defaultValue={description} className={textareaClass} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="external_booking_url">External booking link (optional)</Label>
        <Input
          id="external_booking_url"
          name="external_booking_url"
          type="url"
          inputMode="url"
          maxLength={500}
          pattern="https://.+"
          defaultValue={externalBookingUrl}
          placeholder="https://yourbookingsystem.com/book"
          aria-describedby="external_booking_url_help"
        />
        <input type="hidden" name="external_booking_url_was" value={externalBookingUrl} />
        <p id="external_booking_url_help" className="text-sm text-muted-foreground">
          Use your own booking system? Customers leave their name and phone on Promly, then go to this link with{" "}
          <code className="text-xs">?ref=CODE</code> added. Leave empty to take bookings on Promly.
        </p>
      </div>
      {age && <AgeFields age={age} />}
    </>
  );
}

function AgeFields({ age }: { age: AgeProps }) {
  const locked = age.restricted || age.categoryRestricted;
  return (
    <fieldset className="grid gap-2" data-testid="age-rating">
      <input type="hidden" name="age_fields" value="1" />
      <legend className="mb-1 text-sm font-medium">Who can promote this?</legend>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {(["18+", "16+"] as const).map((r) => (
          <label key={r} className="flex items-center gap-2 rounded-lg border border-border p-3">
            <input type="radio" name="age_rating" value={r} defaultChecked={(locked ? "18+" : age.rating) === r} disabled={locked && r === "16+"} />
            {r === "18+" ? "18+ only" : "16+ (16 and 17 too)"}
          </label>
        ))}
      </div>
      {age.categoryRestricted ? (
        <p className="text-xs text-muted-foreground">Nightlife, clubs and alcohol are always 18+.</p>
      ) : (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="age_restricted" defaultChecked={age.restricted} disabled={age.restricted} className="mt-1 accent-cobalt" />
          {age.restricted && <input type="hidden" name="age_restricted" value="on" />}
          <span>Age-restricted (for example alcohol): always 18+. This can&apos;t be undone.</span>
        </label>
      )}
      <p className="text-xs text-muted-foreground">Promoters aged 16-17 only see 16+ campaigns and are paid through a parent or guardian.</p>
    </fieldset>
  );
}

export function EditCampaignForm(props: {
  campaignId: string;
  currency: string;
  serviceName: string;
  description: string;
  priceMinor: number;
  externalBookingUrl?: string;
  age?: AgeProps;
}) {
  return (
    <ActionForm action={updateCampaign} className="space-y-4">
      <input type="hidden" name="campaign_id" value={props.campaignId} />
      <CampaignFields {...props} />
      <SubmitButton variant="secondary">Save details</SubmitButton>
    </ActionForm>
  );
}

export function AgreementForm({
  campaignId,
  currency,
  defaults,
  latestPdf,
}: {
  campaignId: string;
  currency: string;
  /** Newest uploaded agreement PDF, offered for inclusion in this version. */
  latestPdf?: { id: string; version: number } | null;
  defaults: {
    commissionMinor?: number;
    payoutDays: number;
    refundWindowDays: number;
    allowedChannels: string[];
    brandRules: string;
  };
}) {
  return (
    <ActionForm action={acceptAgreement} className="space-y-4">
      <input type="hidden" name="campaign_id" value={campaignId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="commission">Commission per verified booking ({currency})</Label>
          <Input
            id="commission"
            name="commission"
            required
            inputMode="decimal"
            placeholder="100"
            defaultValue={defaults.commissionMinor ? minorToMajorInput(defaults.commissionMinor) : ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="payout_days">Payout after verification</Label>
          <select id="payout_days" name="payout_days" defaultValue={String(defaults.payoutDays)} className={selectClass}>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="refund_window_days">Refund window (days)</Label>
          <Input id="refund_window_days" name="refund_window_days" type="number" min={0} max={14} required defaultValue={defaults.refundWindowDays} />
        </div>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Allowed marketing channels</legend>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <label key={c.value} className="flex cursor-pointer items-center gap-2 rounded-full border border-input bg-card px-3.5 py-1.5 text-sm font-medium has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white">
              <input type="checkbox" name="allowed_channels" value={c.value} defaultChecked={defaults.allowedChannels.includes(c.value)} className="accent-cobalt" />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="brand_rules">Brand rules</Label>
        <textarea id="brand_rules" name="brand_rules" maxLength={2000} defaultValue={defaults.brandRules} className={textareaClass} placeholder="e.g. Use only our photos. No discounts that aren't in the campaign." />
      </div>
      {latestPdf && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="document_id" value={latestPdf.id} defaultChecked className="mt-1 accent-[hsl(232_87%_54%)]" data-testid="include-agreement-pdf" />
          <span>Include my agreement PDF (version {latestPdf.version}). Promoters must accept it to join.</span>
        </label>
      )}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="accept" required className="mt-1 accent-cobalt" />
        <span>I accept this agreement on behalf of the business.</span>
      </label>
      <SubmitButton>Accept agreement</SubmitButton>
    </ActionForm>
  );
}

export function StatusButtons({ campaignId, status, canPublish }: { campaignId: string; status: string; canPublish: boolean }) {
  return (
    <ActionForm action={setCampaignStatus} className="flex flex-col items-stretch gap-2 sm:items-end">
      <input type="hidden" name="campaign_id" value={campaignId} />
      {status !== "published" ? (
        <>
          <SubmitButton
            name="status"
            value="published"
            pendingText="Publishing…"
            className={`h-12 px-8 text-base ${!canPublish ? "opacity-60" : ""}`}
          >
            Publish
          </SubmitButton>
          <span className="text-sm text-muted-foreground">
            {canPublish ? "Promoters see it instantly." : "Accept the agreement below first."}
          </span>
        </>
      ) : (
        <>
          <span className="flex items-center gap-2 text-sm font-medium text-paid">
            <span className="h-2 w-2 rounded-full bg-paid" /> Live, promoters can join
          </span>
          <SubmitButton name="status" value="paused" variant="secondary" pendingText="Pausing…">
            Pause campaign
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
