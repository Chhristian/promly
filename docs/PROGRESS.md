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
