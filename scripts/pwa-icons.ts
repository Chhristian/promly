/**
 * npm run pwa-icons
 *
 * Draws the home-screen icons from lib/logo-mark.ts (the megaphone) onto the
 * Paper background and writes them to public/icons. The PNGs are committed;
 * run this again only if the mark or the palette changes.
 *  - icon-192.png, icon-512.png: "any" icons, the mark fills most of the square.
 *  - icon-maskable-512.png: full-bleed Paper with the mark inside the maskable
 *    safe zone (the central 80% circle), so Android can crop it to any shape.
 */
import path from "node:path";
import sharp from "sharp";
import { MARK } from "../lib/logo-mark";

const PAPER = "#F4F6FA"; // docs/BRAND.md: page background; same as manifest and themeColor

function svg(size: number, markWidthRatio: number) {
  // The mark spans x 2.75..37.25 and y 8.5..32.5 on its 40x40 grid.
  const scale = (size * markWidthRatio) / 34.5;
  const tx = size / 2 - 20 * scale;
  const ty = size / 2 - 20.5 * scale;
  const ellipse = `<ellipse cx="${MARK.bell.cx}" cy="${MARK.bell.cy}" rx="${MARK.bell.rx}" ry="${MARK.bell.ry}" fill="${MARK.marker}" stroke="${MARK.ink}" stroke-width="${MARK.stroke.rim}"/>`;
  const sound = MARK.sound
    .map((d) => `<path d="${d}" fill="none" stroke="${MARK.ink}" stroke-width="${MARK.stroke.sound}" stroke-linecap="round"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" fill="${PAPER}"/>
<g transform="translate(${tx} ${ty}) scale(${scale})">
<path d="${MARK.handle}" fill="none" stroke="${MARK.ink}" stroke-width="${MARK.stroke.handle}" stroke-linecap="round"/>
<path d="${MARK.horn}" fill="${MARK.cobalt}"/>${ellipse}${sound}
</g></svg>`;
}

const out = path.join(process.cwd(), "public", "icons");
const jobs = [
  { file: "icon-192.png", size: 192, ratio: 0.74 },
  { file: "icon-512.png", size: 512, ratio: 0.74 },
  { file: "icon-maskable-512.png", size: 512, ratio: 0.52 },
];

async function main() {
  for (const j of jobs) {
    await sharp(Buffer.from(svg(j.size, j.ratio)), { density: 300 }).resize(j.size, j.size).png().toFile(path.join(out, j.file));
    console.log("wrote", j.file);
  }
}

main();
