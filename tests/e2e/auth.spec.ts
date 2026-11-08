/**
 * Login and sign-up on the live site (npm run test:e2e).
 * Creates throwaway accounts with random passwords (never printed) and
 * deletes exactly those accounts afterwards.
 */
import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import type { Database } from "../../lib/database.types";
import { allowPreview } from "./preview-access";

function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env in .env.local");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const run = randomBytes(3).toString("hex");
const created: string[] = []; // emails of accounts this file created
const newAccount = (kind: string) => {
  const email = `promly-e2e-${kind}-${run}@example.com`;
  created.push(email);
  return { email, password: "E2e-" + randomBytes(12).toString("base64url") };
};

async function deleteCreatedAccounts() {
  const db = adminDb();
  const { data } = await db.auth.admin.listUsers({ perPage: 200 });
  for (const u of data?.users ?? []) {
    if (u.email && created.includes(u.email)) await db.auth.admin.deleteUser(u.id);
  }
}

test.describe.configure({ mode: "serial" });
test.afterAll(deleteCreatedAccounts);
test.beforeEach(async ({ context }) => allowPreview(context));

async function signUp(page: Page, role: "business" | "promoter", name: string, email: string, password: string) {
  await page.goto("/auth/sign-up");
  await page.getByRole("button", { name: role === "business" ? /^Business/ : /^Promoter/ }).click();
  await page.fill("#display-name", name);
  // With payments on, promoters also say how old they are (16-17 or 18+).
  const adult = page.getByLabel("18 or older");
  if (role === "promoter" && (await adult.count())) await adult.check();
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.fill("#repeat-password", password);
  await page.getByRole("button", { name: "Sign up" }).click();
}

async function logIn(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Log in" }).click();
}

async function logOut(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL((u) => u.pathname === "/");
}

test("a new business signs up, logs out and logs back in", async ({ page }) => {
  const a = newAccount("business");
  await signUp(page, "business", "E2E Boat Tours", a.email, a.password);
  await page.waitForURL("**/business", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Set up your business" })).toBeVisible();
  await logOut(page);
  await logIn(page, a.email, a.password);
  await page.waitForURL("**/business", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Set up your business" })).toBeVisible();
});

test("a new promoter signs up, logs out and logs back in", async ({ page }) => {
  const a = newAccount("promoter");
  await signUp(page, "promoter", "E2E Promoter", a.email, a.password);
  await page.waitForURL("**/promoter", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /Hi E2E Promoter/ })).toBeVisible();
  await logOut(page);
  await logIn(page, a.email, a.password);
  await page.waitForURL("**/promoter", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /Hi E2E Promoter/ })).toBeVisible();
});

test("signing up with an existing email shows a clear message", async ({ page }) => {
  const a = created.find((e) => e.includes("-business-"))!;
  await signUp(page, "business", "Dup", a, "Another-" + randomBytes(8).toString("hex"));
  await expect(page.getByText("An account with this email already exists. Log in instead.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Sign up" })).toBeEnabled();
});

test("an account without a profile goes to onboarding, not back to login", async ({ page }) => {
  // Same situation as accounts created before profiles existed.
  const a = newAccount("noprofile");
  const db = adminDb();
  const { data, error } = await db.auth.admin.createUser({ email: a.email, password: a.password, email_confirm: true });
  if (error) throw error;
  await db.from("profiles").delete().eq("id", data.user.id); // only this test account's profile
  await logIn(page, a.email, a.password);
  await page.waitForURL("**/onboarding", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Finish setting up your account" })).toBeVisible();
  await page.getByRole("button", { name: /^Business/ }).click();
  await page.fill("#display_name", "E2E Onboarded");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/business", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Set up your business" })).toBeVisible();
});

test("a wrong password shows a clear error instead of spinning", async ({ page }) => {
  await logIn(page, process.env.DEMO_PROMOTER_EMAIL!, "definitely-not-the-password");
  await expect(page.getByText("That email and password don't match.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Log in" })).toBeEnabled();
});

test("if the server never answers, the button stops spinning and explains after ~10 s", async ({ page }) => {
  // Simulate a hung network: hold the Supabase login request forever.
  await page.route("**/auth/v1/token**", () => {});
  await logIn(page, process.env.DEMO_PROMOTER_EMAIL!, "any-password");
  await expect(page.getByRole("button", { name: "Logging in…" })).toBeVisible();
  await expect(page.getByText("This is taking longer than it should.")).toBeVisible({ timeout: 14_000 });
  await expect(page.getByRole("button", { name: "Log in" })).toBeEnabled();
});
