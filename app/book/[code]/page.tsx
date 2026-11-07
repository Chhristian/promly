import type { Metadata } from "next";
import { getBookingPageData } from "@/lib/booking-data";
import { formatMinor, type Currency } from "@/lib/money";
import { dayKey } from "@/lib/format";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = { title: "Book — Promly" };

export default async function BookPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const data = await getBookingPageData(code);

  if (!data) {
    return (
      <Shell>
        <h1 className="text-xl font-bold">This link doesn&apos;t work</h1>
        <p className="mt-2 text-sm text-muted-foreground">Check the link you were sent, or ask the person who shared it.</p>
      </Shell>
    );
  }

  const { campaign, business, freeSlots } = data;
  const cur = campaign.currency as Currency;

  // Group free slots by day (Oslo time)
  const days = new Map<string, { startsAt: string; minutes: number }[]>();
  for (const s of freeSlots) {
    const k = dayKey(s.startsAt);
    days.set(k, [...(days.get(k) ?? []), s]);
  }

  return (
    <Shell>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {business.name} · {business.city}
      </div>
      <h1 className="mt-1 text-2xl font-bold">{campaign.serviceName}</h1>
      <div className="text-gradient mt-1 text-3xl font-bold">{formatMinor(campaign.priceMinor, cur)}</div>
      {campaign.description && <p className="mt-3 text-sm text-muted-foreground">{campaign.description}</p>}

      {!campaign.open ? (
        <p className="mt-6 rounded-xl border border-border p-4 text-sm text-muted-foreground">
          This offer isn&apos;t taking bookings right now.
        </p>
      ) : freeSlots.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border p-4 text-sm text-muted-foreground">No free times right now. Please check back soon.</p>
      ) : (
        <BookingForm code={code} days={[...days.entries()].map(([day, slots]) => ({ day, slots: slots.map((s) => s.startsAt) }))} />
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        You pay {business.name} at your appointment. Booking via Promly is free.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md px-4 py-6">
      <div className="mb-6 text-sm font-bold">
        Prom<span className="text-gradient">ly</span>
      </div>
      <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-xl shadow-violet-950/40">{children}</div>
    </div>
  );
}
