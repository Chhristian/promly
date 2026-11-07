# Promly — Design brief

**Refine, don't redesign.** Same product, same flows, same brand. The goal is that Promly reads instantly on a projector at 1280×720 and on a phone, and feels calm, fast and trustworthy, like a real fintech product rather than a template.

Sources: our own brief, plus the `frontend-design` and `apple-design` skills (installed at user level, not in this repo).

## Fixed (don't change)

- Dark navy background, purple → electric-blue gradient, white text, the current Promly logo. No light theme.
- No new features. No changes to the money logic, the database or the stage flow.
- Money figures stay the biggest, most readable thing on every dashboard.

## Principles

1. **One obvious primary action per screen.** It is the only gradient button on the screen. Everything else is secondary (solid surface) or ghost.
2. **The gradient is an accent, not a wash.** Use it for the one primary action, the hero money figure and the logo. Don't use it for every number, badge or price.
3. **Hierarchy comes from size + weight + spacing**, not from more boxes. Fewer borders and nested cards, more air.
4. **Crisp type scale.** Tighten large text (negative tracking), keep body text at 0. Use sentence-case labels. All-caps tracked eyebrows are a template tell, so keep them to a minimum.
5. **Calm, fast, purposeful motion.** 150–300 ms, ease-out, transform and opacity only. Motion responds to *real* database events or to the user's own action, never to timers or fake activity. Respect `prefers-reduced-motion`: use a short cross-fade instead of movement.
6. **Feedback where it matters.** There are four kinds: status, completion, warning and error. An empty screen invites the next action, and an error says what happened and what to do.
7. **Stage-readable.** At 1280×720, body text ≥ 16 px, labels ≥ 14 px and the hero money ≥ 48 px. On phones, nothing overflows horizontally and tap targets are ≥ 44 px.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--background` | `#0b0e1f` (hsl 232 47% 7%) | Page |
| `--card` | `hsl 232 40% 11%` at ~70% | Surfaces |
| `--border` | `hsl 232 30% 22%` | Hairlines |
| Text | `#f3f5fb` / muted `hsl 226 22% 70%` | Body / secondary |
| Brand gradient | `#8b5cf6 → #3b82f6` | Primary action, hero money, logo |
| Success | `#34d399` | Money available, verified |
| Warning | `#fbbf24` | Pending, Demo Mode |

**Type** (Geist, one family):

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Hero money | 48–60 px | 800 | −0.03em |
| Page title | 30–36 px | 700 | −0.02em |
| Section title | 18–20 px | 600 | −0.01em |
| Body | 16–17 px | 400 | 0 |
| Label | 14 px | 500 | 0, sentence case |

**Motion:**

| Token | Value |
|---|---|
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` |
| `--dur-fast` | 150 ms (press, hover) |
| `--dur-base` | 220 ms (enter, toast) |
| `--dur-slow` | 300 ms (the money moment's scale) |

The highlight glow fades over ≤ 2.5 s, which is a colour change, not movement.

## Live moments (in priority order)

These are the only animations triggered by data. Each fires only when the real database change arrives.

1. **New campaign appears** on Explore: the card enters (opacity + 8 px rise, 220 ms) with a brief ring.
2. **"Alex joined"**: toast, and the activity row enters.
3. **New booking**: toast, and the booking row enters.
4. **Verified**: toast, and the status badge changes colour.
5. **"+100,00 kr available"**: the money toast, and the Available figure pulses once (scale 1 → 1.03 → 1, 300 ms) with a green ring that fades.

Under reduced motion, all of these become opacity-only, with no scale and no movement.

## Avoid (generic template tells we currently have)

- Uppercase tracked eyebrow labels above every heading ("BUSINESS DASHBOARD").
- Gradient text on every money figure and price.
- Every piece of content in an identical bordered card.
- Long `·`-joined meta strings that wrap badly on phones.
