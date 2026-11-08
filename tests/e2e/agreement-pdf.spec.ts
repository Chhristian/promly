/**
 * Agreement PDFs (npm run test:e2e -- agreement-pdf).
 *
 * Uses its own throwaway accounts and campaign (never the stage demo):
 * a business uploads its agreement as a PDF, accepts and publishes; a promoter
 * views it inline, downloads it and joins; the database records the accepted
 * PDF version and hash. Then a stranger and a logged-out visitor try to read it.
 *
 * Needs the 20261108120000_agreement_pdfs migration and a deployment with this
 * code (set E2E_BASE_URL to the preview). Everything it creates is deleted.
 */
import { test, expect, type Browser, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Database } from "../../lib/database.types";
import { allowPreview, previewHeaders } from "./preview-access";

const BUCKET = "agreements";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

function adminDb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !publishableKey) throw new Error("Missing Supabase env in .env.local");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** A Supabase client logged in as a user, like a browser would be (anon key + their session). */
async function userDb(email: string, password: string) {
  const db = createClient<Database>(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return db;
}

/** A small, valid one-page PDF with a unique line of text (so its hash is unique too). */
function makePdf(text: string): Buffer {
  const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const run = randomBytes(3).toString("hex");
const accounts = {
  business: { email: `promly-e2e-pdfbiz-${run}@example.com`, password: "E2e-" + randomBytes(12).toString("base64url"), role: "business" },
  promoter: { email: `promly-e2e-pdfpro-${run}@example.com`, password: "E2e-" + randomBytes(12).toString("base64url"), role: "promoter" },
  stranger: { email: `promly-e2e-pdfstr-${run}@example.com`, password: "E2e-" + randomBytes(12).toString("base64url"), role: "business" },
} as const;
const userIds: string[] = [];
let campaignId = "";
const pdf = makePdf(`Promly E2E agreement ${run}`);
const pdfSha256 = createHash("sha256").update(pdf).digest("hex");
let documentId = "";
let storagePath = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const db = adminDb();
  for (const a of Object.values(accounts)) {
    const { data, error } = await db.auth.admin.createUser({
      email: a.email, password: a.password, email_confirm: true,
      user_metadata: { role: a.role, display_name: `E2E PDF ${a.role}` },
    });
    if (error) throw error;
    userIds.push(data.user.id);
  }
  const { data: biz, error: bizErr } = await db
    .from("businesses")
    .insert({ owner_id: userIds[0], name: `E2E PDF Barber ${run}`, city: "Oslo", country: "NO", currency: "NOK", category: "barbershop" })
    .select("id")
    .single();
  if (bizErr) throw bizErr;
  const { data: camp, error: campErr } = await db
    .from("campaigns")
    .insert({ business_id: biz.id, service_name: `PDF Haircut ${run}`, price_minor: 50000 })
    .select("id")
    .single();
  if (campErr) throw campErr;
  campaignId = camp.id;
});

test.afterAll(async () => {
  const db = adminDb();
  if (campaignId) {
    const { data: files } = await db.storage.from(BUCKET).list(campaignId);
    if (files?.length) await db.storage.from(BUCKET).remove(files.map((f) => `${campaignId}/${f.name}`));
  }
  // Deleting the users cascades to their business, campaign, agreements, PDFs and membership.
  for (const id of userIds) await db.auth.admin.deleteUser(id);
});

