/**
 * Generates the ILLUSTRATIVE demo images and uploads them to the existing private Storage bucket
 * ("campaign-photos", folder demo-assets/). Run once after `npm run reset-demo`, then reset again
 * so the seed copies the campaign covers into place:
 *
 *   npm run demo-assets && npm run reset-demo
 *
 * - Flat illustrations and initials in the Payout slip palette. No photos, no people, no brand logos.
 * - Names come from the demo rows in the database (is_demo). The stage campaigns get no cover.
 * - Rendered from SVG to PNG with the Playwright Chromium already installed for the e2e tests
 *   (the bucket accepts JPG/PNG/WebP only). Reads keys from .env.local and never prints them.
 */
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/"/g, "").trim()]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BUCKET = "campaign-photos";
const STAGE_CAMPAIGNS = ["Sunset Fjord Cruise", "Jet Ski Adventure"];

// Same slug as lib/demo-illustrative.ts (demoAssetPath).
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// Payout slip palette.
const P = { paper: "#F2F4F7", ink: "#0D1B2A", cobalt: "#2440F0", marker: "#FFE14D", paid: "#0A7F4F", sky: "#DAEBFB", lilac: "#E4E0FA", rose: "#FBE0EC", mint: "#DDF3E4", sand: "#FFE6D2" };

