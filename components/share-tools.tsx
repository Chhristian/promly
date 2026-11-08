"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { CopyLink } from "@/components/copy-link";
import { Download, Maximize2, MessageCircle, QrCode, Share2 } from "lucide-react";

const QR_OPTS = { errorCorrectionLevel: "H" as const, margin: 2, color: { dark: "#0d1b2a", light: "#ffffff" } };

function useQr(url: string, width: number) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { ...QR_OPTS, width }).then((d) => alive && setDataUrl(d));
    return () => {
      alive = false;
    };
  }, [url, width]);
  return dataUrl;
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Language of the share text: Norwegian for the Oslo/NOK market, English otherwise. */
export type AdLang = "no" | "en";
export const adLangForCurrency = (currency: string | null | undefined): AdLang => (currency === "NOK" ? "no" : "en");

/**
 * Every share starts with the advertising label and names the business
 * (Norwegian marketing law: the ad must be recognisable up front, not via a hashtag at the end).
 */
export function shareText(serviceName: string, businessName: string, lang: AdLang = "en") {
  return lang === "no"
    ? `Reklame: Jeg får provisjon fra ${businessName} hvis du bestiller via lenken min. ${serviceName} hos ${businessName}.`
    : `Advertising: I earn a commission from ${businessName} if you book through my link. ${serviceName} at ${businessName}.`;
}

/** WhatsApp message: only facts from the campaign, labelled as advertising, no invented claims. */
export function whatsappMessage(serviceName: string, businessName: string, url: string, lang: AdLang = "en") {
  return `${shareText(serviceName, businessName, lang)} ${lang === "no" ? "Bestill her" : "Book here"}: ${url}`;
}

/** The user closed the share sheet: not an error. */
function isCancel(e: unknown) {
  return e instanceof DOMException && e.name === "AbortError";
}

export function ShareTools({
  url,
  serviceName,
  businessName,
  compact = false,
  whatsappAllowed = true,
  lang = "en",
}: {
  url: string;
  serviceName: string;
  businessName: string;
  compact?: boolean;
  whatsappAllowed?: boolean;
  lang?: AdLang;
}) {
  const qrSmall = useQr(url, 560); // shown at ~280px, crisp on retina
  const qrPng = useQr(url, 1024); // download and share
  const [fullscreen, setFullscreen] = useState(false);
  const [showQr, setShowQr] = useState(!compact);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const waHref = `https://wa.me/?text=${encodeURIComponent(whatsappMessage(serviceName, businessName, url, lang))}`;
  const fileName = `promly-qr-${slug(serviceName)}.png`;
  const adLabel = lang === "no" ? "Reklame" : "Advertising";
  const title = `${adLabel}: ${serviceName} — ${businessName}`;
  const text = shareText(serviceName, businessName, lang);

  const flash = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  /** Fallback everywhere: copy the link and say so. */
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    flash("Link copied");
  };

  /** Phones: the native share sheet (AirDrop, Messages, WhatsApp, Instagram …). */
  const shareLink = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if (isCancel(e)) return; // the user closed the sheet
      }
    }
    await copyLink();
  };

  /** Share the QR code as a PNG where the browser can share files; otherwise copy the link. */
  const shareQr = async () => {
    if (qrPng && typeof navigator.share === "function" && typeof navigator.canShare === "function") {
      const blob = await (await fetch(qrPng)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title, text: `${text} ${url}` });
          return;
        } catch (e) {
          if (isCancel(e)) return;
        }
      }
    }
    await copyLink();
  };

  return (
    <div className="space-y-3" data-testid="share-tools">
      <CopyLink url={url} />

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={shareLink} data-testid="share-link">
          <Share2 className="h-4 w-4" /> Share link
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={shareQr} disabled={!qrPng} data-testid="share-qr">
          <QrCode className="h-4 w-4" /> Share QR code
        </Button>
        {whatsappAllowed && (
          <Button asChild variant="secondary" size="sm">
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </Button>
        )}
        {compact && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setShowQr((v) => !v)}>
            <QrCode className="h-4 w-4" /> {showQr ? "Hide QR" : "QR code"}
          </Button>
        )}
        {qrPng && (
          <Button asChild variant="secondary" size="sm">
            <a href={qrPng} download={fileName} data-testid="download-qr">
              <Download className="h-4 w-4" /> Download QR
            </a>
          </Button>
        )}
        <Button type="button" variant="secondary" size="sm" onClick={() => setFullscreen(true)} disabled={!qrPng}>
          <Maximize2 className="h-4 w-4" /> Show QR full screen
        </Button>
      </div>

      {showQr && (
        <div className="flex items-center gap-4">
          {qrSmall ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrSmall} alt={`QR code for ${url}`} width={280} height={280} className="rounded-2xl border border-border bg-white p-2" data-testid="qr-image" />
          ) : (
            <div className="h-[280px] w-[280px] animate-pulse rounded-xl bg-secondary" />
          )}
          <p className="max-w-48 text-xs text-muted-foreground">Scan with a phone camera to open the booking page.</p>
        </div>
      )}

      {toast && (
        <div
          role="status"
          data-testid="share-toast"
          className="toast-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          {toast}
        </div>
      )}

      {fullscreen && qrPng && (
        <button
          type="button"
          onClick={() => setFullscreen(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background p-6"
          aria-label="Close full-screen QR code"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrPng} alt="QR code" className="aspect-square w-[min(78vh,90vw)] rounded-3xl border border-border bg-white p-4" />
          <div className="text-center">
            <div className="text-sm font-bold uppercase tracking-wide" data-testid="qr-ad-label">
              {lang === "no" ? `Reklame: promoteren får provisjon fra ${businessName}` : `Advertising: the promoter earns a commission from ${businessName}`}
            </div>
            <div className="text-3xl font-extrabold tracking-[-0.02em]">{serviceName}</div>
            <div className="text-muted-foreground">{businessName}. Scan to book. Tap anywhere to close.</div>
          </div>
        </button>
      )}
    </div>
  );
}
