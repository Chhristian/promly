# Promly — Stage Demo Runbook

**Live site:** https://promly-eight.vercel.app
**What the audience sees:** a business publishes an offer → a promoter joins and shares a link → a customer books on a phone → the business verifies → the promoter's commission appears live. No page refreshes.

Everything shown is real database activity. The only simulated step is the clearly labelled **"Simulate end of refund window"** (Demo Mode). No real money moves. Both businesses are illustrative demo businesses.

---

## Roles and devices

| Who | Device | Logged in as | Page to have open |
|---|---|---|---|
| **A — Business founder** | Laptop (projected) | Demo Barber Club · `demo-barber@example.com` | `/business` |
| **B — Promoter founder** | Second laptop or phone (mirrored if possible) | Alex · `demo-alex@example.com` | `/promoter/explore` |
| **C — Customer** | A phone (no login) | — | Camera app ready to scan a QR code (backup: WhatsApp chat with B) |
| Admin (backstage) | Any device, separate browser profile | Promly Admin · `demo-admin@example.com` | `/admin/demo` |

Passwords are **only** in `.env.local` (`DEMO_BUSINESS_PASSWORD`, `DEMO_PROMOTER_PASSWORD`, `DEMO_ADMIN_PASSWORD`). Copy one to the clipboard without showing it (PowerShell, in the project folder):

```powershell
((Get-Content .env.local | Select-String '^DEMO_BUSINESS_PASSWORD=').Line -split '=',2)[1] | Set-Clipboard
```

Hand passwords to the other founder privately (password manager), never in a chat or on a slide.

---

## BEFORE (start 30 minutes before you go on)

1. **Internet**
   - Join the venue wifi on all devices **and** pre-join a phone hotspot on every device as a backup.
   - Test the switch once: turn wifi off → device joins the hotspot → the green **Live** dot in the app header comes back by itself (or tap **↻**).
2. **Log in on each device** (do it now, not on stage). Use a normal browser window; sessions stay logged in.
   - A → `/business`, B → `/promoter/explore`. Check the dot in the header says **Live** (green).
   - C → test the camera scans a QR code (any QR). Set the phone's default browser to a private/incognito tab if possible. Backup: WhatsApp chat with B open.
3. **Reset the demo** (≈5 seconds) — either:
   - Admin device: `/admin/demo` → **Prepare Stage Demo** → "✓ Demo ready", or
   - Terminal: `npm run reset-demo`
   Result: both campaigns are **drafts** with accepted agreements, no bookings, no joins, fresh hourly time slots **08:00–22:00 Oslo time**, today and the next 3 days. **Reset on the day of the demo** so today's slots exist.
4. **Run Demo Health Check** on `/admin/demo`. Every line must be green:
   database reachable · 4 demo accounts · realtime connects · fee maths 500 NOK → 13.75 · free slots today and tomorrow · live site responding.
   Anything red → fix it or switch to the backup video.
5. **Reload A and B** after the reset so their screens show the fresh state (A: Premium Haircut is *draft*; B: Explore is empty).
6. **Backup video** — record one full rehearsal the day before:
   - Windows: `Win + Alt + R` (Xbox Game Bar) records the screen; iPhone: Control Centre → Screen Recording.
   - Or record all three browsers automatically: `E2E_VIDEO=1 npm run test:e2e` → videos in `test-results/` (no sound).
   Keep it on the presenting laptop's desktop, ready to play.
7. Brightness up, notifications off (Do Not Disturb) on all devices, browser zoom ~110–125% on the projected laptop.

---

## DURING — exact clicks and what appears

