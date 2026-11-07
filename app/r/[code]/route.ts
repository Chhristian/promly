import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CODE = /^[a-z0-9]{10}$/;

/** Referral link: log a visit (no personal data), then go to the booking page. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const target = new URL(`/book/${encodeURIComponent(code)}`, request.url);
  if (!CODE.test(code)) return NextResponse.redirect(target);

  // Skip obvious link-preview bots so "clicks" are people.
  const ua = request.headers.get("user-agent") ?? "";
  const isBot = /bot|crawler|spider|preview|facebookexternalhit|whatsapp|slackbot|discordbot|telegrambot/i.test(ua);

  if (!isBot) {
    const admin = createAdminClient();
    const { data: link } = await admin.from("referral_links").select("id").eq("code", code).maybeSingle();
    if (link) await admin.from("referral_events").insert({ referral_link_id: link.id, type: "visit" });
  }
  return NextResponse.redirect(target);
}
