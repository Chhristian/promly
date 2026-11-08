import "server-only";

import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Server-side Stripe client. TEST MODE ONLY: a live key is refused, so a
 * misconfigured environment can never move real money.
 */
export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!/^(sk|rk)_test_/.test(key)) throw new Error("Only Stripe test keys are allowed");
  client = new Stripe(key, { appInfo: { name: "Promly" }, maxNetworkRetries: 2 });
  return client;
}
