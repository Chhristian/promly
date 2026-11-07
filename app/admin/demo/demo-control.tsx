"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Check } from "@/lib/demo-seed";
import { prepareStageDemo, runHealthCheck } from "./actions";

/** Real browser-side realtime check: subscribe like the dashboards do and time it. */
async function checkRealtime(): Promise<Check> {
  const name = "Realtime connects (from this browser)";
  const supabase = createClient();
  const t0 = performance.now();
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) await supabase.realtime.setAuth(data.session.access_token);
    const status = await new Promise<string>((resolve) => {
      const timer = setTimeout(() => resolve("TIMED_OUT (10 s)"), 10_000);
      const ch = supabase
        .channel(`health-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => {})
        .subscribe((s) => {
          if (s === "SUBSCRIBED" || s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
            clearTimeout(timer);
            resolve(s);
            supabase.removeChannel(ch);
          }
        });
    });
    const ms = Math.round(performance.now() - t0);
    return { name, ok: status === "SUBSCRIBED", detail: status === "SUBSCRIBED" ? `subscribed in ${ms} ms` : `status ${status}` };
  } catch (e) {
    return { name, ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

function Result({ c }: { c: Check }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-3 text-sm", c.ok ? "border-[hsl(155_50%_72%)] bg-[hsl(155_60%_96%)]" : "border-destructive/40 bg-[hsl(0_80%_96%)]")}>
      <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold", c.ok ? "bg-paid text-white" : "bg-destructive text-white")}>
        {c.ok ? "✓" : "✕"}
      </span>
      <div>
        <div className="font-medium">{c.name}</div>
        <div className="text-muted-foreground">{c.detail}</div>
      </div>
    </div>
  );
}

export function DemoControl() {
  const [resetResult, setResetResult] = useState<{ ok: boolean; lines: string[]; at: string } | null>(null);
  const [checks, setChecks] = useState<{ list: Check[]; at: string } | null>(null);
  const [resetting, startReset] = useTransition();
  const [checking, startCheck] = useTransition();

  const allOk = checks?.list.every((c) => c.ok);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-3 card p-5">
        <h2 className="text-lg">Prepare Stage Demo</h2>
        <p className="text-sm text-muted-foreground">
          Deletes <strong>only demo data</strong> (bookings, ledger rows, joins, notifications, campaigns of demo businesses) and
          creates it fresh: both campaigns as drafts with accepted agreements, no bookings, new time slots. Accounts and
          passwords stay the same. Real (non-demo) data is never touched.
        </p>
        <Button
          
          disabled={resetting}
          onClick={() => startReset(async () => setResetResult(await prepareStageDemo()))}
        >
          {resetting ? "Preparing…" : "Prepare Stage Demo"}
        </Button>
        {resetResult && (
          <div className={cn("rounded-lg border p-3 text-xs", resetResult.ok ? "border-[hsl(155_50%_72%)]" : "border-destructive/40 bg-[hsl(0_80%_96%)]")}>
            <div className="mb-1 font-semibold">
              {resetResult.ok ? "✓ Demo ready" : "✕ Reset failed"} · {new Date(resetResult.at).toLocaleTimeString("en-GB")}
            </div>
            <pre className="whitespace-pre-wrap font-mono text-muted-foreground">{resetResult.lines.join("\n")}</pre>
          </div>
        )}
      </section>

      <section className="space-y-3 card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg">Run Demo Health Check</h2>
          {checks && (
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", allOk ? "bg-[hsl(155_60%_92%)] text-paid" : "bg-[hsl(0_80%_96%)] text-destructive")}>
              {allOk ? "All green" : `${checks.list.filter((c) => !c.ok).length} problem(s)`}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Every check really runs now. Nothing is cached or assumed.</p>
        <Button
          variant="secondary"
          disabled={checking}
          onClick={() =>
            startCheck(async () => {
              const [server, realtime] = await Promise.all([runHealthCheck(), checkRealtime()]);
              const list = [...server.checks];
              list.splice(2, 0, realtime); // show realtime after accounts
              setChecks({ list, at: server.at });
            })
          }
        >
          {checking ? "Checking…" : "Run Demo Health Check"}
        </Button>
        {checks && (
          <div className="space-y-2" data-testid="health-results">
            {checks.list.map((c) => (
              <Result key={c.name} c={c} />
            ))}
            <p className="text-xs text-muted-foreground">Checked at {new Date(checks.at).toLocaleTimeString("en-GB")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
