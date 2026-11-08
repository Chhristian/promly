# Morning report: payments and settlement (Sun 8 Nov, 01:30)

## Needs you

1. **Stripe Connect: accept loss liability** in the sandbox Dashboard (Connect → Platform profile,
   `dashboard.stripe.com/settings/connect/platform-profile`).
   - Until then, Stripe refuses to create promoter payout accounts.
   - So "Set up payouts with Stripe" shows a polite error, and the payout e2e test is **skipped**, not passed.
   - Everything else works.
   - Afterwards, run `E2E_PAYMENTS=1` e2e again; I expect the payout step to need a short test run to confirm.
2. **Optional: swap the full `sk_test_` key for a restricted `rk_test_` key.** Permissions are in `docs/PAYMENTS.md`.
3. **Webhooks on the preview need `stripe listen` running on a machine.** Command in `docs/PAYMENTS.md`. Vercel protects previews, so Stripe can't call them directly.
   - The production webhook endpoints exist but are **disabled** until payments are merged.
   - Alternative: allow Vercel "Protection Bypass for Automation" for webhooks. That's a protection setting, so it's your call.
4. **Lawyer / accountant list** in `docs/PAYMENTS.md`:
   - VAT on the fee
   - whether commission is Promly revenue or collected for promoters
   - reporting payouts to Skatteetaten
   - whether a guardian can receive payouts for a minor

## What works (preview, Stripe test mode)

Preview: **https://promly-git-payments-christian-45cf.vercel.app** (branch `payments`, `PAYMENTS_ENABLED=true`, not merged).

- **Database (migration applied):**
  - invoices, invoice lines (with credit lines), payouts, Stripe account/customer ids, age bands, campaign age ratings, clawbacks, webhook dedupe
  - all money functions server-only, with RLS on every table
  - the live site ran the full e2e suite **8/8 after the migration**
- **Business:**
  - **Billing** tab: one invoice per month, a line per booking, Stripe-hosted "Pay on Stripe" link, overdue banner
  - **16+/18+** choice and an "age-restricted" tick in the campaign editor
  - nightlife, club and alcohol categories are always 18+
- **Promoter:**
  - **Earnings** tab with statuses and dates: Pending → Final → Invoiced → Paid by business → Paid out, plus "Awaiting business payment"
  - payout setup: own Stripe account at 18+, or a guardian (with consent) at 16–17
  - age band asked at sign-up
- **Admin Demo Control Center** (test mode):
  - Simulate end of 14-day holding period
  - Create this month's invoices (real Stripe invoices)
  - Pay test invoice (Stripe test card)
  - Run payouts
- **Webhook:** `/api/stripe/webhook` verifies the signature on every request (unsigned or forged → 400) and deduplicates events. It is the **only** thing that marks an invoice paid; confirmed end to end with `invoice.paid` → 200.
- **Agreement template v2** for new agreements: 14-day finality, 7-day verification, invoicing, payouts only from paid money, guardian rule, business liable for its own payment disputes. The lawyer label is kept, and v1 agreements are unchanged.
- **Demo reset** clears demo invoices and payouts. Demo promoter Alex is set to 18+. Demo agreements stay v1, because production shares the database.

## Test results

| Suite | Result |
|---|---|
| Unit (Vitest), incl. `payments.test.ts` + `payments-db.test.ts` (PGlite replay of every migration, 105 database checks) | **42/42** |
| Full e2e on the preview, payments on (`E2E_PAYMENTS=1`) | **9 passed, 1 skipped** (payout: Stripe Connect setting above) |
| Stage-demo e2e (unchanged) on the preview and on the live site after the migration | passed |
| Build | passes |

Screenshots (Billing, Earnings, payout setup, sign-up age question, campaign age rating, admin buttons; desktop and phone) were checked on the preview. Demo reset at the end.

## What's left

