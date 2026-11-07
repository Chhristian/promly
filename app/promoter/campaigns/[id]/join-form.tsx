"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";
import { joinCampaign } from "../../actions";

export function JoinForm({ campaignId, agreementId }: { campaignId: string; agreementId: string }) {
  return (
    <ActionForm action={joinCampaign} className="space-y-3 card p-4">
      <input type="hidden" name="campaign_id" value={campaignId} />
      <input type="hidden" name="agreement_id" value={agreementId} />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="accept" required className="mt-1 accent-violet-500" />
        <span>I have read and accept this agreement.</span>
      </label>
      <SubmitButton pendingText="Joining…" className="w-full">Accept &amp; join</SubmitButton>
    </ActionForm>
  );
}
