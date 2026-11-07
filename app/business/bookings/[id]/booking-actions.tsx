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
}: {
  bookingId: string;
  status: string;
  released: boolean;
  windowOver: boolean;
  beforePayout: boolean;
  demoMode: boolean;
}) {
  const hidden = <input type="hidden" name="booking_id" value={bookingId} />;
  const canRefund = status === "pending" || (status === "verified" && beforePayout);

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card/70 p-4">
      <h2 className="font-semibold">Actions</h2>

      {status === "pending" && (
        <ActionForm action={verifyBooking}>
          {hidden}
          <SubmitButton pendingText="Verifying…" className="w-full sm:w-auto">Verify service completed</SubmitButton>
          <p className="mt-1 text-xs text-muted-foreground">Confirm the customer came and the service was done.</p>
        </ActionForm>
      )}

      {status === "verified" && !released && demoMode && (
        <ActionForm action={simulateEndOfRefundWindow} className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 p-3">
          {hidden}
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">Demo Mode · simulated</div>
          <SubmitButton pendingText="Simulating…" className="w-full sm:w-auto">Simulate end of refund window</SubmitButton>
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
          <SubmitButton variant="destructive" pendingText="Refunding…">
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