- **Payouts end to end:** blocked by the Connect setting above; the code is written.
- **Monthly schedule:** no cron yet for the monthly invoice run, the daily "final after 14 days" and "cancel if not verified in 7 days" jobs, or the payout run. Today they run from the admin buttons. The database functions exist (`finalize_due_bookings`, `cancel_unverified_bookings`).
- **Bank-transfer invoices:** NOK invoices offer card only (Stripe has no NOK bank transfer). EUR bank transfer is a TODO for the Mallorca pilot, together with Spanish promoters on Stripe's full account agreement.
- **Fraud clawback:** there's no admin screen for it yet; the database function and invoice credits are done and tested.
- **Merge:** not merged. On merge, enable the two production webhook endpoints in Stripe and set `PAYMENTS_ENABLED` for production when you're ready.

---

# Progress — UI/UX pass

Brief: `docs/DESIGN.md`. Audit screenshots: every listed screen at 1280×720 and phone size, taken on the live site with real demo data.

## Top 10 improvements, ranked by impact on the stage demo

| # | Screen | Problem seen in the screenshots | Fix | Status |
|---|---|---|---|---|
| 1 | **Booking detail** (stage steps 12–15) | At 1280×720, **Verify service completed** and **Simulate end of refund window** are below the fold, so the founder has to scroll on stage. | Put the status and the action first, directly under the title. Customer, terms and timeline follow. | ✅ done |
| 2 | **Promoter campaign page** (stage steps 6–8) | After joining, the page lands scrolled mid-way. The share card with **Show QR full screen** competes with a long agreement. | When joined, the "Your personal link" card with the QR actions comes right after the price. The accepted agreement folds into an expandable section. | ✅ done |
| 3 | **Business dashboard** (stage steps 7, 11, 17) | At 1280×720 the live areas (Recent bookings, Activity) start near the bottom edge. The second row of 4 KPI cards pushes them down. | Shrink the secondary KPIs into one slim row and tighten the header, so bookings and activity are visible without scrolling. | ✅ done |
| 4 | **Campaign editor** (stage steps 1–2) | **Publish** is a small corner button. The money summary is small (18 px) and centred. | Publish becomes the one big primary action with "Promoters see it instantly", and the money summary gets larger left-aligned figures. Pause stays secondary. | ✅ done |
| 5 | **Marketing Studio → Promo image** | At 1280×720 the preview is cut off below the fold, so the image can't be seen on stage. | Fit the preview to the viewport height (sticky, max ≈ 72vh). | ✅ done |
| 6 | All screens | The gradient is everywhere: every submit button, many prices and figures. Several screens have two gradient buttons. | One gradient (primary) action per screen; other buttons become solid secondary. Gradient text only on the hero money figure. | ✅ done |
| 7 | **Customer booking page** (stage steps 9–10) | "Pick a time to book" looks like an active gradient button before a time is chosen. | Show it as disabled until a slot is selected, then it lights up as "Book Sunday 14:00". | ✅ done |
| 8 | All screens | All-caps tracked eyebrows ("PROMOTER DASHBOARD", "MARKETPLACE", "YOU EARN") are a template tell. Headings and money use no tracking. | Sentence-case labels or no eyebrow; negative tracking on headings and money; a crisp type scale. | ✅ done |
| 9 | **Promoter dashboard** (stage steps 14, 16) | The Available figure is big but competes with equally weighted cards and two header buttons. | The hero Available grows (≈60 px on desktop), the secondary tiles get quieter, and there's one primary header action. | ✅ done |
| 10 | **Phones** | Amounts wrap mid-value ("+113,75 kr / owed"), and long "·"-joined meta lines break awkwardly. | Keep amounts on one line (`whitespace-nowrap`, tabular numbers) and let meta lines wrap at separators. | ✅ done |

## Log

Each change: unit tests ✓, build ✓, pushed, auto-deployed, then checked on the live site with a 1280×720 or phone screenshot.

