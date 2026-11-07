"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { AlertTriangle, Download, ImageIcon, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryTint } from "@/components/campaign-cover";
import { FORMATS, fitText, promoLayout, wrapLines, type PromoFormat } from "@/lib/promo-image-layout";
import { cn } from "@/lib/utils";

export type PromoImageCampaign = {
  id: string;
  serviceName: string;
  businessName: string;
  city: string;
  price: string; // formatted
  link: string;
  category: string;
  photos: string[]; // signed URLs of the business's own photos
  mustMentions: { phrase: string; sentence: string | null }[];
};

const NAVY = "#0d1b2a"; // ink
const MARKER = "#ffe14d";
const COBALT = "#2440f0";
const AD_NOTE = "Ad · I earn a commission if you book through my link.";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // keeps the canvas exportable
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("photo failed to load"));
    img.src = url;
  });
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Draw the promo image. Uses only campaign facts, the business's photos, and the promoter's link. */
async function draw(canvas: HTMLCanvasElement, c: PromoImageCampaign, format: PromoFormat, photoUrl: string | null): Promise<{ mentionShown: boolean }> {
  const L = promoLayout(format);
  const { width: W, height: H } = FORMATS[format];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  await document.fonts?.ready;
  const family = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  const font = (size: number, weight = 700) => `${weight} ${size}px ${family}`;
  const measureAt = (weight: number) => (t: string, size: number) => {
    ctx.font = font(size, weight);
    return ctx.measureText(t).width;
  };

  // Background
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);

  // Photo (cover-fit) or category artwork
  const p = L.photo;
  if (photoUrl) {
    const img = await loadImage(photoUrl);
    const scale = Math.max(p.w / img.width, p.h / img.height);
    const sw = p.w / scale;
    const sh = p.h / scale;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, p.x, p.y, p.w, p.h);
  } else {
    ctx.fillStyle = categoryTint(c.category);
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = NAVY;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const initial = fitText(c.businessName, { maxWidth: p.w - 160, maxLines: 2, maxSize: 110, minSize: 56, measure: measureAt(800) });
    ctx.font = font(initial.size, 800);
    initial.lines.forEach((line, i) => ctx.fillText(line, W / 2, p.h / 2 + (i - (initial.lines.length - 1) / 2) * initial.size * 1.1));
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  // Fade the photo into the panel
  if (photoUrl) {
    const fade = ctx.createLinearGradient(0, p.h - 260, 0, p.h);
    fade.addColorStop(0, "rgba(13,27,42,0)");
    fade.addColorStop(1, NAVY);
    ctx.fillStyle = fade;
    ctx.fillRect(0, p.h - 260, W, 260);
  }

  // "AD" label (top-left) and Promly mark (top-right)
  ctx.font = font(30, 800);
  const adW = ctx.measureText("AD").width + 40;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath();
  ctx.roundRect(L.pad - 16, 44, adW, 54, 27);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText("AD", L.pad + 4, 82);

  const markX = W - L.pad - 210;
  ctx.fillStyle = COBALT;
  ctx.beginPath();
  ctx.roundRect(markX, 40, 60, 60, 15);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = font(44, 800);
  ctx.fillText("p", markX + 16, 82);
  ctx.fillStyle = MARKER;
  ctx.beginPath();
  ctx.arc(markX + 47, 86, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = font(40, 800);
  ctx.fillText("promly", markX + 74, 84);

  // Top text block
  let y = L.businessY;
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  const biz = wrapLines(`${c.businessName}${c.city ? `, ${c.city}` : ""}`, 34, L.textW, 1, measureAt(700));
  ctx.font = font(34, 700);
  ctx.fillText(biz.lines[0] ?? "", L.textX, y);

  const svc = fitText(c.serviceName, { maxWidth: L.textW, ...L.service, measure: measureAt(800) });
  ctx.font = font(svc.size, 800);
  ctx.fillStyle = "#ffffff";
  y = L.serviceY;
  for (const line of svc.lines) {
    ctx.fillText(line, L.textX, y);
    y += svc.size * 1.08;
  }

  const priceSize = Math.min(L.priceSize, fitText(c.price, { maxWidth: L.textW, maxLines: 1, maxSize: L.priceSize, minSize: 40, measure: measureAt(800) }).size);
  y += priceSize * (format === "story" ? 0.02 : 0);
  ctx.font = font(priceSize, 800);
  // The price on a highlighter block, like the app's money figures
  const pw = ctx.measureText(c.price).width;
  ctx.fillStyle = MARKER;
  ctx.beginPath();
  ctx.roundRect(L.textX - priceSize * 0.12, y + priceSize * 0.08, pw + priceSize * 0.24, priceSize * 0.9, priceSize * 0.1);
  ctx.fill();
  ctx.fillStyle = NAVY;
  ctx.fillText(c.price, L.textX, y + priceSize * 0.8);
  y += priceSize * (format === "story" ? 1.05 : 0.95);

  // Must-mention: only the business's own sentence, only if it fits
  const mention = c.mustMentions.find((m) => m.sentence)?.sentence;
  let mentionShown = false;
  if (mention) {
    const size = format === "story" ? 36 : 24;
    const m = wrapLines(`✓ ${mention}`, size, L.textW, 2, measureAt(500));
    if (y + m.lines.length * size * 1.3 <= L.textBottom) {
      mentionShown = true;
      ctx.font = font(size, 500);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (const line of m.lines) {
        y += size * 1.3;
        ctx.fillText(line, L.textX, y);
      }
    }
  }

  // QR code of the promoter's link
  const q = L.qr;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(q.x, q.y, q.w, q.h, 28);
  ctx.fill();
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, c.link, { width: q.w - 32, margin: 2, errorCorrectionLevel: "M", color: { dark: NAVY, light: "#ffffff" } });
  ctx.drawImage(qrCanvas, q.x + 16, q.y + 16, q.w - 32, q.w - 32);

  const shortLink = c.link.replace(/^https?:\/\//, "");
  const linkSize = fitText(shortLink, { maxWidth: q.w + 40, maxLines: 1, maxSize: 26, minSize: 16, measure: measureAt(600) }).size;
  ctx.font = font(linkSize, 600);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.textAlign = "center";
  ctx.fillText(shortLink, q.x + q.w / 2, L.linkY);
  ctx.textAlign = "left";

  // Call to action next to / under the QR
  const ctaSize = format === "story" ? 60 : 38;
  ctx.font = font(ctaSize, 800);
  ctx.fillStyle = "#ffffff";
  const ctaX = L.textX;
  const ctaY = format === "story" ? L.ctaY : L.ctaY;
  ctx.fillText("Scan to book", ctaX, ctaY);
  ctx.font = font(format === "story" ? 34 : 24, 500);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(format === "story" ? "or open the link" : "or open the link", ctaX, ctaY + (format === "story" ? 56 : 36));

  // Honest ad note
  const adSize = format === "story" ? 26 : 20;
  const ad = wrapLines(AD_NOTE, adSize, L.bottomTextW, 2, measureAt(500));
  ctx.font = font(adSize, 500);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ad.lines.forEach((line, i) => ctx.fillText(line, L.textX, L.adY - (ad.lines.length - 1 - i) * adSize * 1.3));
  return { mentionShown };
}

export function PromoImageMaker({ campaign }: { campaign: PromoImageCampaign }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<PromoFormat>("story");
  const [photo, setPhoto] = useState<number>(campaign.photos.length ? 0 : -1); // -1 = artwork
  const [file, setFile] = useState<{ url: string; blob: Blob } | null>(null);
  const [rendering, setRendering] = useState(false);
  const [rendered, setRendered] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);

  // Redraw only when the inputs really change (not on every real-time refresh).
  const key = JSON.stringify(campaign);
  const stable = useMemo(() => JSON.parse(key) as PromoImageCampaign, [key]);
  useEffect(() => setPhoto(stable.photos.length ? 0 : -1), [stable.id, stable.photos.length]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!canvas.current) return;
      setRendering(true);
      setNotice(null);
      const photoUrl = photo >= 0 ? stable.photos[photo] ?? null : null;
      let result: { mentionShown: boolean };
      try {
        result = await draw(canvas.current, stable, format, photoUrl);
      } catch {
        // The photo couldn't be used (e.g. network) — never fake it: fall back to the artwork and say so.
        result = await draw(canvas.current, stable, format, null);
        if (alive) setNotice("That photo couldn't be loaded, so the artwork is used instead.");
      }
      const needsMention = stable.mustMentions.some((m) => m.sentence);
      if (alive && needsMention && !result.mentionShown) {
        setNotice("The brand rules ask for a must-mention that doesn't fit on this format. Use the Story format, or mention it in your caption.");
      }
      const blob = await new Promise<Blob | null>((r) => canvas.current!.toBlob(r, "image/png"));
      if (!alive || !blob) return;
      setFile((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { url: URL.createObjectURL(blob), blob };
      });
      const f = new File([blob], "promly.png", { type: "image/png" });
      setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [f] }));
      setRendering(false);
      setRendered(`${format}-${photo}`);
    })();
    return () => {
      alive = false;
    };
  }, [stable, format, photo]);

  const fileName = `promly-${format}-${slug(campaign.serviceName)}.png`;
  const missingMentions = campaign.mustMentions.filter((m) => !m.sentence);

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({
        files: [new File([file.blob], fileName, { type: "image/png" })],
        text: `${campaign.serviceName} at ${campaign.businessName}: ${campaign.link}`,
      });
    } catch {
      // cancelled
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-sm font-medium">Format</div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(FORMATS) as PromoFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                aria-pressed={format === f}
                className={cn("rounded-[10px] border p-3 text-left transition-colors", format === f ? "border-ink ring-1 ring-ink bg-card" : "border-border bg-card hover:border-input")}
              >
                <div className="text-sm font-semibold">{FORMATS[f].label}</div>
                <div className="text-xs text-muted-foreground">{f === "story" ? "Instagram / Snapchat / TikTok story" : "Feed post / WhatsApp"}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Picture</div>
          <div className="flex flex-wrap gap-2">
            {campaign.photos.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setPhoto(i)}
                aria-label={`Use photo ${i + 1}`}
                data-testid="promo-photo-option"
                className={cn("h-20 w-20 overflow-hidden rounded-xl border-2", photo === i ? "border-ink" : "border-transparent opacity-70 hover:opacity-100")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPhoto(-1)}
              className={cn(
                "grid h-20 w-20 place-items-center rounded-xl border-2 bg-secondary text-xs text-muted-foreground",
                photo === -1 ? "border-ink" : "border-transparent hover:bg-secondary/70",
              )}
            >
              <span className="flex flex-col items-center gap-1">
                <ImageIcon className="h-5 w-5" /> Artwork
              </span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {campaign.photos.length ? "Only the business's own photos are offered." : "The business hasn't added photos yet, so the category artwork is used."}
          </p>
        </div>

        {missingMentions.map((m) => (
          <p key={m.phrase} className="flex items-start gap-2 rounded-xl border border-[hsl(40_80%_72%)] bg-pending-bg p-3 text-sm text-pending">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            The brand rules say to mention “{m.phrase}”. It isn&apos;t in the business&apos;s description, so it&apos;s not on the image — mention it in your caption.
          </p>
        ))}
        {notice && <p className="text-sm text-pending">{notice}</p>}

        <div className="flex flex-wrap gap-2">
          <Button asChild  disabled={!file || rendering}>
            <a href={file?.url} download={fileName} data-testid="download-promo" aria-disabled={!file || rendering}>
              {rendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download PNG
            </a>
          </Button>
          {canShareFiles && (
            <Button type="button" variant="secondary" onClick={share} disabled={!file}>
              <Share2 className="h-4 w-4" /> Share
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          The image shows only the campaign&apos;s facts, your QR code and link, and an &quot;ad&quot; note. No discounts, reviews or promises are added.
        </p>
      </div>

      <div className="flex justify-center lg:sticky lg:top-24 lg:self-start">
        <canvas
          ref={canvas}
          data-testid="promo-canvas"
          data-rendering={rendering ? "yes" : "no"}
          data-rendered={rendered}
          className={cn(
            "h-auto max-w-full rounded-2xl border border-border",
            // Fit the whole image on screen (projector 1280×720 and phones).
            format === "story" ? "w-[min(100%,calc((100vh-17rem)*0.5625))]" : "w-[min(100%,calc(100vh-17rem),30rem)]",
          )}
        />
      </div>
    </div>
  );
}