| # | Who | Do this | What appears |
|---|---|---|---|
| 1 | **A** | On the dashboard, click the **Premium Haircut** campaign card. | Campaign page: *draft*. Boxes show **Promoter earns 100,00 kr · Promly fee 13,75 kr · You pay 113,75 kr**. Agreement v1 accepted. |
| 2 | **A** | Click **Publish**. | "Published! Promoters can see it now." Badge turns *published*. |
| 3 | **B** | Just watch Explore. Don't touch anything. | **Premium Haircut — You earn 100,00 kr** appears with a glowing **NEW** badge, no refresh. |
| 4 | **A** | Click **Dashboard** in the top nav. | Dashboard with 0 kr everywhere. |
| 5 | **B** | Tap the **Premium Haircut** card. | Campaign page with the agreement (yellow label "Agreement template, to be reviewed by a lawyer before real use"). |
| 6 | **B** | Tick **"I have read and accept this agreement."** → **Accept & join**. | "Your personal link" box with the link and **Copy link**. |
| 7 | **A** | Just watch. | Activity: **"Alex joined your campaign."** with **NEW**. Promoters: 1. |
| 8 | **B** | Tap **⛶ Show QR full screen** and hold the screen toward C (or show it on the projector). *Backup:* tap **💬 WhatsApp** and send the prepared message to C. | A big QR code with "Premium Haircut · scan to book". |
| 9 | **C** | Point the camera at the QR → tap the link that pops up. | Booking page: *Demo Barber Club · Oslo — Premium Haircut — 500,00 kr*, days and times. No login. |
| 9b | **B** | Tap anywhere to close the QR, then tap **Dashboard** in the top nav. | B's dashboard: Available 0,00 kr, Pending 0,00 kr. |
| 10 | **C** | Tap a **time** → type a name and phone → **Book …**. | **"You're booked!"** with the time. |
| 11 | **A** | Just watch. | **"New booking received — Premium Haircut"** with **NEW**. Recent bookings: *Awaiting service*. |
| 12 | **A** | Click that booking. | Customer name and phone, **Referred by Alex**, frozen terms: 500 · 100 · 13,75 · **113,75 kr**. |
| 13 | **A** | Click **Verify service completed**. | "✓ Service verified — commission pending until the refund window ends." |
| 14 | **B** | Just watch. | Commission row *Verified · commission pending*, **Pending 100,00 kr**, NEW. |
| 15 | **A** | In the yellow **Demo Mode · simulated** box click **Simulate end of refund window**. | "✓ Commission available to the promoter." |
| 16 | **B** | Just watch. | **Available 100,00 kr** (big, gradient), Pending 0,00 kr, "Commission is now available." with NEW. |
| 17 | **A** | Click **Dashboard**. | Verified sales **500,00 kr** · Commission available **100,00 kr** · Platform fees **13,75 kr** · Total cost **113,75 kr** · next payout date. |

**If a screen doesn't update within ~3 seconds:** tap **↻** in the header (the dot shows Live / Connecting / Offline). Data is always correct after a refresh.
**If the time slot is taken** ("Someone just booked that time"): tap another time.
**If anything looks wrong before you start:** Prepare Stage Demo again (≈5 s) and reload A and B.

**Optional, if you have 10 extra seconds (after step 6):** B taps **Create promo text →** → Marketing Studio → **WhatsApp recommendation**. Ready-made text with the business's own description, the price, the link and an honest "I earn a commission" note. Only channels the agreement allows are offered. Then go back and continue with step 8.

---

## 60-second version

Pre-open everything as in BEFORE. Skip reading the agreement aloud.

| Time | Say | Do |
|---|---|---|
| 0:00 | "This barbershop needs customers. On Promly it offers 100 kroner for every verified booking." | A: open Premium Haircut → **Publish** |
| 0:10 | "Alex wants to earn. The offer just appeared on Alex's phone — live." | B: card appears → tap → tick → **Accept & join** |
| 0:20 | "Alex gets a personal link and a QR code to share anywhere." | B: **Show QR full screen** → C scans. A: "Alex joined" appears |
| 0:30 | "A friend books a haircut. No app, no account." | C: open link → time → name/phone → **Book** |
| 0:40 | "The barber sees the booking instantly, and confirms the haircut happened." | A: "New booking" → open → **Verify** |
| 0:48 | "After the refund window — simulated here — the money is Alex's." | A: **Simulate end of refund window**. B: **100,00 kr available** |
| 0:55 | "Businesses get customers. People get paid." | Point at both screens |

