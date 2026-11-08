# Promly brand palette

Six colours. They live as design tokens in `app/globals.css` (`:root`) and `tailwind.config.ts`. Use the tokens, not hex values. The look and the components are described in `docs/DESIGN.md`.

| Name | Hex | CSS variable | Tailwind | Use for |
|---|---|---|---|---|
| **Ink** | `#0D1B2A` | `--ink` | `ink`, `foreground` | Text, the dark payout slip and other dark cards, the logo's rim and handle |
| **Cobalt** | `#2440F0` | `--cobalt` | `cobalt`, `primary` | The primary colour: buttons, links, focus rings, checkboxes, the logo |
| **Paper** | `#F4F6FA` | `--paper` | `paper`, `background` | The page background |
| **White** | `#FFFFFF` | `--white` | `white`, `card` | Cards and panels on paper, text on cobalt and ink |
| **Yellow** | `#FFE14D` | `--yellow` | `marker` | Small accents only |
| **Muted** | `#5B6B7F` | `--muted-text` | `muted-foreground` | Secondary text: labels, hints, captions |

The values are stored as HSL channels (for example `--cobalt: 232 87% 54%`), so Tailwind opacity works: `bg-ink/50`, `text-cobalt/80`.

The shadcn/ui tokens point at the palette: `--background` → paper, `--foreground` → ink, `--card` → white, `--primary` and `--ring` → cobalt, `--muted-foreground` → muted, `--marker` → yellow. Change a colour in one place, in the palette block in `globals.css`.

## Rules

1. **Paper behind, white on top.** Pages are paper. Cards and panels are white. Big "money" moments, like the payout slip, are ink.
2. **One cobalt action per view.** Cobalt is for what you can click: the main button, links, focus rings. Don't use it for decoration or large areas.
3. **Yellow is an accent, never a surface.**
   - Use it for the amount on a dark slip, the highlighter under a figure, a "NEW" badge, and the logo's opening.
   - Never use it as a page or card background, a button, or for body text.
   - Yellow text only on ink. On paper or white it's unreadable (contrast about 1.3:1).
4. **Text is ink or muted.**
   - Body text is ink.
   - Secondary text is muted. Muted on paper is about 5:1, which passes WCAG AA for normal text.
   - Never put muted text on ink. Use white at reduced opacity there (`text-white/65`).
5. **Status colours are not brand colours.** Green `--paid` and amber `--pending` only show state (paid, waiting). Don't use them for decoration.
6. **No new colours** without updating this file and the palette block in `globals.css`.

## Exceptions: hex is allowed where CSS variables can't reach

- `lib/logo-mark.ts` (the logo's colours, shared by the inline logo, the canvas promo image and the icon files)
- `app/icon.svg`, `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico` (standalone icon files)
- `components/promo-image-maker.tsx` (draws on a canvas)
- `components/share-tools.tsx` (QR code colours)
- `themeColor` in `app/layout.tsx`

Keep these in sync with the table above.
