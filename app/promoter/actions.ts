"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import type { ActionState } from "@/components/action-form";

const joinSchema = z.object({
  campaign_id: z.uuid(),
  agreement_id: z.uuid(),
  accept: z.literal("on", { message: "Tick the box to accept the agreement" }),
});

/** Join a published campaign by accepting the agreement version the promoter was shown. */
export async function joinCampaign(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user, supabase } = await requireRole("promoter");
  const parsed = joinSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid request." };

  // RLS only allows joining a published campaign with its CURRENT agreement,
  // and the database records the acceptance time and creates the referral link.
  const { error } = await supabase.from("campaign_memberships").insert({
    campaign_id: parsed.data.campaign_id,
    promoter_id: user.id,
    agreement_id: parsed.data.agreement_id,
  });
  if (error) {
    if (error.code === "23505") return { ok: "You've already joined this campaign." };
    if (error.code === "42501") return { error: "The terms changed or the campaign was paused. Reload to see the latest agreement." };
    return { error: friendlyError(error) };
  }
  revalidatePath(`/promoter/campaigns/${parsed.data.campaign_id}`);
  revalidatePath("/promoter");
  revalidatePath("/promoter/explore");
  return { ok: "You've joined! Your personal link is ready." };
}
