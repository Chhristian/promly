"use client";

import { useActionState } from "react";
import { CircleCheck } from "lucide-react";
import { SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { payGlansDemo, type GlansState } from "./actions";

export function GlansCheckoutForm({ refCode }: { refCode: string }) {
  const [state, action] = useActionState<GlansState, FormData>(payGlansDemo, undefined);

  if (state?.done) {
    return (
      <div className="mt-7 rounded-2xl border border-border bg-card p-6 text-center" data-testid="glans-thanks">
        <CircleCheck className="mx-auto h-10 w-10 text-paid" />
        <h2 className="mt-3 text-2xl">Takk for bestillingen</h2>
        <p className="mt-2 text-muted-foreground">
          {state.serviceName} – {state.priceLabel}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Ordrenummer: {state.orderId}</p>
        <p className="mt-4 text-xs text-muted-foreground">Demo: ingen betaling er trukket.</p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-7 space-y-6">
      <input type="hidden" name="ref" value={refCode} />

      <div className="space-y-3">
        <div className="text-sm font-semibold">Dine opplysninger</div>
        <div className="grid gap-1.5">
          <Label htmlFor="customer_name">Navn</Label>
          <Input id="customer_name" name="customer_name" required maxLength={100} autoComplete="name" className="h-12 text-base" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="customer_phone">Telefon</Label>
          <Input
            id="customer_phone"
            name="customer_phone"
            required
            type="tel"
            inputMode="tel"
            maxLength={40}
            autoComplete="tel"
            placeholder="+47 400 00 000"
            className="h-12 text-base"
          />
        </div>
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 shrink-0 accent-[hsl(232_87%_54%)]" />
          <span>
            Jeg samtykker til at Glans Bilpleie deler navnet, telefonnummeret og bestillingen min med Promly, slik at personen
            som anbefalte oss får provisjon.
          </span>
        </label>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div>
        <SubmitButton pendingText="Behandler…" className="h-14 w-full text-lg">
          Betal (demo)
        </SubmitButton>
        <p className="mt-2 text-center text-xs text-muted-foreground">Ingen ekte betaling. Dette er en demo.</p>
      </div>
    </form>
  );
}
