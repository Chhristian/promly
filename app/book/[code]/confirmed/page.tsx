import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMinor, type Currency } from "@/lib/money";
import { formatSlot } from "@/lib/format";

export default async function ConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ booking?: string }>;
}) {
  const { code } = await params;
  const { booking } = await searchParams;
  const id = z.uuid().safeParse(booking);

  let details: { service: string; business: string; city: string; slot: string; price: string } | null = null;
  if (id.success) {
    const admin = createAdminClient();
    // Only show the booking if it belongs to this referral link.
    const { data } = await admin
      .from("bookings")
      .select("slot_start, price_minor, currency, campaigns(service_name), businesses(name, city), referral_links!inner(code)")
      .eq("id", id.data)
      .eq("referral_links.code", code)
      .maybeSingle();
    if (data) {
      details = {
        service: data.campaigns?.service_name ?? "",
        business: data.businesses?.name ?? "",
        city: data.businesses?.city ?? "",
        slot: formatSlot(data.slot_start),
        price: formatMinor(data.price_minor, data.currency as Currency),
      };
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 py-6">
      <div className="mb-6 text-sm font-bold">
        Prom<span className="text-gradient">ly</span>
      </div>
      <div className="rounded-2xl border border-emerald-500/40 bg-card/80 p-6 text-center shadow-xl shadow-violet-950/40">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-2xl">✓</div>
        <h1 className="mt-4 text-2xl font-bold">You&apos;re booked!</h1>
        {details ? (
          <div className="mt-4 space-y-1 text-sm">
            <div className="text-lg font-semibold">{details.service}</div>
            <div className="text-muted-foreground">
              {details.business}, {details.city}
            </div>
            <div className="text-gradient pt-2 text-xl font-bold">{details.slot}</div>
            <div className="pt-2 text-muted-foreground">Pay {details.price} at your appointment.</div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Your booking was received.</p>
        )}
      </div>
    </div>
  );
}
