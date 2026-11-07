# Promly

Promly is a performance-based marketing marketplace:

- **Businesses** publish campaigns with a commission.
- **Promoters** share referral links for those campaigns.
- **Verified bookings** made through a referral link earn the promoter the commission.

Built for the **Oslo Sprint hackathon**. Deadline: **Sunday 8 Nov 2026, 14:00**. **Feature freeze: Sunday 11:00.**

Live: https://promly-eight.vercel.app (every push to `main` deploys automatically, functions in `fra1`).

## Plan

Full plan: `docs/PLAN.md`. Teammate's original brief: `docs/master-prompt.md` (kept unchanged). **Where they disagree, `PLAN.md` wins.**

**Build order** (finish each end to end and deployed before the next):
1. **P0 core flow**: two accounts → business creates campaign + accepts agreement → publishes → promoter sees it in real time → joins (accepts agreement) → referral link → customer books (no login) → attribution → business verifies → simulated end of refund window → commission updates in real time on both dashboards.
2. Demo reset ("Prepare Stage Demo") + `STAGE_DEMO.md`
3. Sharing: copy link, QR, WhatsApp
4. Promo text templates (no AI API)
5. Dashboard polish
6. Video creator, last. **Not exporting by Sat 22:00 → replace with a downloadable promo image + QR code.**

Skip all of P2.

**Money rules**
- Integers in minor units (øre/cents) only.
- Promoter keeps 100% of the commission. Business pays a platform fee **on top**: `PLATFORM_FEE_BPS = 275` (2.75%) of the **booking price**, rounded half-up. Example: 500 NOK price, 100 NOK commission → promoter 100, Promly 13.75, business pays 113.75.
- Fees computed **only on the server** (`lib/money.ts`). Terms are **frozen on each booking**. `ledger_entries` is **append-only**: refunds add reversal rows, never edit old ones. One-time entries are idempotent.
- Commission stays **pending** until the service is verified **and** the refund window has passed. Demo Mode has a labelled "Simulate end of refund window" button.

**Agreements**: one standard template per campaign. The business edits only commission, payout timing (7/14 days), refund window, allowed channels and brand rules. The business accepts before publishing; the promoter accepts when joining (store version + timestamp). Label: "Agreement template, to be reviewed by a lawyer before real use".

**Tables (~9)**: profiles, businesses, campaigns, agreements, campaign_memberships, referral_links, referral_events, bookings, ledger_entries (+ notifications if needed). RLS on all. Money-changing writes go through server-only Postgres functions in one transaction.

**Tests**: one Vitest unit test for the money maths (including a refund) and one Playwright E2E test of the full flow. Run `npm run build` before every push.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (`components/ui`, config in `components.json`)
- Zod for validating input
- Supabase, **hosted project only**: project `promly`, ref `hycenbylmiaxsvcrtdsh`, region `eu-central-1` (Frankfurt), org `Promly`. Auth settings live in `supabase/config.toml` and are applied with `npx supabase config push`.
- Vercel for hosting and deploys
- GitHub for the code: https://github.com/Chhristian/promly

## Rules

1. **Explain each command first.** Before running any command, say in one plain sentence what it does and why.
2. **Hosted Supabase only, no Docker.** Never run `supabase start` or anything with `--local`. **Always pass `--remote`** to `supabase db …` / `migration …` / `gen types` commands: this CLI version targets a local database by default, and another project's local Supabase may be running on this machine.
3. **Never print secrets.** Don't show keys, tokens or passwords in chat or logs.
4. **`.env.local` is never committed.** `.gitignore` covers `.env*.local`; keep it that way.
5. **Commit and push after every working step.**
6. Do only the step asked for, then stop and wait.
