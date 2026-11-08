"use client";

import { useEffect } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { joinCampaign } from "../../actions";

export function JoinForm({ campaignId, agreementId, pdfVersion }: { campaignId: string; agreementId: string; pdfVersion?: number }) {
  // This form disappears once the promoter has joined: bring them back to the top,
  // where their personal link and QR code now are.
  useEffect(() => () => window.scrollTo({ top: 0, behavior: "smooth" }), []);
  return (
    <ActionForm action={joinCampaign} className="space-y-3 card p-4">
      <input type="hidden" name="campaign_id" value={campaignId} />
      <input type="hidden" name="agreement_id" value={agreementId} />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="accept" required className="mt-1 accent-[hsl(232_87%_54%)]" />
        <span>
          {pdfVersion
            ? `I have read and accept this agreement, including the attached PDF (version ${pdfVersion}).`
            : "I have read and accept this agreement."}
        </span>
      </label>
      <SubmitButton pendingText="Joining…" className="w-full">Accept &amp; join</SubmitButton>
    </ActionForm>
  );
}
