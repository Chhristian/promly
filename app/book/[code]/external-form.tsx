"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExternalReferralAction } from "../actions";

/** For businesses with their own booking system: leave name + phone, then continue to their site. */
export function ExternalReferralForm({ code, businessName }: { code: string; businessName: string }) {
  return (
    <ActionForm action={createExternalReferralAction} className="mt-7 space-y-6">
      <input type="hidden" name="code" value={code} />

      <div className="space-y-3">
        <div className="text-sm font-semibold">Your details</div>
        <div className="grid gap-1.5">
          <Label htmlFor="customer_name">Name</Label>
          <Input id="customer_name" name="customer_name" required maxLength={100} autoComplete="name" className="h-12 text-base" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="customer_phone">Phone</Label>
          <Input id="customer_phone" name="customer_phone" required type="tel" inputMode="tel" maxLength={40} autoComplete="tel" placeholder="+47 400 00 000" className="h-12 text-base" />
        </div>
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 shrink-0 accent-[hsl(232_87%_54%)]" />
          <span>
            I agree that {businessName} gets my name and phone number, so my booking is linked to the person who
            recommended them.
          </span>
        </label>
      </div>

      <div className="sticky bottom-3 z-10">
        <SubmitButton pendingText="Opening…" className="h-14 w-full text-lg shadow-[0_8px_24px_-8px_hsl(232_87%_54%/0.6)]">
          Continue to {businessName}
        </SubmitButton>
        <p className="mt-2 text-center text-xs text-muted-foreground">You&apos;ll finish booking on {businessName}&apos;s own site.</p>
      </div>
    </ActionForm>
  );
}
