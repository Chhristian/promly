/**
 * The payments, age and access rules as the DATABASE enforces them: every Supabase
 * migration is replayed on PGlite (real Postgres in WASM, in memory, nothing hosted is
 * touched), then the server-only functions and RLS are exercised directly.
 */
import { beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import { runDbChecks } from "./payments-db.harness.mjs";

type Check = { section: string; name: string; pass: boolean; detail: string };
let checks: Check[] = [];

beforeAll(async () => {
  checks = await runDbChecks(path.join(process.cwd(), "supabase/migrations"));
}, 180_000);

/** Assert that a named database check ran and passed. */
function expectCheck(name: string) {
  const c = checks.find((x) => x.name === name);
  expect(c, `database check not found: ${name}`).toBeDefined();
  expect(c!.pass, `${c!.section} › ${c!.name} ${c!.detail}`).toBe(true);
}

describe("payments in the database (PGlite replay of all migrations)", () => {
  it("every migration applies, and the old stage-demo functions behave as before", () => {
    for (const c of checks.filter((x) => x.section === "Migrations" || x.section.startsWith("Backward"))) expectCheck(c.name);
    expect(checks.filter((x) => x.section === "Migrations").length).toBeGreaterThanOrEqual(8);
  });

  it("invoice total 113.75 kr: 100 commission + 13.75 fee, one line", () => {
    expectCheck("500 kr booking, 100 kr commission -> fee 13.75, total 113.75");
    expectCheck("invoice: one line, total 113.75 kr (100 commission + 13.75 fee)");
  });

  it("the 14-day boundary", () => {
    expectCheck("13 days 23:59 after verify: not final yet");
    expectCheck("exactly 14 days after verify: becomes final");
  });

  it("refund before the 14 days reverses commission and fee; after, it's refused", () => {
    expectCheck("refund inside 14 days works");
    expectCheck("refund reverses commission AND fee (all accounts back to 0) with new rows");
    expectCheck("refund after 14 days is refused");
  });

  it("unpaid invoice → no payout", () => {
    expectCheck("invoice open (unpaid) -> no payout");
    expectCheck("overdue (unpaid) -> no payout");
    expectCheck("payout = the 100 kr commission only (Promly keeps the fee)");
  });

  it("no double payout", () => {
    expectCheck("no double payout");
    expectCheck("database itself refuses a second payout item for the same booking");
    expectCheck("pending payout is returned for retry, not duplicated");
  });

  it("under-18: own payout account blocked, guardian required, 18+ campaigns hidden", () => {
    expectCheck("16-17 promoter can't use their own account");
    expectCheck("18+ promoter must use their own Stripe account");
    expectCheck("16-17 can't join an 18+ campaign, even with a guardian (join trigger)");
    expectCheck("16-17 promoter can't see an 18+ campaign (RLS)");
  });

  it("fraud clawback credits only money Promly received or recovered", () => {
    expectCheck("paid-out booking clawed back: fee (-13.75) credited at once");
    expectCheck("after the payout that recovered it: commission (-100) credited");
    expectCheck("invoice that charged it is unpaid: no credit yet");
  });

  it("agreement PDFs: same campaign only, frozen once accepted, hash recorded on join, private to the right people", () => {
    for (const c of checks.filter((x) => x.section === "Agreement PDFs")) expectCheck(c.name);
    expect(checks.filter((x) => x.section === "Agreement PDFs").length).toBeGreaterThanOrEqual(15);
  });

  it(`all database checks pass`, () => {
    const failed = checks.filter((c) => !c.pass);
    expect(failed.map((c) => `${c.section} › ${c.name} ${c.detail}`)).toEqual([]);
    expect(checks.length).toBeGreaterThan(100);
  });
});
