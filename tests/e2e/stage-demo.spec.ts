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
import { allowPreview } from "./preview-access";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/** A small, real PNG photo stand-in (800×600 gradient) for the upload test. */
function makeTestPng(file: string) {
  const png = new PNG({ width: 800, height: 600 });
  for (let y = 0; y < 600; y++)
    for (let x = 0; x < 800; x++) {
      const i = (y * 800 + x) * 4;
      png.data[i] = Math.round((x / 800) * 200) + 30;
      png.data[i + 1] = 60;
      png.data[i + 2] = Math.round((y / 600) * 200) + 40;
      png.data[i + 3] = 255;
    }
  writeFileSync(file, PNG.sync.write(png));
}
import { PNG } from "pngjs";
import jsQR from "jsqr";

/** Decode a QR code PNG the way a phone camera would. */
function decodeQrPng(file: string): string | null {
  const png = PNG.sync.read(readFileSync(file));
  return jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data ?? null;
}

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

// Photos this run uploads are removed afterwards, even if a test fails
// (the demo reset keeps uploaded photos on purpose).
const runStart = new Date().toISOString();
async function removePhotosUploadedThisRun() {
  const db = adminDb();
  const { data: camps } = await db.from("campaigns").select("id, photo_paths, businesses!inner(is_demo)").eq("businesses.is_demo", true);
  for (const c of camps ?? []) {
    const { data: files } = await db.storage.from("campaign-photos").list(c.id);
    const mine = (files ?? []).filter((f) => f.created_at && f.created_at >= runStart).map((f) => `${c.id}/${f.name}`);
    if (!mine.length) continue;
    await db.from("campaigns").update({ photo_paths: c.photo_paths.filter((x) => !mine.includes(x)) }).eq("id", c.id);
    await db.storage.from("campaign-photos").remove(mine);
  }
}

test.beforeAll(async () => {
  await resetDemo(adminDb());
});

test.afterAll(async () => {
  await removePhotosUploadedThisRun();
  await resetDemo(adminDb());
});

