"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLATFORM_FEE_BPS } from "@/lib/money";
import { friendlyError } from "@/lib/errors";
import type { ActionState } from "@/components/action-form";

const bookingSchema = z.object({
  code: z.string().regex(/^[a-z0-9]{10}$/, "Invalid link"),
  slot_start: z.iso.datetime({ offset: true, message: "Pick a time" }),
  customer_name: z.string().trim().min(1, "Enter your name").max(100),
  customer_phone: z
    .string()
    .trim()
    .min(5, "Enter your phone number")
    .max(40)
    .regex(/^[+0-9 ()-]+$/, "Use digits, spaces and + only"),
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