---

## 2-minute version (2-minute pitch + 1 minute of questions)

| Time | Say | Do |
|---|---|---|
| 0:00–0:15 | **Problem.** "Local businesses pay for ads whether or not a customer ever shows up. Meanwhile millions of people already recommend places to friends — for free." | Title slide / landing page |
| 0:15–0:25 | **Promise.** "Promly flips it: businesses only pay for verified customers, and anyone can earn by bringing them. Businesses get customers. People get paid." | A's dashboard |
| 0:25–0:40 | "Demo Barber Club sets a 100-kroner commission on a 500-kroner haircut, accepts a standard agreement, and publishes." | A: steps 1–2 (point at 100 / 13,75 / 113,75) |
| 0:40–0:55 | "Alex has never done marketing. The offer appears on Alex's phone instantly. Alex reads the terms and joins." | B: steps 3, 5–6 |
| 0:55–1:05 | "Alex gets a personal link, a QR code and ready-made texts — for any channel the business allows." | A: step 7 "Alex joined". B: step 8 (QR full screen) |
| 1:05–1:20 | "A friend scans and books — on a phone, no account." | C: steps 9–10. B: step 9b. A: step 11 "New booking" |
| 1:20–1:35 | "The barber confirms the haircut happened. The commission is pending until the refund window closes — here we simulate that." | A: steps 12–13, 15 (show the yellow Demo Mode label) |
| 1:35–1:45 | "And Alex just earned 100 kroner. Real data, live, on two devices." | B: step 16 |
| 1:45–2:00 | **Model.** "Promoters keep 100% of the commission. Businesses pay Promly 2.75% of the booking on top — 13.75 kroner here, only when a customer is verified. We're starting with barbers and experiences in Oslo and Spain." | A: step 17 dashboard |

### Likely questions (1 minute)

- **"How do you stop fake bookings?"** — Commission only starts when the *business* verifies the service, and stays pending through a refund window. Promoters can never create or approve commissions; that's enforced in the database.
- **"What if the customer gets a refund?"** — Before payout the commission is reversed with a new ledger entry. Every money movement is an append-only record.
- **"Why would a business pay more than ads?"** — They pay only for customers who actually showed up: 113.75 kroner for a 500-kroner sale, nothing for clicks.
- **"Is this legal / who handles payouts?"** — The agreement is a standard template marked for lawyer review. Payouts are simulated today; real payouts come with a licensed payment provider and identity checks.
- **"Isn't this just affiliate marketing?"** — For local services that never had affiliate programs, with booking, verification and payout built in, and simple enough for anyone.

---

## AFTER

1. **Reset immediately** so the next run (or the judges trying it) starts clean:
   `/admin/demo` → **Prepare Stage Demo**, or `npm run reset-demo`.
2. Optional: **Run Demo Health Check** again.
3. Log out on shared or borrowed devices (**Log out** in the header).

---

## Reference

- Reset from terminal: `npm run reset-demo` · Health check + full flow test: `npm run test:e2e` (resets before and after).
- Demo accounts are recreated (same passwords from `.env.local`) with `npm run seed-demo`.
- Numbers: price 500,00 kr · commission 100,00 kr (promoter keeps 100%) · Promly fee 2.75% of price = 13,75 kr · business pays 113,75 kr per verified booking.
- Spain campaign (if asked about Spain / EUR): Jet Ski Adventure 150,00 € · commission 20% = 30,00 € · fee 4,13 € · business pays 34,13 €. Log in as `demo-watersports@example.com` (`DEMO_SPAIN_BUSINESS_PASSWORD`).
- Refund before payout: open a verified booking → **Refund** → the commission is reversed with new ledger entries ("Refund → pending charge cancelled").