test("demo health check is all green", async ({ page, context }) => {
  await allowPreview(context);
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
  for (const ctx of [bizCtx, proCtx, cusCtx]) await allowPreview(ctx);
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

  // Business publishes (after uploading a photo).
  await biz.getByRole("link", { name: /Premium Haircut/ }).first().click();
  await biz.waitForURL("**/business/campaigns/**");
  const campaignId = biz.url().split("/").pop()!;
  await expect(biz.getByRole("heading", { name: "Photos" })).toBeVisible();
  const photosBefore = await biz.getByTestId("campaign-photo").count();
  const testImg = path.join(os.tmpdir(), `promly-e2e-${Date.now()}.png`);
  makeTestPng(testImg);
  await biz.getByTestId("photo-input").setInputFiles(testImg);
  await expect(biz.getByText("Photo added.")).toBeVisible();
  await expect(biz.getByTestId("campaign-photo")).toHaveCount(photosBefore + 1);
  rmSync(testImg, { force: true });
  await expect(biz.getByText(NOK("13.75")).first()).toBeVisible(); // fee preview
  await expect(biz.getByText(NOK("113.75")).first()).toBeVisible(); // business pays per booking
  await biz.getByRole("button", { name: "Publish" }).click();
  await expect(biz.getByText("Published!")).toBeVisible();

  // → appears on the promoter's Explore page without a reload, with the photo as cover.
  await expect(pro.getByText("Premium Haircut").first()).toBeVisible();
  await expect(pro.getByTestId("cover-photo").first()).toBeVisible();

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

  // Sharing: WhatsApp button carries the link; the QR code encodes exactly the link.
  const wa = await pro.getByRole("link", { name: /WhatsApp/ }).getAttribute("href");
  expect(wa).toMatch(/^https:\/\/wa\.me\/\?text=/);
  expect(decodeURIComponent(wa!.split("text=")[1])).toContain(link);
  await expect(pro.getByTestId("qr-image")).toBeVisible();
  const [download] = await Promise.all([pro.waitForEvent("download"), pro.getByTestId("download-qr").click()]);
  expect(download.suggestedFilename()).toBe("promly-qr-premium-haircut.png");
  const qrUrl = decodeQrPng(await download.path());
  expect(qrUrl).toBe(link);

  // Marketing Studio promo images: right size, and the QR on them opens the promoter's link.
  await pro.goto(`/promoter/studio?campaign=${campaignId}`);
  await pro.getByRole("tab", { name: /Promo image/ }).click();
  for (const [label, key, w, h] of [["Post 1080×1080", "post", 1080, 1080], ["Story 1080×1920", "story", 1080, 1920]] as const) {
    await pro.getByRole("button", { name: new RegExp(label) }).click();
    await pro.getByTestId("promo-photo-option").first().click();
    await expect(pro.getByTestId("promo-canvas")).toHaveAttribute("data-rendered", `${key}-0`);
    const [png] = await Promise.all([pro.waitForEvent("download"), pro.getByTestId("download-promo").click()]);
    expect(png.suggestedFilename()).toBe(`promly-${key}-premium-haircut.png`);
    const file = PNG.sync.read(readFileSync(await png.path()));
    expect([file.width, file.height]).toEqual([w, h]);
    expect(jsQR(new Uint8ClampedArray(file.data), file.width, file.height)?.data).toBe(link);
  }

  // → business sees the join live.
  await expect(biz.getByText("Alex joined your campaign.").first()).toBeVisible();

  // Promoter watches their dashboard.
  await pro.goto("/promoter");
  await waitForLive(pro);
  await expect(stats(pro)).toContainText(/available\s*0,00\s*kr/i);

  // Customer "scans" the QR code on a phone and books (no login).
  await cus.goto(qrUrl!);
  await cus.waitForURL("**/book/**");
  await expect(cus.getByRole("heading", { name: "Premium Haircut" })).toBeVisible();
  await expect(cus.getByText(NOK("500.00")).first()).toBeVisible();
  await expect(cus.getByText(/commission/i)).toHaveCount(0); // customers never see the commission
  await expect(cus.getByTestId("cover-photo")).toBeVisible(); // the business's photo as cover
  await cus.locator("button[aria-pressed]").first().click();
  await cus.fill("#customer_name", "Stage Customer");
  await cus.fill("#customer_phone", "+47 400 00 000");
  await cus.getByRole("button", { name: /^Book / }).click();
  await expect(cus.getByRole("heading", { name: "You're booked!" })).toBeVisible();

  // → business gets the booking live, opens it, checks the frozen terms, verifies.
  await expect(biz.getByText("New booking received — Premium Haircut").first()).toBeVisible();
  await biz.getByRole("link").filter({ hasText: "Awaiting service" }).first().click();
  await biz.waitForURL("**/business/bookings/**");
  await expect(biz.getByText("Stage Customer").first()).toBeVisible();
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

  // → the money moment: a toast driven by the real database change.
  await expect(pro.getByTestId("money-toast")).toContainText(/\+100,00\s*kr available/);

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

  // Clean up the test photo with the app's own Remove button, and check Storage.
  await biz.goto(`/business/campaigns/${campaignId}`);
  await biz.getByTestId("campaign-photo").last().getByRole("button", { name: "Remove photo" }).click();
  await expect(biz.getByText("Photo removed.")).toBeVisible();
  await expect(biz.getByTestId("campaign-photo")).toHaveCount(photosBefore);
  const { data: left } = await adminDb().storage.from("campaign-photos").list(campaignId);
  expect((left ?? []).filter((f) => f.name !== ".emptyFolderPlaceholder")).toHaveLength(photosBefore);

  await Promise.all([bizCtx.close(), proCtx.close(), cusCtx.close()]);
});
