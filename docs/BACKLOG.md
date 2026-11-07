# Backlog

Feature freeze: **Sunday 8 Nov, 11:00**. Deadline: Sunday 14:00. Work top to bottom.

## Now: UI/UX pass (follow `docs/DESIGN.md`)

- [ ] **1. Audit:** screenshot the landing page, login/sign-up, promoter dashboard, Explore, promoter campaign page, Marketing Studio, business dashboard, campaign editor, booking detail, customer booking page and confirmation, at 1280×720 and phone size. Write the 10 biggest improvements to `docs/PROGRESS.md`, ranked by impact on the stage demo.
- [ ] **2. Apply the 10 improvements one at a time.** After each: unit tests, build, commit, push, check on the live site.
- [ ] **3. Animation pass** (improve-animations) on the live moments: new campaign, "Alex joined", new booking, verified, "+100,00 kr available".
- [ ] **4. Break-UI check:** very long names, large amounts, empty states, 50 bookings. Fix anything that breaks.
- [ ] **5. Final:** new screenshots next to the old ones, a before/after summary in `PROGRESS.md`, the full e2e suite, demo reset, commit, push.

## Next

- [x] README.md for the jury (done in step 14)
- [ ] Promoter leaderboard on the business dashboard
- [ ] Performance pass on a phone over slow 4G
- [ ] Accessibility pass (contrast, focus states, labels)

## Rules

- No new features in the UI pass, and no changes to money logic or the stage flow.
- Only one process ever runs e2e tests, resets the demo or deploys.
