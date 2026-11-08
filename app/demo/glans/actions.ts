"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { GLANS_REF_COOKIE, demoModeOn, isReferralCode, processConversion } from "@/lib/conversions";
import { formatMinor, type Currency } from "@/lib/money";
import { getGlansCheckout } from "./data";

export type GlansState =
  | { error?: string; done?: undefined }
  | { done: true; orderId: string; serviceName: string; priceLabel: string; error?: undefined }
  | undefined;

const schema = z.object({
  ref: z.string().optional(),
  customer_name: z.string().trim().min(1, "Skriv inn navnet ditt").max(100),
  customer_phone: z
    .string()
    .trim()
    .min(5, "Skriv inn telefonnummeret ditt")
    .max(40)
    .regex(/^[+0-9 ()-]+$/, "Bruk bare tall, mellomrom, + ( ) og -"),
  consent: z.literal("on", { message: "Kryss av for samtykke for å fullføre bestillingen." }),
});

const MESSAGES: Record<string, string> = {
  attributed_to_other_promoter: "Dette telefonnummeret er allerede henvist av en annen person for dette tilbudet.",
  customer_already_converted: "Dette telefonnummeret har allerede bestilt dette tilbudet.",
  booking_not_pending: "Bestillingen for dette telefonnummeret er kansellert eller refundert.",
  campaign_not_published: "Dette tilbudet tar ikke imot bestillinger nå.",
  referral_link_not_found: "Henvisningslenken finnes ikke.",
};

/**
 * "Betal (demo)": no real payment. Reports the paid order with the same logic as
 * POST /api/conversions (processConversion), directly on the server: no HTTP and
 * no secret. The amount is the campaign price from the database.
 */
export async function payGlansDemo(_: GlansState, fd: FormData): Promise<GlansState> {
  if (!demoModeOn()) return { error: "Demo Mode er av." };

  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Sjekk skjemaet og prøv igjen." };
  const f = parsed.data;

  const cookieRef = (await cookies()).get(GLANS_REF_COOKIE)?.value;
  const ref = isReferralCode(cookieRef) ? cookieRef : f.ref;
  const checkout = await getGlansCheckout(ref);
  if (!checkout) return { error: "Åpne siden via en Promly-henvisningslenke for å bestille." };

  // Self-referral: a logged-in promoter can't use their own link (same rule as the booking page).
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user?.id === checkout.promoterId) return { error: "Du kan ikke bruke din egen henvisningslenke." };

  const orderId = `glans-demo-${randomUUID()}`;
  try {
    const result = await processConversion(createAdminClient(), {
      ref: checkout.ref,
      external_id: orderId,
      amount_minor: checkout.priceMinor,
      customer_name: f.customer_name,
      customer_phone: f.customer_phone,
      status: "paid",
    });
    if (result.status !== 200) {
      const code = String(result.body.error ?? "");
      console.error("[glans-demo] conversion rejected", result.status, code);
      return { error: MESSAGES[code] ?? "Bestillingen kunne ikke fullføres. Prøv igjen." };
    }
  } catch (e) {
    console.error("[glans-demo] conversion failed", e instanceof Error ? e.message : e);
    return { error: "Noe gikk galt. Prøv igjen." };
  }

  return {
    done: true,
    orderId,
    serviceName: checkout.serviceName,
    priceLabel: formatMinor(checkout.priceMinor, checkout.currency as Currency),
  };
}
