/**
 * Pure layout logic for the promo image (no DOM), so it can be unit-tested.
 * Text measuring is injected: the canvas uses ctx.measureText, tests use a stub.
 */

export type Measure = (text: string, fontSize: number) => number;
export type PromoFormat = "story" | "post";

export const FORMATS: Record<PromoFormat, { width: number; height: number; label: string }> = {
  story: { width: 1080, height: 1920, label: "Story 1080×1920" },
  post: { width: 1080, height: 1080, label: "Post 1080×1080" },
};

const ELLIPSIS = "…";

/** Break a word that is wider than maxWidth into pieces that fit. */
function splitLongWord(word: string, size: number, maxWidth: number, measure: Measure): string[] {
  const parts: string[] = [];
  let cur = "";
  for (const ch of word) {
    if (cur && measure(cur + ch, size) > maxWidth) {
      parts.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur) parts.push(cur);
  return parts;
}

/** Cut a line so that line + "…" fits. */
function withEllipsis(line: string, size: number, maxWidth: number, measure: Measure): string {
  let s = line.trimEnd();
  while (s.length && measure(s + ELLIPSIS, size) > maxWidth) s = s.slice(0, -1).trimEnd();
  return s + ELLIPSIS;
}

/**
 * Word-wrap text into at most maxLines lines, each no wider than maxWidth.
 * If it doesn't fit, the last line ends with "…".
 */
export function wrapLines(text: string, size: number, maxWidth: number, maxLines: number, measure: Measure): { lines: string[]; truncated: boolean } {
  const words = text.trim().split(/\s+/).filter(Boolean).flatMap((w) => (measure(w, size) > maxWidth ? splitLongWord(w, size, maxWidth, measure) : [w]));
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (measure(next, size) <= maxWidth) cur = next;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length <= maxLines) return { lines, truncated: false };
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = withEllipsis(`${kept[maxLines - 1]} ${lines[maxLines]}`, size, maxWidth, measure);
  return { lines: kept, truncated: true };
}

/** Largest font size (step 2 px) at which the text fits in maxLines without truncation; else minSize truncated. */
export function fitText(
  text: string,
  o: { maxWidth: number; maxLines: number; maxSize: number; minSize: number; measure: Measure },
): { size: number; lines: string[]; truncated: boolean } {
  for (let size = o.maxSize; size >= o.minSize; size -= 2) {
    const r = wrapLines(text, size, o.maxWidth, o.maxLines, o.measure);
    if (!r.truncated) return { size, ...r };
  }
  return { size: o.minSize, ...wrapLines(text, o.minSize, o.maxWidth, o.maxLines, o.measure) };
}

// ---------------------------------------------------------------------------
// Brand rules: "Always mention X" / "Must mention X"
// ---------------------------------------------------------------------------

/**
 * Find what the brand rules require to be mentioned and, for each, the
 * business's OWN sentence from its description that covers it. We never
 * write a claim ourselves: if no sentence matches, `sentence` is null and the
 * UI asks the promoter to mention it in their caption.
 */
export function mustMentions(brandRules: string, description: string): { phrase: string; sentence: string | null }[] {
  const out: { phrase: string; sentence: string | null }[] = [];
  const sentences = description.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const re = /\b(?:always|must)\s+(?:mention|include|say)\s+(?:the\s+|that\s+)?([^.;\n]+)/gi;
  for (const m of brandRules.matchAll(re)) {
    const phrase = m[1].trim();
    const keys = phrase.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const sentence = keys.length ? sentences.find((s) => keys.every((k) => s.toLowerCase().includes(k))) ?? null : null;
    out.push({ phrase, sentence });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export type Box = { x: number; y: number; w: number; h: number };

export type PromoLayout = {
  width: number;
  height: number;
  photo: Box;
  pad: number;
  textX: number;
  textW: number; // width of the top text block
  textBottom: number; // the top text block must end above this
  bottomTextW: number; // width of the CTA / ad text next to the QR
  businessY: number;
  serviceY: number;
  service: { maxLines: number; maxSize: number; minSize: number };
  priceSize: number;
  ctaY: number;
  qr: Box;
  linkY: number;
  adY: number;
};

export function promoLayout(format: PromoFormat): PromoLayout {
  const { width, height } = FORMATS[format];
  const pad = 64;
  if (format === "story") {
    const photoH = 860;
    const qr = { x: width - pad - 340, y: 1456, w: 340, h: 340 };
    return {
      width, height, pad,
      photo: { x: 0, y: 0, w: width, h: photoH },
      textX: pad, textW: width - pad * 2, textBottom: qr.y - 36,
      bottomTextW: qr.x - pad - 40,
      businessY: photoH + 76, serviceY: photoH + 170,
      service: { maxLines: 2, maxSize: 92, minSize: 52 },
      priceSize: 120,
      ctaY: qr.y + 110,
      qr, linkY: qr.y + qr.h + 44, adY: height - pad - 8,
    };
  }
  const photoH = 560;
  const qr = { x: width - pad - 300, y: photoH + 48, w: 300, h: 300 };
  return {
    width, height, pad,
    photo: { x: 0, y: 0, w: width, h: photoH },
    textX: pad, textW: width - pad * 2 - qr.w - 48, textBottom: qr.y + qr.h + 6,
    bottomTextW: width - pad * 2 - qr.w - 48,
    businessY: photoH + 70, serviceY: photoH + 148,
    service: { maxLines: 2, maxSize: 64, minSize: 40 },
    priceSize: 80,
    ctaY: qr.y + qr.h + 64,
    qr, linkY: qr.y + qr.h + 44, adY: height - 34,
  };
}
