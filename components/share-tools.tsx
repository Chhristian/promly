"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { CopyLink } from "@/components/copy-link";

const QR_OPTS = { errorCorrectionLevel: "H" as const, margin: 2, color: { dark: "#0b0e1f", light: "#ffffff" } };

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

/** WhatsApp message: only facts from the campaign, no invented claims. */
export function whatsappMessage(serviceName: string, businessName: string, url: string) {
  return `Have a look at ${serviceName} at ${businessName}. You can book here: ${url}`;
}

export function ShareTools({
  url,
  serviceName,
  businessName,
  compact = false,
  whatsappAllowed = true,
}: {
  url: string;
  serviceName: string;
  businessName: string;
  compact?: boolean;
  whatsappAllowed?: boolean;
}) {
  const qrSmall = useQr(url, 560); // shown at ~280px, crisp on retina
  const qrPng = useQr(url, 1024); // download
  const [fullscreen, setFullscreen] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [showQr, setShowQr] = useState(!compact);

  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  const waHref = `https://wa.me/?text=${encodeURIComponent(whatsappMessage(serviceName, businessName, url))}`;
  const fileName = `promly-qr-${slug(serviceName)}.png`;

  const nativeShare = async () => {
    try {
      await navigator.share({ title: `${serviceName} — ${businessName}`, text: `Book ${serviceName} at ${businessName}:`, url });
    } catch {
      // user cancelled
    }
  };

  return (
    <div className="space-y-3" data-testid="share-tools">
      <CopyLink url={url} />

      <div className="flex flex-wrap gap-2">
        {whatsappAllowed && (
          <Button asChild variant="secondary" size="sm">
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <span aria-hidden>💬</span> WhatsApp
            </a>
          </Button>
        )}
        {canShare && (
          <Button type="button" variant="secondary" size="sm" onClick={nativeShare}>
            <span aria-hidden>↗</span> Share…
          </Button>
        )}
        {compact && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setShowQr((v) => !v)}>
            {showQr ? "Hide QR" : "QR code"}
          </Button>
        )}
        {qrPng && (
          <Button asChild variant="secondary" size="sm">
            <a href={qrPng} download={fileName} data-testid="download-qr">
              ⬇ Download QR
            </a>
          </Button>
        )}
        <Button type="button" variant="secondary" size="sm" onClick={() => setFullscreen(true)} disabled={!qrPng}>
          ⛶ Show QR full screen
        </Button>
      </div>

      {showQr && (
        <div className="flex items-center gap-4">
          {qrSmall ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrSmall} alt={`QR code for ${url}`} width={280} height={280} className="rounded-xl bg-white p-2" data-testid="qr-image" />
          ) : (
            <div className="h-[280px] w-[280px] animate-pulse rounded-xl bg-secondary" />
          )}
          <p className="max-w-48 text-xs text-muted-foreground">Scan with a phone camera to open the booking page.</p>
        </div>
      )}

      {fullscreen && qrPng && (
        <button
          type="button"
          onClick={() => setFullscreen(false)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#0b0e1f]/95 p-6"
          aria-label="Close full-screen QR code"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrPng} alt="QR code" className="aspect-square w-[min(80vh,90vw)] rounded-2xl bg-white p-4" />
          <div className="text-center">
            <div className="text-2xl font-bold">{serviceName}</div>
            <div className="text-muted-foreground">{businessName} · scan to book · tap anywhere to close</div>
          </div>
        </button>
      )}
    </div>
  );
}