- `ab6c3b9` UI #1: booking detail puts the action above the fold
- `01a6a9e` UI #2: joined campaign page leads with the share card; agreement folds away
- `d1b14c6` UI #3: business dashboard keeps bookings and activity above the fold
- `01abe2f` UI #4: campaign editor has one clear Publish panel with the money summary
- `d8ac20d` UI #5: promo image preview always fits the screen
- `5a71e34` UI #5: size the promo preview from the space below the header
- `961436c` UI #6: one gradient primary action per screen; solid selected states
- `b6be7e4` UI #7: booking button stays disabled until a time is chosen
- `e20b1a2` UI #8: drop all-caps eyebrows, sentence-case labels, tighter heading tracking
- `99f7cee` UI #9: promoter's Available is the hero figure with its payout date
- `f1f33b0` UI #10: money figures never wrap or overflow on phones
- Live checks: the booking detail's Verify button is above the fold; the joined campaign page shows the link and QR actions without scrolling; the business dashboard shows Activity at 1280×720; the editor has one Publish panel; the full Story preview fits at 1280×720; Show QR full screen is the only gradient button; money never wraps on phones.

## Animation pass (improve-animations)

The audit covered the live moments only; the plans live in the git-ignored `plans/` folder. Done in `479a5ba`:

- **Motion tokens** (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, 150 / 220 / 300 ms) and a **reduced-motion** block: live moments become short opacity fades with no movement, and the loading shimmer stops.
- **New campaign, "Alex joined", new booking rows:** a 220 ms entrance (8 px rise and fade), then a ring that only fades its opacity. This replaces a 6 s `box-shadow` animation that repainted every frame.
- **"+100,00 kr available":** one 300 ms pop (scale to 1.03), then a green glow that fades its opacity (was 2.4 s of scale plus shadow).
- **Toasts:** 220 ms in, a 160 ms fade-out before removal (they used to vanish), and the dismiss button also fades.
- **Buttons:** 0.97 press feedback over 150 ms. Explore cards only lift on hover with a mouse (not on touch), and status badges cross-fade colour in 200 ms.
- Every animation is still triggered only by real database events; the e2e test checks the money toast.

## Break-UI check

Throwaway accounts with a 120-character business and service name, an 80-character promoter name, a 9 999 999 kr price with a 2 500 000 kr commission, 50 bookings (20 verified, 10 available) and empty states. No screen overflowed horizontally. Fixed in `ceba81e`:

- Large amounts were clipped or overlapped in the business stat cards; long amounts now step down in size to fit.
- A long promoter name wrapped the header's user badge; it now truncates.
- On Explore cards, long titles and business names broke the layout, and a huge commission overlapped the price. Titles now clamp to 3 lines, the business name and city sit on separate lines, and the price row wraps.
- The Marketing Studio campaign dropdown grew wider than the page; it is now limited to the page width.
- In the bookings list on phones, badges stretched full width and long titles took 4 lines; badges keep their size and titles clamp to 2 lines.
- On booking detail and campaign pages, a 120-character title made a 6-line headline that pushed Actions below the fold; titles now clamp to 3 lines and are smaller on phones.

The throwaway accounts were deleted, and the stress business was removed by the demo purge.

## Before → after

Side-by-side screenshots of all 36 captures (1280×720 and phone) were taken on the live site, with the before version on the left.

| Screen | Before | After |
|---|---|---|
| Booking detail | Verify / Simulate below the fold at 1280×720 | Actions panel first, with commission and total beside it |
| Promoter campaign page | Opened scrolled into the agreement | Opens on the link, QR and **Show QR full screen** (primary); agreement folded |
| Business dashboard | Activity barely visible | KPI strip, so Activity and bookings are visible |
| Campaign editor | Small corner Publish button, 18 px figures | One Publish panel, 30 px figures, "Promoters see it instantly" |
| Marketing Studio | Promo preview cut off | The whole Story or Post fits on screen |
| Promoter dashboard | All-caps eyebrow, 48 px Available | ≈60 px hero Available with the payout date; Pending quieter |
| Customer booking | Gradient "Pick a time" looked clickable | Disabled until a time is chosen |
| Everywhere | Many gradients, all-caps labels, wrapping amounts | One primary action per screen, sentence case, tighter headings, amounts on one line |

