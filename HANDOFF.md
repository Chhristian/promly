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
