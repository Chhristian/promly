/**
 * Prewritten promo text templates (no AI). Filled ONLY with facts the business
 * provided (service, business, city, price, its own description) plus the
 * promoter's link. They never invent discounts, reviews or guarantees, and
 * every text says the promoter earns a commission (paid promotion must be
 * marked as advertising, e.g. "reklame" in Norway).
 */

export type PromoType = "tiktok" | "instagram" | "snapchat" | "whatsapp" | "hook" | "dm";

export const PROMO_TYPES: { type: PromoType; label: string; channels: string[]; hint: string }[] = [
  { type: "tiktok", label: "TikTok script", channels: ["tiktok"], hint: "Short video plan with timings" },
  { type: "instagram", label: "Instagram caption", channels: ["instagram"], hint: "Post or Reel caption" },
  { type: "snapchat", label: "Snapchat message", channels: ["snapchat"], hint: "Snap or story text" },
  { type: "whatsapp", label: "WhatsApp recommendation", channels: ["whatsapp"], hint: "Personal message to a friend or group" },
  { type: "hook", label: "Short hook", channels: ["tiktok", "instagram", "snapchat", "whatsapp", "facebook", "word_of_mouth", "qr_print", "other"], hint: "One line for any allowed channel" },
  { type: "dm", label: "Direct message", channels: ["instagram", "snapchat", "tiktok", "facebook", "whatsapp"], hint: "One-to-one message" },
];

/** Only the types whose channel the accepted agreement allows. */
export function allowedPromoTypes(allowedChannels: string[]) {
  return PROMO_TYPES.filter((t) => t.channels.some((c) => allowedChannels.includes(c)));
}

export type PromoFacts = {
  serviceName: string;
  businessName: string;
  city: string;
  price: string; // already formatted, e.g. "500,00 kr"
  description: string; // written by the business
  link: string;
};

/** First sentence of the business's own description (their approved claim). */
function firstSentence(text: string): string {
  const t = text.trim();
  if (!t) return "";
  const m = /^(.+?[.!?])(\s|$)/.exec(t);
  return (m ? m[1] : t).slice(0, 160);
}

const DISCLOSE = "I earn a commission if you book through my link.";

export function buildPromoText(type: PromoType, f: PromoFacts, variant = 0): string {
  const where = f.city ? ` in ${f.city}` : "";
  const about = firstSentence(f.description);
  const aboutLine = about ? `${about}\n` : "";
  const variants: Record<PromoType, string[]> = {
    tiktok: [
      `[0–3 s] HOOK (to camera): "Looking for a ${f.serviceName.toLowerCase()}${where}?"\n` +
        `[3–10 s] SHOW: ${f.businessName}${about ? ` — ${about}` : ""}\n` +
        `[10–15 s] SAY: "It's ${f.price}."\n` +
        `[15–20 s] CALL TO ACTION: "Book through the link in my bio."\n\n` +
        `Caption: ${f.serviceName} at ${f.businessName}${where}. Book: ${f.link}\n#reklame #ad — ${DISCLOSE}`,
      `[0–3 s] HOOK (text on screen): "${f.serviceName}${where} — ${f.price}"\n` +
        `[3–12 s] SHOW: walk in / the place / the result (only real footage)\n` +
        `[12–18 s] SAY: "This is ${f.businessName}.${about ? ` ${about}` : ""}"\n` +
        `[18–22 s] CALL TO ACTION: "Link in bio to book."\n\n` +
        `Caption: Book ${f.serviceName} at ${f.businessName}: ${f.link}\n#reklame #ad — ${DISCLOSE}`,
    ],
    instagram: [
      `${f.serviceName} at ${f.businessName}${where}.\n${aboutLine}Price: ${f.price}.\n\nBook here: ${f.link}\n\n#reklame #ad — ${DISCLOSE}`,
      `If you need a ${f.serviceName.toLowerCase()}${where}, have a look at ${f.businessName}.\n${aboutLine}${f.price} · book in a minute: ${f.link}\n\n#reklame #ad — ${DISCLOSE}`,
    ],
    snapchat: [
      `Need a ${f.serviceName.toLowerCase()}${where}? ${f.businessName} — ${f.price}. Book: ${f.link}\n(ad · ${DISCLOSE})`,
      `${f.serviceName} at ${f.businessName}, ${f.price} 👉 ${f.link}\n(ad · ${DISCLOSE})`,
    ],
    whatsapp: [
      `Hi! If you're looking for a ${f.serviceName.toLowerCase()}${where}, have a look at ${f.businessName}.\n${aboutLine}It's ${f.price}. You can book here: ${f.link}\n\n(Just so you know, ${DISCLOSE})`,
      `Hey! ${f.businessName}${where} does ${f.serviceName.toLowerCase()} for ${f.price}. Booking takes a minute: ${f.link}\n(${DISCLOSE})`,
    ],
    hook: [
      `${f.serviceName}${where} for ${f.price} — book in a minute: ${f.link} (ad)`,
      `${f.businessName}: ${f.serviceName}, ${f.price}. Book here → ${f.link} (ad)`,
    ],
    dm: [
      `Hey! Thought of you — ${f.businessName}${where} does ${f.serviceName.toLowerCase()} for ${f.price}. You can book here: ${f.link}\n(${DISCLOSE})`,
      `Hi! Quick tip: ${f.serviceName} at ${f.businessName}${where}, ${f.price}. Link to book: ${f.link}\n(${DISCLOSE})`,
    ],
  };
  const list = variants[type];
  return list[((variant % list.length) + list.length) % list.length];
}

export const VARIANT_COUNT = 2;
