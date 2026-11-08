import { ArrowRight } from "lucide-react";
import { formatMinor, type Currency } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { Stat } from "@/components/stat";
import { MoneyPulse } from "@/components/live";

type Earnings = Partial<Record<Currency, { available: number; pending: number }>>;

/**
 * Top of the promoter dashboard: one ink slip with the hero figure (the only yellow),
 * three equal cards, and the funnel. Display only: every number comes in ready-made.
 * It's one <section> with labels before amounts (the e2e test reads it as text).
 */
export function EarningsSummary({
  earnings,
  currencies,
  nextPayout,
  pendingHint,
  clicks,
  bookings,
  verified,
}: {
  earnings: Earnings;
  currencies: Currency[];
  /** Next payout date among commissions that are already available. */
  nextPayout?: string;
  pendingHint: string;
  clicks: number;
  bookings: number;
  verified: number;
}) {
  const multi = currencies.length > 1;
  const amount = (cur: Currency, key: "available" | "pending" | "total") => {
    const e = earnings[cur];
    const v = key === "total" ? (e?.available ?? 0) + (e?.pending ?? 0) : (e?.[key] ?? 0);
    return formatMinor(v, cur);
  };
  // Several currencies: one line per currency in each figure.
  const perCurrency = (key: "available" | "pending" | "total") =>
    multi ? (
      <span className="flex flex-col">{currencies.map((cur) => <span key={cur}>{amount(cur, key)}</span>)}</span>
    ) : (
      amount(currencies[0], key)
    );
  const funnel = [
    { label: "Link clicks", value: clicks },
    { label: "Bookings", value: bookings },
    { label: "Verified", value: verified },
  ];

  return (
    <section className="space-y-3" aria-label="Your earnings">
      <MoneyPulse>
        <div className="slip grid gap-4 p-5 sm:px-7 sm:py-5 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10">
          <div className="space-y-4">
          {currencies.map((cur) => {
            const available = earnings[cur]?.available ?? 0;
            const pending = earnings[cur]?.pending ?? 0;
            const total = available + pending;
            return (
              <Stat
                key={cur}
                onSlip
                size="lead"
                label={`You've earned${multi ? ` (${cur})` : ""}`}
                value={formatMinor(total, cur)}
                mark={total > 0}
                hint={
                  pending > 0 && available === 0
                    ? `${formatMinor(pending, cur)} on its way – paid out after the refund window`
                    : nextPayout && available > 0
                      ? `${formatMinor(available, cur)} available, paid out ${formatDate(nextPayout)}`
                      : `${formatMinor(available, cur)} available`
                }
              />
            );
          })}
          </div>

          {/* The funnel shares the slip (right side on desktop), so the Commissions list starts above the fold. */}
          <ol
            className="flex items-stretch border-t border-white/15 pt-4 lg:min-w-[22rem] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
            aria-label="From click to commission"
          >
            {funnel.map((step, i) => (
              <li key={step.label} className="flex min-w-0 flex-1 items-center">
                {i > 0 && <ArrowRight className="h-4 w-4 shrink-0 text-white/40" aria-hidden />}
                <div className="min-w-0 flex-1 px-2 text-center">
                  <div className="money text-2xl sm:text-3xl">{step.value}</div>
                  <div className="truncate text-sm text-white/65">{step.label}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </MoneyPulse>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          className="card h-full p-5"
          label="Available"
          value={perCurrency("available")}
          hint={nextPayout ? `Paid out ${formatDate(nextPayout)}` : "Ready to be paid out"}
        />
        <Stat className="card h-full p-5" label="Pending" value={perCurrency("pending")} hint={pendingHint} />
        <Stat className="card h-full p-5" label="Total earned" value={perCurrency("total")} hint="Available and pending together" />
      </div>
    </section>
  );
}
