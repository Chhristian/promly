"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";
import { refundBooking, releaseCommission, simulateEndOfRefundWindow, verifyBooking } from "../../actions";

export function BookingActions({
  bookingId,
  status,
  released,
  windowOver,
  beforePayout,
  demoMode,
  commission,
  total,
}: {
  bookingId: string;
  status: string;
  released: boolean;
  windowOver: boolean;
  beforePayout: boolean;
  demoMode: boolean;
  commission: string;
  total: string;
}) {
  const hidden = <input type="hidden" name="booking_id" value={bookingId} />;
  const canRefund = status === "pending" || (status === "verified" && beforePayout);

  return (
    <section className="card space-y-4 border-violet-400/30 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Actions</h2>
        <div className="text-sm text-muted-foreground">
          Commission <span className="whitespace-nowrap font-semibold text-foreground">{commission}</span> · You pay{" "}
          <span className="whitespace-nowrap font-semibold text-foreground">{total}</span>
        </div>
      </div>
      <p className="rounded-lg bg-secondary/60 px-3 py-2 text-sm" role="status">
        {status === "pending" && "Waiting for the appointment. Verify once the service is done."}
        {status === "verified" && !released && "✓ Service verified — commission pending until the refund window ends."}
        {status === "verified" && released && "✓ Commission available to the promoter."}
        {status === "refunded" && "Refunded — any commission was reversed."}
        {status === "cancelled" && "Cancelled."}
      </p>

      {status === "pending" && (
        <ActionForm action={verifyBooking}>
          {hidden}
          <SubmitButton pendingText="Verifying…" className="h-12 w-full px-6 text-base sm:w-auto">Verify service completed</SubmitButton>
          <p className="mt-1 text-xs text-muted-foreground">Confirm the customer came and the service was done.</p>
        </ActionForm>
      )}

      {status === "verified" && !released && demoMode && (
        <ActionForm action={simulateEndOfRefundWindow} className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-3">
          {hidden}
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">Demo Mode · simulated</div>
          <SubmitButton pendingText="Simulating…" className="h-12 w-full px-6 text-base sm:w-auto">Simulate end of refund window</SubmitButton>
          <p className="mt-1 text-xs text-muted-foreground">
            Skips the waiting time so the commission becomes available now. No real money moves.
          </p>
        </ActionForm>
      )}

      {status === "verified" && !released && windowOver && (
        <ActionForm action={releaseCommission}>
          {hidden}
          <SubmitButton variant="secondary">Release commission</SubmitButton>
        </ActionForm>
      )}

      {status === "verified" && !released && !windowOver && !demoMode && (
        <p className="text-sm text-muted-foreground">The commission becomes available when the refund window ends.</p>
      )}

      {canRefund && (
        <ActionForm action={refundBooking}>
          {hidden}
          <SubmitButton variant="outline" pendingText="Refunding…" className="border-red-500/50 text-red-300 hover:bg-red-500/10 hover:text-red-200">
            {status === "pending" ? "Cancel / refund booking" : "Refund"}
          </SubmitButton>
          <p className="mt-1 text-xs text-muted-foreground">
            {status === "pending" ? "No commission has been earned yet." : "Adds reversal entries to the ledger. The commission is cancelled."}
          </p>
        </ActionForm>
      )}

      {(status === "refunded" || status === "cancelled") && <p className="text-sm text-muted-foreground">No further actions.</p>}
      {status === "verified" && released && !beforePayout && <p className="text-sm text-muted-foreground">Paid out.</p>}
    </section>
  );
}