async function logIn(browser: Browser, who: keyof typeof accounts, landsOn: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await allowPreview(ctx);
  const page = await ctx.newPage();
  await page.goto("/auth/login");
  await page.fill("#email", accounts[who].email);
  await page.fill("#password", accounts[who].password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(`**${landsOn}`);
  return page;
}

test("business uploads its agreement PDF; promoter views, downloads and accepts it", async ({ browser }) => {
  const db = adminDb();
  const biz = await logIn(browser, "business", "/business");
  await biz.goto(`/business/campaigns/${campaignId}`);
  // The page must be hydrated before a file is chosen, or the change event is lost.
  // The header's "Live" dot only appears once the client code is running.
  await expect(biz.locator("header").getByText("Live", { exact: true })).toBeVisible({ timeout: 30_000 });

  // A file that only pretends to be a PDF is refused.
  const fake = path.join(os.tmpdir(), `promly-e2e-fake-${run}.pdf`);
  writeFileSync(fake, "<html>not a pdf</html>");
  await biz.getByTestId("agreement-pdf-input").setInputFiles(fake);
  await expect(biz.getByText(/isn't a PDF/)).toBeVisible();

  // The real PDF becomes version 1.
  const file = path.join(os.tmpdir(), `promly-e2e-agreement-${run}.pdf`);
  writeFileSync(file, pdf);
  await biz.getByTestId("agreement-pdf-input").setInputFiles(file);
  await expect(biz.getByText("PDF version 1 uploaded.", { exact: false })).toBeVisible();
  await expect(biz.getByTestId("agreement-pdf-versions")).toContainText(pdfSha256.slice(0, 12));

  const { data: doc } = await db.from("agreement_documents").select("*").eq("campaign_id", campaignId).single();
  expect(doc).toMatchObject({ version: 1, sha256: pdfSha256, size_bytes: pdf.length, uploaded_by: userIds[0] });
  documentId = doc!.id;
  storagePath = doc!.storage_path;

  // The business can view and download its own upload (live Storage policy), byte for byte.
  for (const download of [false, true]) {
    const res = await biz.request.get(`/agreement-pdf/${documentId}${download ? "?download=1" : ""}`, { maxRedirects: 0, headers: previewHeaders() });
    expect(res.status()).toBe(302);
    const own = await biz.request.get(res.headers()["location"]);
    expect(own.ok()).toBe(true);
    expect(createHash("sha256").update(await own.body()).digest("hex")).toBe(pdfSha256);
    if (download) expect(own.headers()["content-disposition"] ?? "").toContain("attachment");
  }

  // Accept the agreement with the PDF included, then publish.
  await biz.fill("#commission", "100");
  await expect(biz.getByTestId("include-agreement-pdf")).toBeChecked();
  await biz.locator('input[name="accept"]').check();
  await biz.getByRole("button", { name: "Accept agreement" }).click();
  await expect(biz.getByText("Agreement version 1 accepted.")).toBeVisible();
  await expect(biz.getByTestId("agreement-pdf")).toBeVisible();
  await biz.getByRole("button", { name: "Publish" }).click();
  await expect(biz.getByText("Published!", { exact: false })).toBeVisible();

  // Promoter sees the PDF inline before joining.
  const pro = await logIn(browser, "promoter", "/promoter");
  await pro.goto(`/promoter/campaigns/${campaignId}`);
  const viewer = pro.getByTestId("agreement-pdf");
  await expect(viewer).toBeVisible();
  await expect(viewer.locator("iframe")).toHaveAttribute("src", `/agreement-pdf/${documentId}`);

  // Inline and Download both redirect to a short-lived signed URL that serves the exact file.
  for (const download of [false, true]) {
    const res = await pro.request.get(`/agreement-pdf/${documentId}${download ? "?download=1" : ""}`, { maxRedirects: 0, headers: previewHeaders() });
    expect(res.status()).toBe(302);
    const signed = res.headers()["location"];
    expect(signed).toContain("/storage/v1/object/sign/agreements/");
    expect(signed).toContain("token=");
    const file = await pro.request.get(signed);
    expect(file.ok()).toBe(true);
    expect(createHash("sha256").update(await file.body()).digest("hex")).toBe(pdfSha256);
    if (download) expect(file.headers()["content-disposition"] ?? "").toContain("attachment");
  }

  // Accept and join.
  await expect(pro.getByText("including the attached PDF (version 1)")).toBeVisible();
  await pro.locator('input[name="accept"]').check();
  await pro.getByRole("button", { name: /Accept & join/ }).click();
  await expect(pro.getByRole("heading", { name: "Your personal link" })).toBeVisible();
  await expect(pro.getByText(/including PDF version 1/)).toContainText(pdfSha256.slice(0, 12));

  // The database recorded which PDF version the promoter accepted, its hash, and when.
  const { data: m } = await db
    .from("campaign_memberships")
    .select("agreement_document_id, agreement_document_sha256, promoter_accepted_at")
    .eq("campaign_id", campaignId)
    .eq("promoter_id", userIds[1])
    .single();
  expect(m).toMatchObject({ agreement_document_id: documentId, agreement_document_sha256: pdfSha256 });
  expect(Date.now() - new Date(m!.promoter_accepted_at).getTime()).toBeLessThan(5 * 60_000);

  await biz.context().close();
  await pro.context().close();
});

test("a stranger and a logged-out visitor can't read the PDF; versions can't be overwritten", async ({ browser }) => {
  expect(documentId, "runs after the upload test").not.toBe("");

  const expectNoAccess = async (db: SupabaseClient<Database>) => {
    const { data: rows } = await db.from("agreement_documents").select("id").eq("id", documentId);
    expect(rows ?? []).toHaveLength(0);
    const { data: blob } = await db.storage.from(BUCKET).download(storagePath);
    expect(blob).toBeNull();
    const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(storagePath, 60);
    expect(signed?.signedUrl).toBeFalsy();
  };

  // Another business (logged in, but not the owner and not a promoter).
  await expectNoAccess(await userDb(accounts.stranger.email, accounts.stranger.password));
  // A logged-out visitor.
  await expectNoAccess(createClient<Database>(url, publishableKey, { auth: { persistSession: false } }));

  // No public URL: the bucket is private.
  const publicUrl = adminDb().storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
  expect((await fetch(publicUrl)).ok).toBe(false);

  // Through the app: the stranger gets 404, not a signed URL.
  const str = await logIn(browser, "stranger", "/business");
  const res = await str.request.get(`/agreement-pdf/${documentId}`, { maxRedirects: 0, headers: previewHeaders() });
  expect(res.status()).toBe(404);
  await str.context().close();

  // The stranger can't upload into someone else's campaign folder.
  const strangerDb = await userDb(accounts.stranger.email, accounts.stranger.password);
  const intruder = await strangerDb.storage.from(BUCKET).upload(`${campaignId}/${randomUUID()}.pdf`, pdf, { contentType: "application/pdf" });
  expect(intruder.error).not.toBeNull();

  // Even the owner can't overwrite or delete a registered version.
  const owner = await userDb(accounts.business.email, accounts.business.password);
  const overwrite = await owner.storage.from(BUCKET).upload(storagePath, makePdf("tampered"), { contentType: "application/pdf", upsert: true });
  expect(overwrite.error).not.toBeNull();
  await owner.storage.from(BUCKET).remove([storagePath]);
  const { data: still } = await adminDb().storage.from(BUCKET).download(storagePath);
  expect(createHash("sha256").update(Buffer.from(await still!.arrayBuffer())).digest("hex")).toBe(pdfSha256);
});
