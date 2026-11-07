import type { BrowserContext } from "@playwright/test";

/**
 * Vercel preview deployments sit behind Deployment Protection. When the tests run
 * against a preview (E2E_BASE_URL), attach the short-lived local Vercel OIDC token
 * (from .env.local, never printed) to requests for that origin only, so Supabase
 * and other hosts never see it. Production runs are unaffected.
 */
export async function allowPreview(context: BrowserContext) {
  const base = process.env.E2E_BASE_URL;
  const token = process.env.VERCEL_OIDC_TOKEN;
  if (!base || !token || !/\.vercel\.app$/.test(new URL(base).hostname) || base.includes("promly-eight")) return;
  const origin = new URL(base).origin;
  await context.route(`${origin}/**`, (route) =>
    route.continue({ headers: { ...route.request().headers(), "x-vercel-trusted-oidc-idp-token": token } }),
  );
}
