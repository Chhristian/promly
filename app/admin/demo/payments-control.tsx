"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createInvoicesNow,
  payTestInvoices,
  runPayoutsNow,
  simulateHoldingEnd,
  type PaymentsResult,
} from "./payments-actions";

const STEPS = [
  { label: "Simulate end of 14-day holding period", hint: "Verified demo bookings become Final.", run: simulateHoldingEnd },
  { label: "Create this month's invoices", hint: "One Stripe invoice per demo business, a line per booking.", run: createInvoicesNow },
  { label: "Pay test invoice", hint: "Stripe test card; the signed webhook marks it Paid by business.", run: payTestInvoices },
  { label: "Run payouts", hint: "Transfers commission from paid invoices to promoters' Stripe accounts.", run: runPayoutsNow },
] as const;

/** Test-mode buttons for the payments flow (Stripe test mode only). */
export function PaymentsControl() {
  const [busy, start] = useTransition();
  const [running, setRunning] = useState<string | null>(null);
  const [log, setLog] = useState<{ label: string; r: PaymentsResult } | null>(null);

  return (
    <section className="card space-y-4 p-5" data-testid="payments-control">
      <div>
        <h2 className="text-lg">Payments (Stripe test mode)</h2>
        <p className="text-sm text-muted-foreground">
          Run these in order after a booking is verified. Real Stripe test-mode objects; nothing is faked. Prepare Stage Demo
          clears demo invoices and payouts.
        </p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.label} className="rounded-xl border border-border p-3">
            <div className="text-xs font-semibold text-muted-foreground">Step {i + 1}</div>
            <Button
              className="mt-1 w-full"
              variant={i === 0 ? "default" : "secondary"}
              disabled={busy}
              onClick={() =>
                start(async () => {
                  setRunning(s.label);
                  setLog({ label: s.label, r: await s.run() });
                  setRunning(null);
                })
              }
            >
              {running === s.label ? "Working…" : s.label}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">{s.hint}</p>
          </li>
        ))}
      </ol>
      {log && (
        <div
          data-testid="payments-log"
          className={cn("rounded-lg border p-3 text-xs", log.r.ok ? "border-[hsl(155_50%_72%)]" : "border-destructive/40 bg-[hsl(0_80%_96%)]")}
        >
          <div className="mb-1 font-semibold">
            {log.r.ok ? "✓" : "✕"} {log.label} · {new Date(log.r.at).toLocaleTimeString("en-GB")}
          </div>
          <pre className="whitespace-pre-wrap font-mono text-muted-foreground">{log.r.lines.join("\n")}</pre>
        </div>
      )}
    </section>
  );
}
