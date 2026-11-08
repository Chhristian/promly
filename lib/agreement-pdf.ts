/**
 * Agreement PDFs: shared rules for the browser (early feedback) and the
 * server (the check that counts). Files live in the private "agreements"
 * bucket at <campaign_id>/<uuid>.pdf.
 */
export const AGREEMENT_PDF_BUCKET = "agreements";
export const AGREEMENT_PDF_MAX_BYTES = 5 * 1024 * 1024;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** True if the path is a PDF inside this campaign's folder. */
export function isAgreementPdfPath(campaignId: string, path: string): boolean {
  return path.startsWith(`${campaignId}/`) && new RegExp(`^${UUID}/${UUID}\\.pdf$`).test(path);
}

/**
 * True if the bytes start with a PDF header ("%PDF-" and a version digit).
 * This checks the content, not the file name or the type the browser reports.
 */
export function hasPdfMagicBytes(bytes: Uint8Array): boolean {
  const header = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  if (bytes.length < header.length + 1) return false;
  for (let i = 0; i < header.length; i++) if (bytes[i] !== header[i]) return false;
  const v = bytes[header.length];
  return v >= 0x30 && v <= 0x39; // a digit, as in %PDF-1.7 or %PDF-2.0
}

/** First 12 characters of a SHA-256 hash, for showing to people. */
export const shortHash = (sha256: string) => sha256.slice(0, 12);

/** Same-origin links that redirect to a fresh short-lived signed URL. */
export const agreementPdfHref = (documentId: string, download = false) =>
  `/agreement-pdf/${documentId}${download ? "?download=1" : ""}`;
