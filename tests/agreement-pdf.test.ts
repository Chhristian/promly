import { describe, expect, it } from "vitest";
import { hasPdfMagicBytes, isAgreementPdfPath } from "@/lib/agreement-pdf";
import { renderAgreement, type AgreementTerms } from "@/lib/agreement-template";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("hasPdfMagicBytes", () => {
  it("accepts real PDF headers", () => {
    expect(hasPdfMagicBytes(bytes("%PDF-1.7\n%âãÏÓ"))).toBe(true);
    expect(hasPdfMagicBytes(bytes("%PDF-2.0\n"))).toBe(true);
  });

  it("rejects other files, even if they are called .pdf", () => {
    expect(hasPdfMagicBytes(bytes("<html><body>not a pdf</body></html>"))).toBe(false);
    expect(hasPdfMagicBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(false); // PNG
    expect(hasPdfMagicBytes(bytes(" %PDF-1.7"))).toBe(false); // header must be first
    expect(hasPdfMagicBytes(bytes("%PDF-x"))).toBe(false);
    expect(hasPdfMagicBytes(bytes("%PDF"))).toBe(false);
    expect(hasPdfMagicBytes(new Uint8Array())).toBe(false);
  });
});

describe("isAgreementPdfPath", () => {
  const campaign = "6f1c2a52-1d7e-4c1b-9a51-0d2b8f3e4a10";
  const file = "0b8d3a2e-5f61-4a7c-8e90-1234567890ab";

  it("accepts a uuid.pdf inside the campaign folder", () => {
    expect(isAgreementPdfPath(campaign, `${campaign}/${file}.pdf`)).toBe(true);
  });

  it("rejects other folders, names and extensions", () => {
    expect(isAgreementPdfPath(campaign, `${file}/${file}.pdf`)).toBe(false);
    expect(isAgreementPdfPath(campaign, `${campaign}/../${file}.pdf`)).toBe(false);
    expect(isAgreementPdfPath(campaign, `${campaign}/${file}.exe`)).toBe(false);
    expect(isAgreementPdfPath(campaign, `${campaign}/terms.pdf`)).toBe(false);
  });
});

describe("agreement template with a PDF", () => {
  const terms: AgreementTerms = {
    businessName: "Oslo Barber", serviceName: "Haircut", currency: "NOK", priceMinor: 50000,
    commissionMinor: 10000, payoutDays: 7, refundWindowDays: 3, allowedChannels: ["instagram"], brandRules: "",
  };

  it("is unchanged without a PDF", () => {
    const text = renderAgreement(terms);
    expect(text).toHaveLength(6);
    expect(text[4].body).toBe("No additional brand rules.");
  });

  it("names the PDF version and hash when one is attached", () => {
    const sha256 = "a".repeat(64);
    const text = renderAgreement({ ...terms, attachedPdf: { version: 2, sha256 } });
    expect(text).toHaveLength(7);
    expect(text[4].body).toBe("See the attached PDF.");
    expect(text[6].body).toContain("PDF version 2");
    expect(text[6].body).toContain(sha256);
  });
});
