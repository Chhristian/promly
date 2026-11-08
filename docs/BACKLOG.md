# Demo polish (8 Nov, branch demo-polish)

| # | Item | Status |
|---|---|---|
| 0 | Pause "Premium bilvask", "Bilvask", "jjjj" (ids 266f00aa…, b0713dbb…, c33ce090…); PR #8 migration check | ✅ paused; PR #8 added no migration |
| 1 | Aged illustrative data (2–6 months, ~160 bookings, ledger sums to zero) + generated avatars, business tiles and campaign covers (`npm run demo-assets`) | ✅ (past Stripe invoices not created: they would need real Stripe test invoices on every reset) |
| 2 | Market selector Oslo/NOK vs Mallorca/EUR (cookie, default Oslo; no migration) | ✅ |
| 3 | Auth hardening (clear errors, min 10 chars, show/hide, 15 s timeout + Try again) | ✅ |
| 4 | Native share (link + QR PNG, #reklame text, copy fallback with "Link copied") | ✅ |
| 5 | Tests, screenshots (`C:\Users\chris\promly-screenshots-polish`), PR | ✅ unit 40/40; e2e 10 passed + 2 skipped (payments, flag off) and polish 2/2 after a test fix |


# Backlog

Feature freeze: **Sunday 8 Nov, 11:00**. Deadline: Sunday 14:00. Work top to bottom.

## Now: UI/UX pass (follow `docs/DESIGN.md`)

- [x] **1. Audit:** screenshot the landing page, login/sign-up, promoter dashboard, Explore, promoter campaign page, Marketing Studio, business dashboard, campaign editor, booking detail, customer booking page and confirmation, at 1280×720 and phone size. Write the 10 biggest improvements to `docs/PROGRESS.md`, ranked by impact on the stage demo.
- [x] **2. Apply the 10 improvements one at a time.** After each: unit tests, build, commit, push, check on the live site.
- [x] **3. Animation pass** (improve-animations) on the live moments: new campaign, "Alex joined", new booking, verified, "+100,00 kr available".
- [x] **4. Break-UI check:** very long names, large amounts, empty states, 50 bookings. Fix anything that breaks.
- [x] **5. Final:** new screenshots next to the old ones, a before/after summary in `PROGRESS.md`, the full e2e suite, demo reset, commit, push.

## Next

- [x] README.md for the jury (done in step 14)
- [ ] Promoter leaderboard on the business dashboard
- [ ] Performance pass on a phone over slow 4G
- [ ] Accessibility pass (contrast, focus states, labels)

## Rules

- No new features in the UI pass, and no changes to money logic or the stage flow.
- Only one process ever runs e2e tests, resets the demo or deploys.
