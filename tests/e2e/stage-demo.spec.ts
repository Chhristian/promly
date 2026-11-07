/**
 * End-to-end test of the stage demo on the live site (npm run test:e2e).
 *
 * Three separate browsers: business founder, promoter founder, customer (phone).
 * Every "appears live" assertion waits WITHOUT reloading the page, so it only
 * passes if realtime works. The demo is reset before and after.
 */
import { test, expect, devices, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/database.types";
import { resetDemo } from "../../lib/demo-seed";

const NOK = (amount: string) => new RegExp(`${amount.replace(".", ",")}\\s*kr`); // "100,00 kr"

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env in .env.local");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function login(page: Page, prefix: string, landsOn: string) {
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) throw new Error(`${prefix}_EMAIL / ${prefix}_PASSWORD missing in .env.local (run npm run seed-demo)`);
  await page.goto("/auth/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`**${landsOn}`);
}

/** Wait until the live status dot says "Live" so we don't miss early events. */
async function waitForLive(page: Page) {
  await expect(page.locator("header").getByText("Live", { exact: true })).toBeVisible({ timeout: 15_000 });
}

/** Text of the top stats section (labels are uppercase via CSS, so match case-insensitively). */
const stats = (page: Page) => page.locator("main section").first();

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await resetDemo(adminDb());
});

test.afterAll(async () => {
  await resetDemo(adminDb());
});

test("demo health check is all green", async ({ page }) => {
  await login(page, "DEMO_ADMIN", "/admin/demo");
  await page.getByRole("button", { name: "Run Demo Health Check" }).click();
  const results = page.getByTestId("health-results");
  await expect(results).toBeVisible({ timeout: 30_000 });
  for (const name of [
    "Database reachable",
    "All 4 demo accounts exist",
    "Realtime connects (from this browser)",
    "Fee maths: 500 NOK → 13.75 NOK",
    "Free time slots today and tomorrow",
    "Live site responding",
  ]) {
    await expect(results.getByText(name)).toBeVisible();
  }
  await expect(page.getByText("All green")).toBeVisible();
});

test("stage flow: publish → join → book → verify → commission appears live", async ({ browser }) => {
  const bizCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const proCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const cusCtx = await browser.newContext({ ...devices["iPhone 13"] });
  const biz = await bizCtx.newPage();
  const pro = await proCtx.newPage();
  const cus = await cusCtx.newPage();

  // Both founders log in.
  await login(biz, "DEMO_BUSINESS", "/business");
  await login(pro, "DEMO_PROMOTER", "/promoter");

  // Promoter watches Explore. The draft campaign isn't visible yet.
  await pro.goto("/promoter/explore");
  await waitForLive(pro);
  await expect(pro.getByText("Premium Haircut")).toHaveCount(0);

  // Business publishes.
  await biz.getByRole("link", { name: /Premium Haircut/ }).first().click();
  await biz.waitForURL("**/business/campaigns/**");
  await expect(biz.getByText(NOK("13.75")).first()).toBeVisible(); // fee preview
  await expect(biz.getByText(NOK("113.75")).first()).toBeVisible(); // business pays per booking
  await biz.getByRole("button", { name: "Publish" }).click();
  await expect(biz.getByText("Published!")).toBeVisible();

  // → appears on the promoter's Explore page without a reload.
  await expect(pro.getByText("Premium Haircut").first()).toBeVisible();

  // Business goes to its dashboard and waits for activity.
  await biz.goto("/business");
  await waitForLive(biz);

  // Promoter reads the agreement and joins.
  await pro.getByRole("link", { name: /Premium Haircut/ }).first().click();
  await pro.waitForURL("**/promoter/campaigns/**");
  await expect(pro.getByText("Agreement template, to be reviewed by a lawyer before real use")).toBeVisible();
  await pro.check('input[name="accept"]');
  await pro.getByRole("button", { name: "Accept & join" }).click();
  await expect(pro.getByText("Your personal link")).toBeVisible();
  const link = (await pro.locator("code").first().innerText()).trim();
  expect(link).toMatch(/\/r\/[a-z0-9]{10}$/);

  // → business sees the join live.
  await expect(biz.getByText("Alex joined your campaign.").first()).toBeVisible();

  // Promoter watches their dashboard.
  await pro.goto("/promoter");
  await waitForLive(pro);
  await expect(stats(pro)).toContainText(/available\s*0,00\s*kr/i);

  // Customer opens the link on a phone and books (no login).
  await cus.goto(link);
  await cus.waitForURL("**/book/**");
  await expect(cus.getByRole("heading", { name: "Premium Haircut" })).toBeVisible();
  await expect(cus.getByText(NOK("500.00")).first()).toBeVisible();
  await expect(cus.getByText(/commission/i)).toHaveCount(0); // customers never see the commission
  await cus.locator("button[aria-pressed]").first().click();
  await cus.fill("#customer_name", "Stage Customer");
  await cus.fill("#customer_phone", "+47 400 00 000");
  await cus.getByRole("button", { name: /^Book / }).click();
  await expect(cus.getByRole("heading", { name: "You're booked!" })).toBeVisible();

  // → business gets the booking live, opens it, checks the frozen terms, verifies.
  await expect(biz.getByText("New booking received — Premium Haircut").first()).toBeVisible();
  await biz.getByRole("link").filter({ hasText: "Awaiting service" }).first().click();
  await biz.waitForURL("**/business/bookings/**");
  await expect(biz.getByText("Stage Customer")).toBeVisible();
  await expect(biz.getByText(NOK("113.75")).first()).toBeVisible();
  await biz.getByRole("button", { name: "Verify service completed" }).click();
  await expect(biz.getByText("✓ Service verified")).toBeVisible();

  // → promoter sees 100 kr pending live.
  await expect(stats(pro)).toContainText(/pending\s*100,00\s*kr/i);
  await expect(pro.getByText("Verified · commission pending")).toBeVisible();

  // Business: Demo Mode "Simulate end of refund window".
  await expect(biz.getByText("Demo Mode · simulated")).toBeVisible();
  await biz.getByRole("button", { name: "Simulate end of refund window" }).click();
  await expect(biz.getByText("✓ Commission available to the promoter.")).toBeVisible();

  // → promoter sees 100 kr available, 0 pending, live.
  await expect(stats(pro)).toContainText(/available\s*100,00\s*kr/i);
  await expect(stats(pro)).toContainText(/pending\s*0,00\s*kr/i);
  await expect(pro.getByText("Commission available").first()).toBeVisible();

  // Business dashboard totals.
  await biz.goto("/business");
  await expect(stats(biz)).toContainText(/verified sales\s*500,00\s*kr/i);
  await expect(stats(biz)).toContainText(/commission available\s*100,00\s*kr/i);
  await expect(stats(biz)).toContainText(/platform fees \(2\.75%\)\s*13,75\s*kr/i);
  await expect(stats(biz)).toContainText(/total cost 113,75\s*kr/i);

  await Promise.all([bizCtx.close(), proCtx.close(), cusCtx.close()]);
});
