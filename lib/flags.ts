/** Payments and settlement (docs/PAYMENTS.md). Off unless PAYMENTS_ENABLED=true. */
export function paymentsEnabled(): boolean {
  return process.env.PAYMENTS_ENABLED === "true";
}
