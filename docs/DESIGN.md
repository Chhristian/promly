# Promly design: "Payout slip"

A full redesign on the `redesign` branch. Product logic, money maths, database/RLS, the stage flow and realtime behaviour are unchanged. Every animation still answers a real database event.

**Audience (8 Nov):** businesses with an **online checkout**: tours, rentals, experiences, event and club tickets, classes and memberships. Copy, categories and demo content speak to them, never to walk-in shops. There is no Marketing Studio: promoters get the sharing tools (copy link, QR code, WhatsApp, native share) and one plain line, "Mark your posts as advertising (#reklame) and follow the business's brand rules." Logged-in pages carry a quiet "Illustrative demo data" footer; nothing shows ratings, reviews or user counts.

## The concept in five lines

1. **Daylight, not night mode.** A cool paper-white app in Oslo daylight. Light themes stay readable on a washed-out projector, and dark navy didn't.
2. **Money is printed, not glowing.** Amounts are set big, black and tabular, like a receipt or payout slip. The one loud colour is a **highlighter yellow** that marks money that just became yours.
3. **Cobalt is the brand.** One saturated cobalt for the brand and the single primary action per screen. Nothing else is blue.
4. **Lists are ledgers.** Bookings, campaigns and activity are rows in one panel with hairline dividers, not stacks of floating cards.
5. **Made in Oslo.** Type is Schibsted Grotesk, drawn for the Oslo media house Schibsted. It's sturdy and newsy, with strong numerals.

## Tokens

| Token | Hex | Use |
|---|---|---|
| `paper` | `#F2F4F7` | Page background |
| `surface` | `#FFFFFF` | Panels, inputs |
| `ink` | `#0D1B2A` | Text, the dark "slip" hero panel |
| `ink-muted` | `#566476` | Secondary text (5.6:1 on white) |
| `line` | `#DDE3EA` | Hairlines and borders |
| `cobalt` | `#2440F0` | Brand, primary action, links, focus ring |
| `marker` | `#FFE14D` | Highlighter: fresh money, "New" rows, selected time slot |
| `paid` | `#0A7F4F` | Available / paid / verified-positive |
| `pending` | `#9A5B00` on `#FFF1D6` | Pending / awaiting service |
| `danger` | `#C62828` | Refund, errors |

- **Radius by hierarchy:** hero panels 24 px, panels 16 px, rows and inputs 10 px, chips are fully rounded. No single radius on everything.
- **Shadows:** almost none. Panels sit on hairlines. Only floating things (toasts, the sticky header) get a shadow.
- **Type scale (1.25):** 13 / 15 / 17 / 21 / 26 / 33 / 41 / 52 / 72 px. Headings use weight 800 with tracking from −0.03em (display) to −0.01em (h3). Body is 15–17 px at weight 400 with 1.5 leading. Money is always `tabular-nums`, weight 800.
- **No all-caps labels, no eyebrows, no `→` on buttons, no gradient text.**

## Logo

- **The mark** is a cobalt rounded tile with a white lowercase **p**. A small yellow dot sits where the bowl closes: the "punched" coin of a payout slip.
- **The wordmark** is `promly` in Schibsted Grotesk ExtraBold, lowercase and tightly tracked, in ink.

## Layout

- **Shell:**
  - A white top bar with a hairline: the logo, a segmented nav (ink pill for the active page), the live dot and the account.
  - On phones the nav is a scrollable segmented row under the bar.
  - Content is left-aligned on a 6xl grid.
- **Promoter dashboard:**
  - One **ink "slip" panel** is the hero: Available as a 72 px white figure with its payout date. Pending, clicks and bookings are quiet figures in the same slip, separated by hairlines.
  - The commissions ledger and the campaigns ledger sit below, with Activity as a timeline on the right.
- **Business dashboard:**
  - A white **statement panel** with four figures divided by hairlines, plus one row of small counts.
  - The campaign ledger, the bookings ledger, and Activity on the right.
- **Landing page:**
  - A typographic hero: "Refer a sale. Get paid." with the line "Only when the customer actually shows up."
  - Beside it, a static example payout slip computed with the real money function (500 kr booking → 100 kr to the promoter, 113,75 kr paid by the business). It's labelled as an example, so it's never a fake live event.

## Motion (150–300 ms, ease-out, transform/opacity only)

Token: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`; durations 150 / 220 / 300 ms.

| Real event | Motion |
|---|---|
| Row arrives from the database (new campaign, join, booking, verified) | 220 ms rise + fade. The yellow marker band sweeps in behind the row's left edge (scaleX), then fades out over 2.4 s (opacity only) |
| Commission becomes available | The Available figure pops once (300 ms, scale 1.03). The marker swipe draws under the amount (scaleX 0→1, 300 ms) and stays for the session |
| Toast | 220 ms rise in, 150 ms fade out |
| Press | Buttons scale to 0.97 in 150 ms |

`prefers-reduced-motion`: there's no movement and no scale, only short opacity fades, and the marker appears without sweeping.

## Avoid

Gradients as decoration, glowing shadows, purple, dark navy, cards inside cards, all-caps tracked labels, decorative numbering, fake activity or counters, and animation that isn't answering a real event.
