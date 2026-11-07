"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getExternalRedirect } from "@/lib/booking-data";
import { PLATFORM_FEE_BPS } from "@/lib/money";
import { friendlyError } from "@/lib/errors";
import type { ActionState } from "@/components/action-form";

const customerFields = {
  code: z.string().regex(/^[a-z0-9]{10}$/, "Invalid link"),
  customer_name: z.string().trim().min(1, "Enter your name").max(100),
  customer_phone: z
    .string()
    .trim()
    .min(5, "Enter your phone number")
    .max(40)
    .regex(/^[+0-9 ()-]+$/, "Use digits, spaces and + only"),
};

const bookingSchema = z.object({
  ...customerFields,
  slot_start: z.iso.datetime({ offset: true, message: "Pick a time" }),
});

const externalSchema = z.object({
  ...customerFields,
  consent: z.literal("on", { message: "Tick the box to share your details with the business." }),
});

/**
 * Customer booking. No login. The referral attribution comes from the link
 * code and is resolved on the server; the fee is computed on the server and
 * all terms are frozen by the create_booking database function.
 */
export async function createBookingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const b = parsed.data;

  const admin = createAdminClient();
  const { data: bookingId, error } = await admin.rpc("create_booking", {
    p_referral_code: b.code,
    p_slot_start: b.slot_start,
    p_customer_name: b.customer_name,
    p_customer_phone: b.customer_phone,
    p_fee_bps: PLATFORM_FEE_BPS,
  });
  if (error || !bookingId) return { error: friendlyError(error) };
  redirect(`/book/${b.code}/confirmed?booking=${bookingId}`);
}

/**
 * External booking (the business has its own booking system). Stores a pending
 * booking attributed to the promoter, then sends the customer to the business
 * URL with ?ref=<code>. The URL comes from the database, never from the form.
 */
export async function createExternalReferralAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = externalSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const b = parsed.data;

  const target = await getExternalRedirect(b.code);
  if (!target) return { error: friendlyError({ message: "no_external_url" }) };

  // Self-referral: a logged-in promoter can't use their own link.
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user?.id === target.promoterId) return { error: friendlyError({ message: "self_referral" }) };

  const admin = createAdminClient();
  const { error } = await admin.rpc("create_external_referral", {
    p_referral_code: b.code,
    p_customer_name: b.customer_name,
    p_customer_phone: b.customer_phone,
    p_consent: true,
    p_fee_bps: PLATFORM_FEE_BPS,
  });
  // Already referred with this phone: the attribution exists, so just send them on.
  if (error && !error.message?.includes("duplicate_referral")) return { error: friendlyError(error) };
  redirect(target.url);
}
