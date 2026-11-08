# Handoff: `demo-polish` (Christian → Jakob)

Written Sun 8 Nov 2026, after feature freeze (11:00). Deadline 14:00.

## Goal of this branch

Make the stage demo look and feel believable: aged illustrative data with generated images, an Oslo (NOK) / Mallorca (EUR) market selector, hardened login/sign-up, and native share (link + QR through the phone's share sheet). It changes no money logic and no stage-demo flow.

## Done (finished and tested)

| Item | Notes |
|---|---|
| Aged illustrative data | 2–6 months of history, about 160 bookings, made with the real booking/money functions; every ledger sums to zero. Generated avatars, business tiles and category covers via `npm run demo-assets` |
| Market selector | Oslo (NOK) / Mallorca (EUR), remembered in a cookie, default Oslo. No migration |
| Auth hardening | Clear errors (incl. rate limits), minimum 10-character password, show/hide toggle, 15 s timeout with "Try again" |
| Native share | Link + QR PNG, #reklame text, copy-link fallback with "Link copied" toast, nothing shown on cancel |
| Three demo campaigns paused | "Premium bilvask", "Bilvask", "jjjj" |

Test results (from `docs/PROGRESS.md` and this handoff's checks):

- **Unit (Vitest):** 40/40 when the branch was last tested.
- **E2E on the preview:** 10 passed, 2 skipped (payments, flag off); one failure in my own new share test was a bad check, which I fixed. Share and market tests then passed 2/2.
- **Full e2e suite rerun after the fix: see the "Resume log" below (11 passed, 2 skipped).**
- **Handoff checks (8 Nov):** `npx tsc --noEmit` passes. `npm run build` passes. I did not run unit or e2e tests for the handoff and fixed nothing.

## Resume log (Christian's session, 8 Nov ~10:15, branch `demo-polish`)

- `git pull`: nothing new from Jakob since `a4b842e`. Branch still 2 commits behind `main`.
- **Step 1 (merge `main`):** not merged, as instructed (no merging). A trial merge with `--no-commit` applied **cleanly with no conflicts** and was aborted; the branch is unchanged. Merging `main` in stays a decision for Christian/Jakob.
- **Step 2 (checks), on the branch as it stands (without `main`'s 2 commits):**
  - `npm test`: **40/40** passed.
  - `npm run build`: passed.
  - Full e2e on the preview (`E2E_BASE_URL=<preview> npm run test:e2e`): **11 passed, 2 skipped** (the two payments specs, flag off). This includes both stage-demo tests and the share and market tests.
- **Step 3 (stage demo):** the stage-demo e2e passed (health check green, full flow live). `npm run reset-demo` then ended with "Stage demo is ready" (2 businesses, 158 illustrative bookings, Alex confirmed 18+).
- **Screenshots:** public pages (landing, login, sign-up) on the preview at desktop and phone size, in `C:\Users\chris\promly-screenshots-handoff` (outside the repo). Earlier polish screenshots are in `C:\Users\chris\promly-screenshots-polish`.
- **Not done, on purpose:** step 4 (merge PR #11, needs Christian's OK) and step 5 (optional backlog items, after the feature freeze). No migration was needed or written; nothing was pushed to the database.

## Not done / next steps (in order)

1. **Review PR #11** and decide whether to merge `main` into the branch. It is **2 commits behind `main`** (PR #12 `jakob/demo-glans`: `lib/conversions.ts`, `app/demo/glans/*`, `app/r/[code]/route.ts`, `lib/supabase/proxy.ts`). It touches no migrations, but `proxy.ts` and `r/[code]/route.ts` are shared files, so expect to check for conflicts. I did not merge or rebase.
2. **Rerun the checks after any merge from `main`:** `npm test`, then `npm run build`, then the full e2e suite on the preview (commands below). Run e2e **one process at a time**: it resets the demo.
3. **Run the stage-demo e2e once more and eyeball `/admin/demo` → Prepare Stage Demo** ("✓ Demo ready"). Don't break the stage demo.
4. **Merge PR #11 only with Christian's OK.** Pushes to `main` deploy to production automatically.
5. Optional, if time (all below the feature freeze): promoter leaderboard on the business dashboard, performance pass on slow 4G, accessibility pass (contrast, focus states, labels). See `docs/BACKLOG.md`.

Known problems:

- **Past Stripe invoices for the aged data are not created.** They would need real Stripe test invoices on every reset.
- **Intermittent "Something went wrong"** once in the admin Demo Control Center during "Create this month's invoices". The next three runs passed and the cause is unknown; "Try again" recovers. Only relevant when payments are on.
- **Stripe webhooks on previews** need `stripe listen` running on a machine (command in `docs/PAYMENTS.md`), because Vercel protects previews. Optional: swap the full `sk_test_` key for a restricted `rk_test_` key (permissions in `docs/PAYMENTS.md`).
- **Legal questions** (VAT on the fee, commission treatment, Skatteetaten reporting, minors' payouts) are listed in `docs/PAYMENTS.md`.
- **About the migration version conflict** (`20261108100000_online_checkout.sql` → `20261108120000`): I found **no conflict**. `20261108100000_online_checkout.sql` exists once, is identical on `main` and on this branch, and is already applied on the hosted project. No rename was needed or made.

## Migration status

- **This branch adds no migration files.**
- The last migrations, `20261108090000_payments.sql` and `20261108100000_online_checkout.sql`, are on `main` and **applied on the hosted project** (`npx supabase migration list --remote`: local and remote match through `20261108100000`; no duplicate versions).
- **Rule:** only Christian runs `npx supabase db push --remote`, after reviewing the file. Never push before that, and never merge a PR before its migration is applied. If you add a migration, pick a version after `20261108100000` that doesn't collide with anything on `main`.

## How to run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Create `.env.local` (git-ignored; **names only here**, Christian shares values privately):

| Variable | Needed for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | app (required) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | app (required) |
| `SUPABASE_SERVICE_ROLE_KEY` | server actions, demo reset, e2e |
| `DEMO_MODE` | demo controls |
| `DEMO_PROMOTER_EMAIL`, `DEMO_PROMOTER_PASSWORD` | e2e logins |
| `NEXT_PUBLIC_SITE_URL` | absolute links / QR |
| `CONVERSIONS_SECRET` | `/api/conversions` (empty = off) |
| `PAYMENTS_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe test-mode payments (optional) |
| `VERCEL_OIDC_TOKEN` | e2e against a protected preview (short-lived; `vercel env pull`) |

Test commands:

```bash
npm test                                              # unit (Vitest)
npm run build                                         # run before every push
# e2e against the preview (PowerShell: $env:E2E_BASE_URL="..."; npm run test:e2e)
E2E_BASE_URL=https://promly-git-demo-polish-christian-45cf.vercel.app npm run test:e2e
# stage-demo only (resets the demo before and after)
E2E_BASE_URL=https://promly-git-demo-polish-christian-45cf.vercel.app npx playwright test tests/e2e/stage-demo.spec.ts
# local app instead: E2E_BASE_URL=http://localhost:3000
# optional: E2E_VIDEO=1 records videos; E2E_PAYMENTS=1 enables the payments spec
npm run reset-demo                                    # reset demo data from the terminal
```

Without `E2E_BASE_URL`, e2e runs against the live site (https://promly-eight.vercel.app).

## Rules from CLAUDE.md that matter

- **Hosted Supabase only, no Docker.** Never run `supabase start` or anything with `--local`. Always pass `--remote` to `supabase db …` / `migration …` / `gen types`.
- **Money:** integers in minor units (øre/cents) only. Fees are computed only on the server (`lib/money.ts`); terms are frozen on each booking; `ledger_entries` is append-only.
- **Don't break the stage demo** (`STAGE_DEMO.md`). No new features after the freeze.
- Never print or commit secrets; `.env.local` is never committed.
- Run `npm run build` before every push; commit and push after every working step.

## Links

- PR: https://github.com/Chhristian/promly/pull/11
- Vercel preview: https://promly-git-demo-polish-christian-45cf.vercel.app
- Live: https://promly-eight.vercel.app

---

# Handoff: branch `agreement-pdf`

## Goal
Let businesses upload their promoter agreement as a PDF, instead of or as well as the brand-rules text. PDFs are private, versioned (never overwritten) and hashed (SHA-256). When a promoter joins, the database records which PDF version they accepted (id + hash + `promoter_accepted_at`).

## Done
- Migration `supabase/migrations/20261108120000_agreement_pdfs.sql`: `agreement_documents` table, `agreements.document_id`, membership columns `agreement_document_id` / `agreement_document_sha256`, triggers, RLS, private `agreements` bucket (PDF only, 5 MB), storage policies (owner upload, insert only; read for owner / admin / promoters who can see or joined; age rating respected via `is_published_campaign()`).
- Already renamed from `20261108100000` (that version belongs to `online_checkout`). `20261108120000` is not used on `main`, on `demo-polish` or on any other remote branch.
- Server check of `%PDF-` magic bytes + SHA-256 (`registerAgreementPdf` in `app/business/actions.ts`).
- Viewing: `/agreement-pdf/<id>[?download=1]` redirects to a 60-second signed URL. Inline iframe + Download on the business and promoter campaign pages.
- `lib/database.types.ts` edited by hand to match the migration.
- Checked: `npx tsc --noEmit` passes, `npm run build` passes, unit tests `tests/agreement-pdf.test.ts` pass (6).
- Not run yet: the E2E test `tests/e2e/agreement-pdf.spec.ts` (it needs the migration applied).

## Not done / next steps
1. Merge `main` into `agreement-pdf`. The hosted DB already has `20261108090000_payments` and `20261108100000_online_checkout`, which this branch lacks, so `db push` refuses until they're present locally. Resolve conflicts, then `npx tsc --noEmit` and `npm run build`.
2. Run `npx supabase migration list --remote` (read-only) and confirm that only `20261108120000_agreement_pdfs` is pending.
3. Ask Christian to review the migration and run `npx supabase db push --remote`. **Don't run it yourself.**
4. After the push: regenerate types with `npx supabase gen types typescript --project-id hycenbylmiaxsvcrtdsh > lib/database.types.ts` and check the diff against the hand-made edits.
5. Run the E2E test against the preview: `E2E_BASE_URL=https://promly-git-agreement-pdf-christian-45cf.vercel.app npx playwright test agreement-pdf`. Fix anything that fails.
6. Run the stage demo test to confirm it still works: `npx playwright test stage-demo`.
7. Known problem: `npx eslint .` reports one `prefer-const` error in `lib/demo-seed.ts`. It wasn't introduced here and it's demo code, so it's left alone.
8. Only then can the PR be merged. **Never merge it before the migration is applied.**

## Migration status
- File: `supabase/migrations/20261108120000_agreement_pdfs.sql`. **Not pushed.**
- Rule: only Christian runs `npx supabase db push --remote`, after reviewing it. Never push before that, and never merge the PR before the migration is applied.

## How to run it
```
npm install
npm run dev
```
`.env.local` variable **names** (Christian shares the values privately; never commit `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`, `DEMO_MODE`
- `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, `DEMO_BUSINESS_EMAIL`, `DEMO_BUSINESS_PASSWORD`, `DEMO_PROMOTER_EMAIL`, `DEMO_PROMOTER_PASSWORD`, `DEMO_SPAIN_BUSINESS_EMAIL`, `DEMO_SPAIN_BUSINESS_PASSWORD`
- For E2E against a protected preview: `VERCEL_OIDC_TOKEN`. Optional: `E2E_BASE_URL`, `E2E_VIDEO`.

Tests:
- Unit: `npm test` (or `npx vitest run tests/agreement-pdf.test.ts`)
- E2E on the preview: `E2E_BASE_URL=https://promly-git-agreement-pdf-christian-45cf.vercel.app npx playwright test agreement-pdf`
- Stage demo: `npx playwright test stage-demo` (resets the demo before and after)

## Rules from CLAUDE.md that matter
- Hosted Supabase only, **no Docker**. Never run `supabase start` or anything with `--local`.
- Always pass `--remote` to `supabase db …` / `migration …` / `gen types` commands.
- Money is stored as integers in minor units (øre / cents) only; fees are computed only on the server.
- Don't break the stage demo. The demo campaign keeps its text agreement (no PDF).
- Never print or commit secrets; `.env.local` is never committed.
- Run `npm run build` before every push.

## Links
- PR: https://github.com/Chhristian/promly/pull/10
- Preview: https://promly-git-agreement-pdf-christian-45cf.vercel.app
