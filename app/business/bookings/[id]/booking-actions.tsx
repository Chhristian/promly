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
    <section className="card space-y-4 border-2 border-ink p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl">Actions</h2>
        <div className="text-sm text-muted-foreground">
          Commission <span className="money text-foreground">{commission}</span>, you pay{" "}
          <span className="money text-foreground">{total}</span>
        </div>
      </div>
      <p className={`rounded-[10px] px-3.5 py-2.5 text-sm font-medium ${status === "verified" && released ? "bg-marker text-ink" : "bg-secondary"}`} role="status">
        {status === "pending" && "Waiting for the appointment. Verify once the service is done."}
        {status === "verified" && !released && "✓ Service verified. The commission is pending until the refund window ends."}
        {status === "verified" && released && "✓ Commission available to the promoter."}
        {status === "refunded" && "Refunded. Any commission was reversed."}
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
        <ActionForm action={simulateEndOfRefundWindow} className="rounded-2xl border border-dashed border-[hsl(40_80%_62%)] bg-pending-bg/60 p-4">
          {hidden}
          <div className="mb-2 text-sm font-semibold text-pending">Demo Mode · simulated</div>
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
          <SubmitButton variant="outline" pendingText="Refunding…" className="border-destructive/40 text-destructive hover:bg-[hsl(0_80%_96%)] hover:text-destructive">
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