---

# Full redesign ("Payout slip"), branch `redesign`

Brief: `docs/DESIGN.md`. Product logic, money maths, database/RLS, the stage flow and realtime behaviour are unchanged. Every animation still answers a real database event.

## What changed

- **Theme:** dark navy with purple→blue gradients became a light, cool paper background with ink text. It reads better on a projector.
- **Brand colours:**
  - one cobalt for the brand and the primary action
  - highlighter yellow only for money that is yours, fresh rows and the selected time
  - green for paid, amber for pending
- **Type:** Geist became **Schibsted Grotesk**, drawn for the Oslo media house Schibsted. Headings are ExtraBold with tight tracking, and money is big and black.
- **Logo:** a cobalt tile with a lowercase **p** and a yellow "punched coin" dot, and the lowercase `promly` wordmark in ink (no gradient).
- **Layout:**
  - **Lists:** bookings, campaigns, the money log and promoters are *ledgers* (one panel with hairline rows) instead of stacks of floating cards.
  - **Activity:** a timeline with a rail.
  - **Hero element:** each screen has one dark "payout slip".
- **Screens:**
  - **Landing:** a typographic hero, "Share a link. Get paid when they show up." Next to it is an *example* payout slip computed with the real money functions (500 kr booking → you earn 100 kr; the business pays 113,75 kr). Below are three steps and the two sides.
  - **Promoter dashboard:** the payout slip shows Available as a 72 px figure on a highlighter block, with Pending, clicks and bookings in the same slip.
  - **Business dashboard:** a statement panel with four figures divided by hairlines, plus a row of counts.
  - **Explore:** ticket-stub cards with a perforation and "You earn" as the big figure.
  - **Promoter campaign page:** joined campaigns get a compact header, so the link and QR actions stay above the fold. Otherwise the cover, price and an ink "You earn" panel show.
  - **Booking detail and campaign editor:** the action panel has an ink border (Verify / Simulate / Publish), terms look like a receipt, and the money log is a ledger.
  - **Customer booking:** the day picker is ink, the selected time is highlighter yellow, and the big Book button is disabled until a time is chosen. The confirmation shows the time on an ink ticket.
  - **Studio and the promo image PNG:**
    - the ink background replaces navy with a violet glow
    - the price sits on a highlighter block
    - the new mark appears
    - covers without a photo are flat tints
    - the business line is no longer in capitals
- **Motion:**
  - A live row now draws a yellow marker band in from the left (scaleX, 300 ms) that fades over 2.4 s.
  - On the money moment, the Available figure pops once and its highlighter draws in.
  - Toasts are white (the money toast is ink with a yellow icon).
  - With reduced motion there's no movement, only fades.
- **Removed:** gradient text, glowing shadows, purple, monospace link text, "→" in copy, and "·"-joined meta lines (now commas).

## Checks

- Unit tests 19/19, `npm run build` OK after every batch.
- Full e2e suite 8/8 against the Vercel preview. The tests needed no wording changes. A helper (`tests/e2e/preview-access.ts`) attaches the short-lived local Vercel token only to requests for the preview, so protected previews can be tested without disabling Deployment Protection.
- Break-UI check on the preview (120-character names, 9 999 999 kr price, 50 bookings, empty states): no horizontal overflow. Fixes: huge amounts step down further on phones, long activity titles and the promoter greeting clamp to two lines.
- At 1280×720 the booking detail's actions, the joined campaign's link and QR actions, and both dashboards' lists and Activity stay above the fold.
- Before/after screenshots of all 36 captures were taken on the preview; the old design is on the left.
