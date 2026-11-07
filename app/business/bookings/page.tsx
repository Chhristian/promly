import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getMyBusiness } from "@/lib/business-data";
import { formatMinor, type Currency } from "@/lib/money";
import { formatDate, formatDateTime, formatSlot } from "@/lib/format";
import { StatusBadge, bookingStage } from "@/components/stat";
import { Highlight } from "@/components/live";
import { EmptyState } from "@/components/empty-state";
import { CalendarDays } from "lucide-react";

export default async function BookingsPage() {
  const { user, supabase } = await requireRole("business");
  const business = await getMyBusiness(supabase, user.id);
  const { data: bookings } = business
    ? await supabase
        .from("bookings")
        .select("*, campaigns(service_name), profiles(display_name)")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  const cur = (business?.currency ?? "NOK") as Currency;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
      {!bookings?.length && (
        <EmptyState icon={CalendarDays} title="No bookings yet" body="When a customer books through a promoter's link, it shows up here instantly." />
      )}
      <div className="space-y-2">
        {bookings?.map((b) => {
          const stage = bookingStage(b);
          return (
            <Highlight key={b.id} ids={[b.id]}>
            <Link
              href={`/business/bookings/${b.id}`}
              className="grid gap-2 card p-4 hover:border-primary/60 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div>
                <div className="line-clamp-2 font-medium">{b.campaigns?.service_name}</div>
                <div className="font-medium tabular-nums">{formatSlot(b.slot_start)}</div>
                <div className="text-sm text-muted-foreground">
                  via {b.profiles?.display_name || "promoter"} · booked {formatDateTime(b.created_at)} · commission{" "}
                  {formatMinor(b.commission_minor, cur)}
                  {b.payout_at && b.status === "verified" ? ` · payout ${formatDate(b.payout_at)}` : ""}
                </div>
              </div>
              <span className="justify-self-start sm:justify-self-end">
                <StatusBadge status={stage.key} label={stage.label} />
              </span>
            </Link>
            </Highlight>
          );
        })}
      </div>
    </div>
  );
}
