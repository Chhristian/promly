import "server-only";

import { cookies } from "next/headers";
import { MARKETS, MARKET_COOKIE, parseMarket, type Market } from "./market";

/** The market the visitor chose (cookie), default Oslo. */
export async function getMarket(): Promise<Market> {
  const jar = await cookies();
  return MARKETS[parseMarket(jar.get(MARKET_COOKIE)?.value)];
}
