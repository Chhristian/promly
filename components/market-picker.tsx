"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MARKETS, MARKET_COOKIE, type MarketKey } from "@/lib/market";
import { cn } from "@/lib/utils";

/** Remember the market for a year. */
export function rememberMarket(key: MarketKey) {
  document.cookie = `${MARKET_COOKIE}=${key}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/** One button that switches to a given market. */
export function SwitchMarketButton({ to, children }: { to: MarketKey; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        rememberMarket(to);
        start(() => router.refresh());
      }}
      className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
    >
      {children}
    </button>
  );
}

/** Oslo (NOK) / Mallorca (EUR). Explore, campaign lists and dashboards follow the choice. */
export function MarketPicker({ current, className }: { current: MarketKey; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div
      role="group"
      aria-label="Market"
      data-testid="market-picker"
      className={cn("inline-flex rounded-full bg-secondary p-0.5 text-xs font-semibold", pending && "opacity-70", className)}
    >
      {(Object.keys(MARKETS) as MarketKey[]).map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={current === k}
          onClick={() => {
            if (k === current) return;
            rememberMarket(k);
            start(() => router.refresh());
          }}
          className={cn(
            "rounded-full px-2.5 py-1 transition",
            current === k ? "bg-ink text-white" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {MARKETS[k].label} · {MARKETS[k].currency}
        </button>
      ))}
    </div>
  );
}
