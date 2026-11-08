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
        <div className="slip space-y-5 p-6 sm:px-8 sm:py-7">
          {currencies.map((cur) => {
            const available = earnings[cur]?.available ?? 0;
            const total = available + (earnings[cur]?.pending ?? 0);
            return (
              <Stat
                key={cur}
                onSlip
                size="hero"
                label={`You've earned${multi ? ` (${cur})` : ""}`}
                value={formatMinor(total, cur)}
                mark={total > 0}
                hint={
                  nextPayout && available > 0
                    ? `${formatMinor(available, cur)} available, paid out ${formatDate(nextPayout)}`
                    : `${formatMinor(available, cur)} available`
                }
              />
            );
          })}
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

      <ol className="card flex items-stretch p-2 sm:p-3" aria-label="From click to commission">
        {funnel.map((step, i) => (
          <li key={step.label} className="flex min-w-0 flex-1 items-center">
            {i > 0 && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
            <div className="min-w-0 flex-1 px-2 py-1.5 text-center sm:px-4">
              <div className="money text-2xl sm:text-3xl">{step.value}</div>
              <div className="truncate text-sm text-muted-foreground">{step.label}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