const initials = (name) => name.replace(/\(.*\)/, "").split(/[\s.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

function avatarSvg(name) {
  const bg = [P.cobalt, P.ink, P.paid, "#5B3FD6", "#C2410C"][hash(name) % 5];
  const fg = bg === P.ink ? P.marker : "#FFFFFF";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <circle cx="128" cy="128" r="128" fill="${bg}"/>
    <circle cx="214" cy="52" r="18" fill="${P.marker}" opacity="${bg === P.ink ? 0 : 0.9}"/>
    <text x="128" y="150" text-anchor="middle" font-family="Schibsted Grotesk, Arial, sans-serif" font-weight="800" font-size="104" fill="${fg}" letter-spacing="-4">${initials(name)}</text>
  </svg>`;
}

function businessSvg(name) {
  const bg = [P.ink, P.cobalt][hash(name) % 2];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" rx="88" fill="${bg}"/>
    <rect x="44" y="300" width="120" height="16" rx="8" fill="${P.marker}"/>
    <text x="44" y="250" font-family="Schibsted Grotesk, Arial, sans-serif" font-weight="800" font-size="150" fill="#FFFFFF" letter-spacing="-8">${initials(name)}</text>
  </svg>`;
}

/** Category scenes: simple flat shapes, no people. */
function scene(category, seed) {
  const sun = `<circle cx="${880 + (seed % 120)}" cy="200" r="90" fill="${P.marker}"/>`;
  const waves = (y, c) => `<path d="M0 ${y} Q 75 ${y - 26} 150 ${y} T 300 ${y} T 450 ${y} T 600 ${y} T 750 ${y} T 900 ${y} T 1050 ${y} T 1200 ${y} V 800 H 0 Z" fill="${c}"/>`;
  switch (category) {
    case "boat_tour": case "tour":
      return { bg: P.sky, body: `${sun}${waves(520, P.cobalt)}${waves(600, P.ink)}
        <path d="M430 500 L770 500 L720 560 L480 560 Z" fill="#FFFFFF"/><rect x="590" y="300" width="10" height="200" fill="${P.ink}"/>
        <path d="M600 310 L600 480 L720 480 Z" fill="#FFFFFF" stroke="${P.ink}" stroke-width="8"/>` };
    case "water_sports": case "jet_ski":
      return { bg: P.sky, body: `${sun}${waves(500, P.cobalt)}${waves(590, P.ink)}
        <path d="M380 470 Q 600 400 820 470 Q 600 520 380 470 Z" fill="${P.marker}" stroke="${P.ink}" stroke-width="10"/>
        <line x1="520" y1="380" x2="700" y2="560" stroke="${P.ink}" stroke-width="14" stroke-linecap="round"/>` };
    case "activity":
      return { bg: P.lilac, body: `<rect x="430" y="180" width="340" height="520" rx="24" fill="${P.ink}"/>
        <rect x="470" y="220" width="260" height="440" rx="12" fill="${P.cobalt}"/>
        <circle cx="690" cy="440" r="22" fill="${P.marker}"/><rect x="684" y="440" width="12" height="60" rx="6" fill="${P.marker}"/>
        <circle cx="300" cy="260" r="30" fill="${P.marker}" opacity=".7"/><circle cx="930" cy="560" r="44" fill="${P.marker}" opacity=".5"/>` };
    case "fitness":
      return { bg: P.mint, body: `<rect x="280" y="120" width="640" height="620" rx="30" fill="#FFFFFF" stroke="${P.ink}" stroke-width="10"/>
        ${[[380, 220, P.cobalt], [560, 300, P.marker], [720, 200, P.paid], [440, 420, P.marker], [660, 470, P.cobalt], [820, 380, P.ink], [520, 600, P.paid], [760, 620, P.marker]]
          .map(([x, y, c]) => `<ellipse cx="${x}" cy="${y}" rx="34" ry="26" fill="${c}"/>`).join("")}` };
    case "club": case "nightlife":
      return { bg: P.ink, body: `<path d="M600 0 L380 800 L820 800 Z" fill="${P.cobalt}" opacity=".55"/>
        <path d="M200 0 L60 800 L420 800 Z" fill="${P.marker}" opacity=".18"/><path d="M1000 0 L780 800 L1140 800 Z" fill="${P.marker}" opacity=".18"/>
        ${[[260, 160], [940, 220], [600, 120], [380, 420], [860, 520]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="${P.marker}"/>`).join("")}
        <rect x="0" y="660" width="1200" height="140" fill="#000000" opacity=".5"/>` };
    case "event":
      return { bg: P.rose, body: `<rect x="300" y="250" width="600" height="300" rx="28" fill="#FFFFFF" stroke="${P.ink}" stroke-width="10"/>
        <circle cx="300" cy="400" r="44" fill="${P.rose}" stroke="${P.ink}" stroke-width="10"/><circle cx="900" cy="400" r="44" fill="${P.rose}" stroke="${P.ink}" stroke-width="10"/>
        <line x1="700" y1="270" x2="700" y2="530" stroke="${P.ink}" stroke-width="8" stroke-dasharray="18 14"/>
        <rect x="380" y="330" width="240" height="40" rx="20" fill="${P.cobalt}"/><rect x="380" y="400" width="160" height="40" rx="20" fill="${P.marker}"/>` };
    case "experience": case "restaurant":
      return { bg: P.sand, body: `<rect x="400" y="380" width="400" height="230" rx="40" fill="${P.ink}"/>
        <rect x="360" y="360" width="480" height="44" rx="22" fill="${P.cobalt}"/>
        ${[480, 600, 720].map((x) => `<path d="M${x} 330 q 30 -50 0 -100 q -30 -50 0 -100" fill="none" stroke="${P.ink}" stroke-width="12" stroke-linecap="round" opacity=".35"/>`).join("")}
        <circle cx="940" cy="200" r="70" fill="${P.marker}"/>` };
    default:
      return { bg: P.paper, body: `${sun}<rect x="360" y="300" width="480" height="300" rx="30" fill="${P.cobalt}"/>` };
  }
}

function coverSvg(category, name) {
  const { bg, body } = scene(category, hash(name));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="${bg}"/>${body}</svg>`;
}

async function main() {
  const [{ data: profiles }, { data: businesses }, { data: campaigns }] = await Promise.all([
    db.from("profiles").select("display_name").eq("is_demo", true),
    db.from("businesses").select("name").eq("is_demo", true),
    db.from("campaigns").select("service_name, businesses!inner(category, is_demo)").eq("businesses.is_demo", true),
  ]);
  const jobs = [
    ...(profiles ?? []).filter((p) => p.display_name).map((p) => ({ path: `demo-assets/avatars/${slug(p.display_name)}.png`, svg: avatarSvg(p.display_name), w: 256, h: 256 })),
    ...(businesses ?? []).map((b) => ({ path: `demo-assets/businesses/${slug(b.name)}.png`, svg: businessSvg(b.name), w: 400, h: 400 })),
    ...(campaigns ?? []).filter((c) => !STAGE_CAMPAIGNS.includes(c.service_name))
      .map((c) => ({ path: `demo-assets/campaigns/${slug(c.service_name)}.png`, svg: coverSvg(c.businesses.category, c.service_name), w: 1200, h: 800 })),
  ];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let ok = 0;
  for (const j of jobs) {
    await page.setViewportSize({ width: j.w, height: j.h });
    await page.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@800&display=block" rel="stylesheet"><style>html,body{margin:0;background:transparent}</style></head><body>${j.svg}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: j.w, height: j.h } });
    const { error } = await db.storage.from(BUCKET).upload(j.path, png, { contentType: "image/png", upsert: true });
    if (error) console.log("upload failed", j.path, error.message);
    else ok++;
  }
  await browser.close();
  console.log(`uploaded ${ok}/${jobs.length} demo images to ${BUCKET}/demo-assets`);
}
main().catch((e) => { console.log("ERROR", e.message); process.exit(1); });
