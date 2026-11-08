# Promly — Build Plan (Oslo Sprint)

Source: `docs/master-prompt.md` (teammate's master prompt, kept unchanged) **plus the overrides below, which win on any conflict**.

- **Deadline:** Sunday 8 Nov 2026, 14:00
- **Feature freeze:** Sunday 8 Nov, 11:00 (after this: bug fixes, demo rehearsal, `STAGE_DEMO.md` only)
- **Fresh project.** There is no existing Promly code to preserve. Master prompt sections that say "inspect/preserve the existing project" don't apply.
- **Live:** https://promly-eight.vercel.app (every push to `main` deploys automatically; functions run in `fra1`)
- **Target (decided 8 Nov):** Promly works only with businesses that have an **online checkout** (online booking or ticketing: tours, rentals, experiences, event and club tickets, activities, online classes and memberships). Offline-only businesses such as barbershops are not our audience. New businesses must give their checkout URL (https).
- **No Marketing Studio (decided 8 Nov):** promo text templates and the promo image / video creator are removed. Promoters get the sharing tools only (copy link, QR code, WhatsApp, native share) with the note "Mark your posts as advertising (#reklame) and follow the business's brand rules."

---

## 1. Scope and build order

Work strictly in this order. Don't start a phase until the one before it works **end to end on the deployed site**.

| # | Phase | What "done" means |
|---|-------|-------------------|
| 1 | **P0 core flow** (master §3 items 1–10) | Business and promoter accounts, create + publish campaign (with agreement), real-time discovery, join (accept agreement), unique referral link, customer booking, attribution, business verifies service, simulated settlement, real-time commission updates. Deployed and tested on two devices. |
| 2 | **Demo reset + `STAGE_DEMO.md`** | "Prepare Stage Demo" restores the demo accounts and campaigns to a known state. Runbook with 60-second and 2-minute versions. |
| 3 | **Sharing** | Copy link, QR code, WhatsApp share (plus native share on mobile where supported). |
| 4 | ~~Promo text templates~~ | Removed 8 Nov (no content creation in Promly). |
| 5 | **Dashboard polish** | Business and promoter dashboards look like a real product (master §5–7). |
| 6 | ~~Video creator / promo image~~ | Removed 8 Nov (no content creation in Promly). |

**Skipped entirely:** all of P2 (advanced analytics, extra categories beyond the seed list, expanded admin tools, AI content generation, external integrations). Also skipped: content library, brand asset uploads, withdrawals beyond a labelled "simulated withdrawal" if time allows.

> ⚠️ Timing tension: the video is last in the order but has a Saturday 22:00 cut-off. In practice, phases 1–4 need to be done by Saturday evening for video to get a real attempt. If P0 runs late, video goes straight to the PNG fallback.

### Target timeline

| When | Goal |
|------|------|
| Sat 12:00–14:30 | Migrations (9 tables + RLS), money module + unit test, seed data |
| Sat 14:30–18:30 | P0 pages and server actions, end to end on localhost |
| Sat 18:30–20:00 | Realtime, deploy, test on two devices; Playwright E2E test |
| Sat 20:00–21:00 | Demo reset + `STAGE_DEMO.md` |
| Sat 21:00–22:00 | Sharing tools |
| Sat 22:00 | **Video checkpoint** → continue video or switch to PNG + QR |
| Sun 08:00–11:00 | Dashboard polish, video/PNG finish |
| **Sun 11:00** | **Feature freeze** |
| Sun 11:00–14:00 | Fixes, rehearsals on the deployed site, final `STAGE_DEMO.md` |

---

## 2. Money model (overrides master §15)

- **All amounts are integers in minor units** (øre for NOK, cents for EUR). No floats anywhere.
- **Promoter keeps 100% of the advertised commission.**
- **Promly's platform fee is charged to the business on top**: `PLATFORM_FEE_BPS = 275` (2.75%), applied to the **booking price** (not to the commission).
- **Rounding:** fee = `price × bps / 10000`, rounded half-up to a whole minor unit. Done in one place only.

| Example (Demo Fjord Boat Tours) | NOK | øre |
|---|---|---|
| Booking price (sunset cruise) | 500.00 | 50 000 |
| Commission → promoter | 100.00 | 10 000 |
| Platform fee 2.75% of price → Promly | 13.75 | 1 375 |
| **Business pays** (commission + fee) | **113.75** | **11 375** |

Spain campaign: €150 jet ski, commission 20% of price = €30.00 (3 000 cents), fee 2.75% × 15 000 = 412.5 → **413 cents**, business pays €34.13.

**Rules**
- Fees are computed **only on the server** (`lib/money.ts`, a pure TypeScript module), never in the browser.
- **Terms are frozen on each booking**: price, commission, fee bps, fee, business total, currency, payout days, refund window days and agreement version are copied onto the booking row when it is created. Later campaign edits never change existing bookings.
- **Append-only ledger** (`ledger_entries`): rows are only ever inserted, never updated or deleted by the app. Balances are sums of rows. Corrections are new reversal rows.
- **Idempotent:** each one-time ledger entry has a unique key (`booking_id` + `entry_type`), so double clicks or retries can't award a commission twice.
- Commission percentages (as in the Spain campaign) are converted to a fixed amount when the campaign is saved, so every booking uses a fixed integer amount.

### Commission lifecycle

```
booking created ──► service verified ──► refund window passed ──► available ──► (payout date)
   (no money)        ledger: commission     ledger: release           shown as
                     PENDING (+10 000)      PENDING −10 000           "paid out on <date>"
                     platform fee row       AVAILABLE +10 000         (simulated, no real money)
        │
        └── refund before payout ──► ledger: REVERSAL (−10 000 pending, fee reversed too)
```

- **Pending** until the service is verified **and** the refund window has passed.
- **Refund before payout** → append reversal entries; never edit old rows.
- **Demo Mode** (`DEMO_MODE=true`): a clearly labelled **"Simulate end of refund window"** button on the booking skips the wait. This is the master prompt's "simulated settlement" step.
- **Payout date** = verified time + agreement's payout days (e.g. 7 or 14). Shown on both dashboards. No real money moves (master §16).

---

## 3. Agreements

Each campaign has an **agreement** built from one standard template (`lib/agreement-template.ts`). The page shows the label **"Agreement template, to be reviewed by a lawyer before real use"**.

The business can edit **only** these fields:
- commission amount
- payout timing (7 or 14 days after the service is verified)
- refund window (days)
- allowed marketing channels (checklist)
- brand rules (free text)

Flow:
1. The business fills the fields → the agreement is rendered from the template → **the business accepts it before publishing** (stores version + timestamp).
2. **The promoter accepts it when joining** the campaign (stores the agreement id/version + timestamp on the membership).
3. Each booking records which agreement version applied.

Editing terms after publishing creates a **new agreement version**. Existing members and bookings keep the version they accepted.

---

## 4. Database (overrides master §20: ~9 tables)

Migrations live in `supabase/migrations/` and go to the **hosted** project with `npx supabase db push` (never local Docker). RLS is on for every table.

| Table | Purpose | Key fields |
|---|---|---|
| `profiles` | One per auth user | `id` (= auth.users.id), `display_name`, `role` (`business` / `promoter` / `admin`), `is_demo` |
| `businesses` | A business owned by a profile | `owner_id`, `name`, `city`, `country`, `currency`, `category`, `logo_url`, `is_demo` |
| `campaigns` | An offer promoters can promote | `business_id`, `service_name`, `description`, `image_url`, `price_minor`, `commission_minor`, `currency`, `status` (`draft`/`published`/`paused`), `current_agreement_id`, `published_at` |
| `agreements` | Versioned terms per campaign | `campaign_id`, `version`, `template_version`, `payout_days`, `refund_window_days`, `allowed_channels[]`, `brand_rules`, `commission_minor`, `business_accepted_at` |
| `campaign_memberships` | Promoter joined a campaign | `campaign_id`, `promoter_id`, `agreement_id`, `promoter_accepted_at`; unique (campaign, promoter) |
| `referral_links` | Unique link per membership | `membership_id`, `code` (unique, random), → `/r/<code>` |
| `referral_events` | Visits to a referral link | `referral_link_id`, `type` (`visit`), `created_at` (no personal data) |
| `bookings` | Customer booking + **frozen terms** | `campaign_id`, `referral_link_id`, `promoter_id`, `business_id`, customer name/phone, `slot_start`, `status` (`pending`/`verified`/`refunded`/`cancelled`), frozen: `price_minor`, `commission_minor`, `fee_bps`, `fee_minor`, `business_total_minor`, `currency`, `payout_days`, `refund_window_days`, `agreement_id`, `verified_at`, `refund_window_ends_at`, `payout_at`; unique (campaign, slot_start) to block double booking |
| `ledger_entries` | Append-only money log | `booking_id`, `account` (`promoter`/`business`/`platform`), `party_id`, `bucket` (`pending`/`available`), `entry_type` (`commission`, `platform_fee`, `release`, `reversal`), `amount_minor` (signed), `currency`; unique (booking_id, entry_type, account, bucket) |
| `notifications` *(if needed)* | Feed for "Alex joined", "New booking" | `user_id`, `type`, `payload`, `read_at` |

**Security**
- Businesses see only their own campaigns, bookings and ledger rows; promoters see only their own memberships, links, bookings and ledger rows. Published campaigns are readable by every logged-in user.
- Customers don't log in. The booking page calls a **server action** that validates with Zod and writes through a Postgres function, using the server-only service role key.
- **Writes that touch money** (create booking, verify, simulate end of refund window, refund) run as **Postgres functions in one transaction**, callable only from the server. The browser can never insert ledger rows.
- Only the campaign's business can verify or refund its bookings. A promoter can never approve their own commission.
- Realtime subscriptions go through RLS, so users only receive changes to rows they're allowed to see.

---

## 5. P0 flow: screens and events

| Step | Who | Screen / route | Realtime effect |
|---|---|---|---|
| Sign up / log in, pick role | both | `/auth/*` (starter) + role choice | — |
| Create campaign + agreement, accept, publish | Business | `/business/campaigns/new` | Promoter marketplace shows it instantly (`campaigns` insert/update) |
| Browse marketplace | Promoter | `/promoter/explore` | — |
| Join (accept agreement) → get link | Promoter | `/promoter/campaigns/[id]` | Business dashboard: "Alex joined" (`campaign_memberships`) |
| Open link, see service, pick slot, book | Customer (no login) | `/r/[code]` → booking form | Business: "New booking — Sunset Fjord Cruise" (`bookings`) |
| Verify service | Business | `/business/bookings/[id]` | Promoter: pending commission appears (`ledger_entries`) |
| "Simulate end of refund window" (Demo Mode) | Business | same page | Promoter: moves to available (`ledger_entries`) |
| Dashboards | both | `/business`, `/promoter` | Commissions, sales, pending vs available, payout dates |

Both dashboards show a **connection status dot** and a **manual refresh button** as a fallback (master §14).

### Dashboards (both sides)
- **Business:** campaigns, sales (bookings + verified), commissions owed (pending vs available), platform fees, total cost, and when each payout happens.
- **Promoter:** clicks, bookings, verified conversions, earnings pending vs available, and the payout date for each commission.

---

## 6. Demo setup

- Demo accounts: **Demo Fjord Boat Tours** (business) and **Alex** (promoter). The customer uses a guest session. Credentials are never committed or published (master §18); they go in `.env.local` / Vercel env vars and are handed over privately.
- Demo campaigns: **Sunset Fjord Cruise, 500 NOK, 100 NOK commission, 16+** (Norway, main demo) and **Jet Ski Adventure, €150, 20% commission** (Spain). Both are labelled as illustrative. Prepare Stage Demo also creates illustrative data: 8 fictional online-checkout businesses, 13 campaigns, ~20 fictional promoters and four weeks of history, made with the real booking and money functions.
- **Prepare Stage Demo** (admin only) deletes and re-seeds **only rows flagged `is_demo`**. This is the one place demo ledger rows are removed; it never touches non-demo data.
- **Demo Health Check** runs real checks (DB, realtime, accounts, money maths) and never fakes results.
- `STAGE_DEMO.md`: before / during / after, a 60-second version and a 2-minute version.

---

## 7. Tests (overrides master §21)

Only two tests, both must actually run and pass:
1. **Unit test (Vitest)** for `lib/money.ts`: the 500 / 100 / 13.75 / 113.75 NOK example, the € rounding case, and **a refund** (ledger sums go back to zero pending, nothing available).
2. **One Playwright end-to-end test** of the full flow with three browser contexts: business creates and publishes → promoter sees it without refresh and joins → customer books via the link → business verifies + simulates end of refund window → promoter dashboard shows the commission as available.

Plus `npm run build` (which type-checks) before every push. The rest of master §21 is skipped.

---

## 8. Workflow

- Explain each command before running it; one step at a time; stop and wait.
- Hosted Supabase only (`supabase db push`, `config push`); never `supabase start` / `--local` / Docker.
- Never print secrets; `.env.local` is never committed.
- **Commit and push after every working step.** Pushes to `main` deploy automatically to https://promly-eight.vercel.app.
- Master prompt §25 ("start implementing immediately, don't stop") is overridden: we go step by step.

---

## 9. Master prompt sections: what applies

| Master § | Status |
|---|---|
| 1–2 Product, stage demo | ✅ applies |
| 3 Priorities | ✅ P0 → then override order; ❌ P2 skipped |
| 4 Tech stack | ✅ applies |
| 5–7 Design, dashboards | ✅ in phase 5 (polish); functional versions in P0 |
| 8 Marketplace | ✅ (Norway + Spain, NOK + EUR, seed category list) |
| 9 Marketing Studio | ❌ removed 8 Nov: sharing tools only (link, QR, WhatsApp, native share) |
| 10 Video creator | ❌ removed 8 Nov |
| 11 AI content | ❌ none |
| 12 Referral links and sharing | ✅ |
| 13 Booking page | ✅ |
| 14 Realtime | ✅ |
| 15 Commission engine | 🔁 **replaced** by section 2 above (fee on top, 2.75%) |
| 16 Demo wallet | 🔶 pending / available / payout dates; withdrawals only if time allows |
| 17 Demo Control Center | 🔶 Prepare Stage Demo + Health Check |
| 18–19 Demo accounts, campaigns | ✅ |
| 20 Database | 🔁 **replaced** by section 4 above (~9 tables) |
| 21 Tests | 🔁 **replaced** by section 7 above |
| 22–24 Deploy, script, definition of done | ✅ (video item → video *or* PNG fallback) |
| 25 Autonomous execution | ❌ overridden by our step-by-step workflow |
