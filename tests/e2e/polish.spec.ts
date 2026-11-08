/**
 * Market selector (Oslo/NOK vs Mallorca/EUR) and native share with its fallback.
 * Uses the illustrative demo campaigns; the demo is reset afterwards.
 */
import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/database.types";
import { resetDemo } from "../../lib/demo-seed";
import { allowPreview } from "./preview-access";

test.describe.configure({ mode: "serial" });

function adminDb() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loginAlex(page: Page) {
  await page.goto("/auth/login");
  await page.fill("#email", process.env.DEMO_PROMOTER_EMAIL!);
  await page.fill("#password", process.env.DEMO_PROMOTER_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/promoter");
}

test.beforeAll(async () => {
  await resetDemo(adminDb());
});
test.afterAll(async () => {
  await resetDemo(adminDb());
});

test("market switch: Explore shows only the selected market, and the choice is remembered", async ({ page, context }) => {
  await allowPreview(context);
  await loginAlex(page);
  await page.goto("/promoter/explore");
  const picker = page.getByTestId("market-picker").first();
  await expect(picker.getByRole("button", { name: "Oslo · NOK" })).toHaveAttribute("aria-pressed", "true"); // default
  await expect(page.getByText("2-hour kayak rental")).toBeVisible();
  await expect(page.getByText("Sunset catamaran cruise")).toHaveCount(0);

  await picker.getByRole("button", { name: "Mallorca · EUR" }).click();
  await expect(page.getByText("Sunset catamaran cruise")).toBeVisible();
  await expect(page.getByText("2-hour kayak rental")).toHaveCount(0);
  await expect(page.getByText(/€/).first()).toBeVisible();
  await expect(page.getByText(/\d\s*kr\b/)).toHaveCount(0); // no NOK amounts in the Mallorca view

  await page.reload(); // remembered in a cookie
  await expect(page.getByTestId("market-picker").first().getByRole("button", { name: "Mallorca · EUR" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Sunset catamaran cruise")).toBeVisible();

  await page.getByTestId("market-picker").first().getByRole("button", { name: "Oslo · NOK" }).click();
  await expect(page.getByText("2-hour kayak rental")).toBeVisible();
});

test("share: native sheet gets a text that starts with the ad label, and the link; without it, the link is copied; cancel shows nothing", async ({ page, context }) => {
  await allowPreview(context);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(test.info().project.use.baseURL!).origin });
  // Phones: record what would go to the share sheet. "cancel" mode throws AbortError like a closed sheet.
  await page.addInitScript(() => {
    const w = window as unknown as { __shareMode: string; __shared: unknown[] };
    w.__shareMode = "ok";
    w.__shared = [];
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: unknown) => {
        if (w.__shareMode === "none") throw new TypeError("not supported");
        if (w.__shareMode === "cancel") throw new DOMException("Share canceled", "AbortError");
        w.__shared.push(data);
      },
    });
  });
  await loginAlex(page);
  await page.goto("/promoter/explore");
  await page.getByRole("link", { name: /2-hour kayak rental/ }).first().click();
  await page.check('input[name="accept"]');
  await page.getByRole("button", { name: "Accept & join" }).click();
  await expect(page.getByText("Your personal link")).toBeVisible();
  const link = (await page.locator("code").first().innerText()).trim();
  await expect(page.getByTestId("ad-disclosure-note")).toContainText('"Reklame:"');

  // Native share sheet: the text starts with the ad label (no hashtag), plus the referral link.
  await page.getByTestId("share-link").click();
  const shared = await page.evaluate(() => (window as unknown as { __shared: { text?: string; url?: string }[] }).__shared);
  expect(shared).toHaveLength(1);
  expect(shared[0].text).toMatch(/^(Reklame|Advertising): /);
  expect(shared[0].text).not.toMatch(/#(reklame|ad)\b/i);
  expect(shared[0].url).toBe(link);

  // Cancelled share sheet: no error, no toast.
  await page.evaluate(() => ((window as unknown as { __shareMode: string }).__shareMode = "cancel"));
  await page.getByTestId("share-link").click();
  await expect(page.getByTestId("share-toast")).toHaveCount(0);
  // (Next.js keeps an empty route announcer with role=alert on every page, so look inside the share tools.)
  await expect(page.getByTestId("share-tools").getByRole("alert")).toHaveCount(0);
  await expect(page.getByTestId("share-tools")).not.toContainText(/error|went wrong|couldn.t/i);

  // No native share: copy the link and say so.
  await page.evaluate(() => {
    delete (navigator as unknown as { share?: unknown }).share;
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });
  await page.getByTestId("share-link").click();
  await expect(page.getByTestId("share-toast")).toHaveText("Link copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);

  // Share QR code without file sharing: same fallback.
  await page.getByTestId("share-qr").click();
  await expect(page.getByTestId("share-toast")).toHaveText("Link copied");
});
