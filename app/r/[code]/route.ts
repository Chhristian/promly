import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GLANS_DEMO_PATH, demoModeOn, pointsToGlansDemo } from "@/lib/conversions";

const CODE = /^[a-z0-9]{10}$/;

/**
 * Referral link: log a visit (no personal data), then go to the booking page.
 * Demo Mode: a campaign whose external booking link is the Glans demo page goes
 * straight there with ?ref=<code>, skipping the details form, so the demo
 * checkout is the only place the customer leaves their phone number.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const target = new URL(`/book/${encodeURIComponent(code)}`, request.url);
  if (!CODE.test(code)) return NextResponse.redirect(target);

  // Skip obvious link-preview bots so "clicks" are people.
  const ua = request.headers.get("user-agent") ?? "";
  const isBot = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|slackbot|discordbot|telegrambot/i.test(ua);

  const admin = createAdminClient();
  const { data: link } = await admin.from("referral_links").select("id, campaigns(external_booking_url)").eq("code", code).maybeSingle();
  if (link && !isBot) await admin.from("referral_events").insert({ referral_link_id: link.id, type: "visit" });

  if (link && demoModeOn() && pointsToGlansDemo(link.campaigns?.external_booking_url, request.nextUrl.host)) {
    const glans = new URL(GLANS_DEMO_PATH, request.url);
    glans.searchParams.set("ref", code);
    return NextResponse.redirect(glans);
  }
  return NextResponse.redirect(target);
}
