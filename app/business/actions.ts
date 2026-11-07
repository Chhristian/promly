"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseMajorToMinor } from "@/lib/money";
import { friendlyError } from "@/lib/errors";
import { CHANNEL_VALUES } from "@/lib/agreement-template";
import type { ActionState } from "@/components/action-form";

const amount = z
  .string()
  .transform((s, ctx) => {
    const v = parseMajorToMinor(s);
    if (v === null || v <= 0) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 500 or 99.50" });
      return z.NEVER;
    }
    return v;
  });

const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form and try again.";

// ---------------------------------------------------------------------------
// Business profile
// ---------------------------------------------------------------------------
const businessSchema = z.object({
  name: z.string().trim().min(1, "Enter the business name").max(120),
  city: z.string().trim().max(80),
  country: z.enum(["NO", "ES"]),
  category: z.enum(["barbershop", "beauty", "restaurant", "experience", "water_sports", "jet_ski", "boat_tour", "fitness", "other"]),
  description: z.string().trim().max(2000),
});

export async function createBusiness(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, supabase } = await requireRole("business");
  const parsed = businessSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const b = parsed.data;
  const { error } = await supabase.from("businesses").insert({
    owner_id: user.id, name: b.name, city: b.city, country: b.country,
    currency: b.country === "NO" ? "NOK" : "EUR", category: b.category, description: b.description,
  });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/business");
  redirect("/business");
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------
const campaignSchema = z.object({
  service_name: z.string().trim().min(1, "Enter the service name").max(120),
  description: z.string().trim().max(4000),
  price: amount,
});

export async function createCampaign(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, supabase } = await requireRole("business");
  const parsed = campaignSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { data: biz } = await supabase.from("businesses").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
  if (!biz) return { error: "Create your business profile first." };
  const { data, error } = await supabase
    .from("campaigns")
    .insert({ business_id: biz.id, service_name: parsed.data.service_name, description: parsed.data.description, price_minor: parsed.data.price })
    .select("id")
    .single();
  if (error) return { error: friendlyError(error) };
  redirect(`/business/campaigns/${data.id}`);
}

export async function updateCampaign(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireRole("business");
  const id = z.uuid().safeParse(fd.get("campaign_id"));
  const parsed = campaignSchema.safeParse(Object.fromEntries(fd));
  if (!id.success || !parsed.success) return { error: parsed.success ? "Invalid campaign" : firstIssue(parsed.error) };
  const { data, error } = await supabase
    .from("campaigns")
    .update({ service_name: parsed.data.service_name, description: parsed.data.description, price_minor: parsed.data.price })
    .eq("id", id.data)
    .select("id");
  if (error) return { error: friendlyError(error) };
  if (!data?.length) return { error: "You don't have permission to do that." };
  revalidatePath(`/business/campaigns/${id.data}`);
  return { ok: "Saved." };
}

const agreementSchema = z
  .object({
    campaign_id: z.uuid(),
    commission: amount,
    payout_days: z.coerce.number().pipe(z.union([z.literal(7), z.literal(14)])),
    refund_window_days: z.coerce.number().int().min(0).max(14),
    allowed_channels: z.array(z.enum(CHANNEL_VALUES)).min(1, "Pick at least one marketing channel"),
    brand_rules: z.string().trim().max(2000),
    accept: z.literal("on", { message: "Tick the box to accept the agreement" }),
  })
  .refine((a) => a.refund_window_days <= a.payout_days, {
    message: "The refund window must end before the payout date",
  });

