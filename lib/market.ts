/**
 * Markets. Derived from the existing currency/country fields (no extra column):
 * Oslo = Norway/NOK, Mallorca = Spain/EUR. Default Oslo, so the stage demo is unchanged.
 * Money in different currencies is never added together.
 */
export const MARKETS = {
  oslo: { key: "oslo", label: "Oslo", currency: "NOK", country: "NO", place: "Oslo, Norway" },
  mallorca: { key: "mallorca", label: "Mallorca", currency: "EUR", country: "ES", place: "Mallorca, Spain" },
} as const;

export type MarketKey = keyof typeof MARKETS;
export type Market = (typeof MARKETS)[MarketKey];

export const MARKET_COOKIE = "promly_market";
export const DEFAULT_MARKET: MarketKey = "oslo";

export function parseMarket(value: string | undefined | null): MarketKey {
  return value === "mallorca" ? "mallorca" : DEFAULT_MARKET;
}

export function marketForCurrency(currency: string): MarketKey {
  return currency === "EUR" ? "mallorca" : "oslo";
}
