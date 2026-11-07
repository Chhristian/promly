import { z } from "zod";
import { CalendarCheck, CheckCircle2, CreditCard, MapPin } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMinor, type Currency } from "@/lib/money";
import { formatSlot } from "@/lib/format";
import { PromlyMark, PromlyWordmark } from "@/components/promly-logo";

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
    <div className="mx-auto min-h-screen max-w-md px-3 py-6 sm:py-10">
      <div className="card overflow-hidden text-center">
        <div className="bg-[hsl(155_60%_94%)] px-6 pb-2 pt-8">
          <CheckCircle2 className="mx-auto h-16 w-16 text-paid" strokeWidth={1.6} />
          <h1 className="mt-4 text-3xl font-bold tracking-tight">You&apos;re booked!</h1>
        </div>
        {details ? (
          <div className="space-y-4 px-6 pb-8 pt-4">
            <div>
              <div className="text-xl font-semibold">{details.service}</div>
              <div className="mt-0.5 flex items-center justify-center gap-1 text-muted-foreground">
                {details.business} · <MapPin className="h-3.5 w-3.5" /> {details.city}
              </div>
            </div>
            <div className="mx-auto flex max-w-xs items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-[hsl(232_90%_96%)] px-4 py-3 text-xl font-bold">
              <CalendarCheck className="h-5 w-5 text-primary" /> {details.slot}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" /> Pay {details.price} at your appointment.
            </div>
            <p className="text-sm text-muted-foreground">{details.business} has your booking and will see you then.</p>
          </div>
        ) : (
          <p className="px-6 pb-8 pt-3 text-sm text-muted-foreground">Your booking was received.</p>
        )}
      </div>
      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        Booking by <PromlyMark className="h-4 w-4" /> <PromlyWordmark className="text-sm" />
      </div>
    </div>
  );
}