/** Creates a new accepted agreement version and makes it the campaign's current agreement. */
export async function acceptAgreement(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireRole("business");
  const parsed = agreementSchema.safeParse({
    ...Object.fromEntries(fd),
    allowed_channels: fd.getAll("allowed_channels"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const a = parsed.data;

  const { data: camp } = await supabase.from("campaigns").select("id, price_minor").eq("id", a.campaign_id).maybeSingle();
  if (!camp) return { error: "Campaign not found." };
  if (a.commission > camp.price_minor) return { error: friendlyError({ message: "commission_exceeds_price" }) };

  const { data: ag, error } = await supabase
    .from("agreements")
    .insert({
      campaign_id: a.campaign_id, commission_minor: a.commission, payout_days: a.payout_days,
      refund_window_days: a.refund_window_days, allowed_channels: a.allowed_channels, brand_rules: a.brand_rules,
      business_accepted_at: new Date().toISOString(), // the database replaces this with its own clock
    })
    .select("id, version")
    .single();
  if (error) return { error: friendlyError(error) };

  const { error: upErr } = await supabase.from("campaigns").update({ current_agreement_id: ag.id }).eq("id", a.campaign_id);
  if (upErr) return { error: friendlyError(upErr) };
  revalidatePath(`/business/campaigns/${a.campaign_id}`);
  return { ok: `Agreement version ${ag.version} accepted.` };
}

export async function setCampaignStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireRole("business");
  const parsed = z
    .object({ campaign_id: z.uuid(), status: z.enum(["published", "paused"]) })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Invalid request." };
  const { data, error } = await supabase
    .from("campaigns")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.campaign_id)
    .select("id");
  if (error) return { error: friendlyError(error) };
  if (!data?.length) return { error: "You don't have permission to do that." };
  revalidatePath(`/business/campaigns/${parsed.data.campaign_id}`);
  revalidatePath("/business");
  return { ok: parsed.data.status === "published" ? "Published! Promoters can see it now." : "Paused." };
}

// ---------------------------------------------------------------------------
// Bookings: money-changing, so they go through the server-only Postgres functions
// ---------------------------------------------------------------------------
type BookingFn = "verify_booking" | "simulate_end_of_refund_window" | "release_commission" | "refund_booking";

async function runBookingFunction(fd: FormData, fn: BookingFn, ok: string): Promise<ActionState> {
  const { user } = await requireRole("business");
  const id = z.uuid().safeParse(fd.get("booking_id"));
  if (!id.success) return { error: "Invalid booking." };
  const admin = createAdminClient();
  const { error } = await admin.rpc(fn, { p_booking_id: id.data, p_actor_id: user.id });
  if (error) return { error: friendlyError(error) };
  revalidatePath(`/business/bookings/${id.data}`);
  revalidatePath("/business/bookings");
  revalidatePath("/business");
  return { ok };
}

export async function verifyBooking(_: ActionState, fd: FormData) {
  return runBookingFunction(fd, "verify_booking", "Service verified. The commission is pending until the refund window ends.");
}

export async function simulateEndOfRefundWindow(_: ActionState, fd: FormData) {
  if (process.env.DEMO_MODE !== "true") return { error: "Demo Mode is off." };
  return runBookingFunction(fd, "simulate_end_of_refund_window", "Demo: refund window ended. The commission is now available.");
}

export async function releaseCommission(_: ActionState, fd: FormData) {
  return runBookingFunction(fd, "release_commission", "Commission released.");
}

export async function refundBooking(_: ActionState, fd: FormData) {
  return runBookingFunction(fd, "refund_booking", "Refunded. Any commission was reversed in the ledger.");
}

// ---------------------------------------------------------------------------
// Campaign photos (files are uploaded from the browser under RLS; this saves the list)
// ---------------------------------------------------------------------------
export async function setCampaignPhotos(campaignId: string, paths: string[]): Promise<ActionState> {
  const { supabase } = await requireRole("business");
  const id = z.uuid().safeParse(campaignId);
  if (!id.success) return { error: "Invalid campaign." };
  const pathRe = new RegExp(`^${id.data}/[a-z0-9-]+\.(webp|jpg|jpeg|png)$`);
  const parsed = z.array(z.string().regex(pathRe)).max(3, "Up to 3 photos per campaign").safeParse(paths);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid photos." };
  const { data, error } = await supabase.from("campaigns").update({ photo_paths: parsed.data }).eq("id", id.data).select("id");
  if (error) return { error: friendlyError(error) };
  if (!data?.length) return { error: "You don't have permission to do that." };
  revalidatePath(`/business/campaigns/${id.data}`);
  return { ok: "Photos saved." };
}
