/**
 * Payments end to end, Stripe TEST MODE (docs/PAYMENTS.md). Runs only with E2E_PAYMENTS=1
 * against a deployment that has PAYMENTS_ENABLED=true and receives Stripe webhooks
 * (for a protected preview: `stripe listen` forwarding to /api/stripe/webhook).
 *
 * verify → 14-day holding period ends (Demo Mode) → monthly invoice → Stripe test payment
 * → signed webhook marks it paid → payout run → promoter sees "Paid out".
 * Nothing is marked paid by the test: only Stripe's webhook does that.
 */
import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/database.types";
import { resetDemo } from "../../lib/demo-seed";
import { allowPreview } from "./preview-access";

test.skip(process.env.E2E_PAYMENTS !== "1", "Set E2E_PAYMENTS=1 to run the Stripe test-mode payments flow");
test.describe.configure({ mode: "serial" });

function adminDb() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function login(page: Page, prefix: string, landsOn: string) {
  await page.goto("/auth/login");
  await page.fill("#email", process.env[`${prefix}_EMAIL`]!);
  await page.fill("#password", process.env[`${prefix}_PASSWORD`]!);
  await page.click('button[type="submit"]');
  await page.waitForURL(`**${landsOn}`);
}

/** Click a Demo Control Center payments step and return its log text. */
async function runStep(admin: Page, label: string) {
  await admin.getByRole("button", { name: label }).click();
  const log = admin.getByTestId("payments-log");
  await expect(log).toContainText(label, { timeout: 60_000 });
  return (await log.innerText()).trim();
}

const NOK = (amount: string) => new RegExp(`${amount.replace(".", ",")}\\s*kr`);

test.beforeAll(async () => {
  await resetDemo(adminDb());
});
test.afterAll(async () => {
  await resetDemo(adminDb());
});

let promoterId = "";

test("verify → final → invoice → Stripe test payment → webhook marks it paid", async ({ browser }) => {
  const ctxs = await Promise.all([0, 1, 2, 3].map(() => browser.newContext({ viewport: { width: 1280, height: 900 } })));
  for (const c of ctxs) await allowPreview(c);
  const [biz, pro, cus, admin] = await Promise.all(ctxs.map((c) => c.newPage()));
  await login(biz, "DEMO_BUSINESS", "/business");
  await login(pro, "DEMO_PROMOTER", "/promoter");
  await login(admin, "DEMO_ADMIN", "/admin/demo");

  // Publish, join, book, verify (the normal stage flow, without the extras).
  await biz.getByRole("link", { name: /Premium Haircut/ }).first().click();
  await biz.waitForURL("**/business/campaigns/**");
  await biz.getByRole("button", { name: "Publish" }).click();
  await expect(biz.getByText("Published!")).toBeVisible();
  await pro.goto("/promoter/explore");
  await pro.getByRole("link", { name: /Premium Haircut/ }).first().click();
  await pro.check('input[name="accept"]');
  await pro.getByRole("button", { name: "Accept & join" }).click();
  await expect(pro.getByText("Your personal link")).toBeVisible();
  const link = (await pro.locator("code").first().innerText()).trim();
  await cus.goto(link);
  await cus.locator("button[aria-pressed]").first().click();
  await cus.fill("#customer_name", "Payments Customer");
  await cus.fill("#customer_phone", "+47 400 00 111");
  await cus.getByRole("button", { name: /^Book / }).click();
  await expect(cus.getByRole("heading", { name: "You're booked!" })).toBeVisible();
  await biz.goto("/business/bookings");
  await biz.getByRole("link").filter({ hasText: "Awaiting service" }).first().click();
  await biz.getByRole("button", { name: "Verify service completed" }).click();
  await expect(biz.getByText("✓ Service verified")).toBeVisible();

  // Promoter: Pending, final in 14 days.
  await pro.goto("/promoter/earnings");
  await expect(pro.getByTestId("earning-status").first()).toHaveText("Pending");

  // Demo Mode: the 14-day holding period ends → Final.
  await admin.goto("/admin/demo");
  expect(await runStep(admin, "Simulate end of 14-day holding period")).toMatch(/is now final/);
  await pro.reload();
  await expect(pro.getByTestId("earning-status").first()).toHaveText("Final");

  // Monthly invoice: one line, 100 commission + 13.75 fee = 113.75 kr.
  expect(await runStep(admin, "Create this month's invoices")).toMatch(/invoice created/);
  await biz.goto("/business/billing");
  const invoice = biz.getByTestId("invoice").first();
  await expect(invoice.getByTestId("invoice-status")).toHaveText("Open");
  await expect(invoice).toContainText(NOK("113.75"));
  await expect(invoice.getByRole("link", { name: /Pay on Stripe/ })).toHaveAttribute("href", /^https:\/\/invoice\.stripe\.com\//);
  await pro.reload();
  await expect(pro.getByTestId("earning-status").first()).toHaveText("Invoiced");

  // Stripe test payment; only the signed webhook marks it paid.
  expect(await runStep(admin, "Pay test invoice")).toMatch(/webhook confirmed: paid by business/);
  await biz.reload();
  await expect(biz.getByTestId("invoice").first().getByTestId("invoice-status")).toHaveText("Paid");
  await pro.reload();
  await expect(pro.getByTestId("earning-status").first()).toHaveText("Paid by business");

  const { data } = await adminDb().from("profiles").select("id").eq("is_demo", true).eq("role", "promoter").single();
  promoterId = data!.id;
  for (const c of ctxs) await c.close();
});

test("payout run → promoter sees Paid out", async ({ browser }) => {
  const { data: acct } = await adminDb().from("stripe_accounts").select("payouts_enabled").eq("profile_id", promoterId).maybeSingle();
  test.skip(!acct?.payouts_enabled, "The demo promoter has no payouts-enabled Stripe account yet (Stripe Connect setup needed, see docs/PAYMENTS.md)");

  const [adminCtx, proCtx] = await Promise.all([browser.newContext(), browser.newContext()]);
  for (const c of [adminCtx, proCtx]) await allowPreview(c);
  const admin = await adminCtx.newPage();
  const pro = await proCtx.newPage();
  await login(admin, "DEMO_ADMIN", "/admin/demo");
  await login(pro, "DEMO_PROMOTER", "/promoter");
  expect(await runStep(admin, "Run payouts")).toMatch(/paid out 100,00\s*kr/);
  await pro.goto("/promoter/earnings");
  await expect(pro.getByTestId("earning-status").first()).toHaveText("Paid out");
  await expect(pro.getByTestId("paid-out-total")).toContainText(NOK("100.00"));
  // No double payout: a second run pays nothing more.
  expect(await runStep(admin, "Run payouts")).not.toMatch(/paid out/);
});
