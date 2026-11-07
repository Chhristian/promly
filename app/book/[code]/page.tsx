import type { Metadata } from "next";
import { CreditCard, Link2Off, Lock, MapPin, UserRoundX } from "lucide-react";
import { getBookingPageData } from "@/lib/booking-data";
import { formatMinor, type Currency } from "@/lib/money";
import { dayKey } from "@/lib/format";
import { CampaignCover } from "@/components/campaign-cover";
import { PromlyMark, PromlyWordmark } from "@/components/promly-logo";
import { BookingForm } from "./booking-form";
import { ExternalReferralForm } from "./external-form";

export const metadata: Metadata = { title: "Book — Promly" };

export default async function BookPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const data = await getBookingPageData(code);

  if (!data) {
    return (
      <Shell>
        <div className="p-8 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <Link2Off className="h-6 w-6" />
          </div>
          <h1 className="text-xl">This link doesn&apos;t work</h1>
          <p className="mt-2 text-sm text-muted-foreground">Check the link you were sent, or ask the person who shared it.</p>
        </div>
      </Shell>
    );
  }

  const { campaign, business, freeSlots, coverUrl } = data;
  const cur = campaign.currency as Currency;

  const days = new Map<string, { startsAt: string; minutes: number }[]>();
  for (const s of freeSlots) {
    const k = dayKey(s.startsAt);
    days.set(k, [...(days.get(k) ?? []), s]);
  }

  return (
    <Shell>
      <div className="relative m-2 h-48 overflow-hidden rounded-[1.25rem]">
        <CampaignCover category={business.category} imageUrl={coverUrl} size="lg" />
      </div>
      <div className="px-5 pb-6">
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="relative rounded-full border border-border bg-card px-3 py-1 font-semibold text-foreground">{business.name}</span>
          <span className="relative flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {business.city}</span>
        </div>
        <h1 className="mt-3 text-[2rem]">{campaign.serviceName}</h1>
        <div className="money mt-2 text-4xl">{formatMinor(campaign.priceMinor, cur)}</div>
        {campaign.description && <p className="mt-3 leading-relaxed text-muted-foreground">{campaign.description}</p>}

        <ul className="mt-5 grid gap-2 text-sm">
          <li className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 shrink-0 text-paid" />
            {campaign.external ? `Nothing to pay here, you book and pay with ${business.name}` : "Pay at the appointment, nothing to pay now"}
          </li>
          <li className="flex items-center gap-2"><UserRoundX className="h-4 w-4 shrink-0 text-paid" /> No account needed</li>
          <li className="flex items-center gap-2"><Lock className="h-4 w-4 shrink-0 text-paid" /> Your details go only to {business.name}</li>
        </ul>

        {!campaign.open ? (
          <p className="mt-6 rounded-2xl border border-dashed border-input p-4 text-sm text-muted-foreground">This offer isn&apos;t taking bookings right now.</p>
        ) : campaign.external ? (
          <ExternalReferralForm code={code} businessName={business.name} />
        ) : freeSlots.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-input p-4 text-sm text-muted-foreground">No free times right now. Please check back soon.</p>
        ) : (
          <BookingForm code={code} days={[...days.entries()].map(([day, slots]) => ({ day, slots: slots.map((s) => s.startsAt) }))} />
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md px-3 py-4 sm:py-8">
      <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card">{children}</div>
      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        Booking by <PromlyMark className="h-4 w-4" /> <PromlyWordmark className="text-sm" />
      </div>
    </div>
  );
}
