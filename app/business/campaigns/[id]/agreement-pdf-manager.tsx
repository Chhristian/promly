"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AGREEMENT_PDF_BUCKET, AGREEMENT_PDF_MAX_BYTES, agreementPdfHref, hasPdfMagicBytes, shortHash } from "@/lib/agreement-pdf";
import { registerAgreementPdf } from "../../actions";

export type PdfVersion = { id: string; version: number; sha256: string; size_bytes: number; file_name: string; uploaded_at: string };

/**
 * Upload the business's own agreement as a PDF. Each upload is a new version;
 * earlier versions stay, and promoters keep the version they accepted.
 */
export function AgreementPdfManager({
  campaignId,
  versions,
  uploadedAtLabels,
}: {
  campaignId: string;
  versions: PdfVersion[];
  uploadedAtLabels: Record<string, string>;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ error?: string; ok?: string } | null>(null);
  const [, startTransition] = useTransition();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setMessage(null);
    const supabase = createClient();
    const path = `${campaignId}/${crypto.randomUUID()}.pdf`;
    try {
      if (file.size > AGREEMENT_PDF_MAX_BYTES) throw new Error(`${file.name} is larger than 5 MB.`);
      // Early feedback only; the server checks the uploaded bytes again.
      if (!hasPdfMagicBytes(new Uint8Array(await file.slice(0, 8).arrayBuffer()))) throw new Error(`${file.name} isn't a PDF.`);
      setBusy(`Uploading ${file.name}…`);
      const { error } = await supabase.storage
        .from(AGREEMENT_PDF_BUCKET)
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (error) throw new Error(/row-level security|unauthorized/i.test(error.message) ? "You can only upload to your own campaigns." : "Upload failed. Please try again.");
      setBusy("Checking the PDF…");
      const res = await registerAgreementPdf(campaignId, path, file.name);
      if (res?.error) throw new Error(res.error); // the server removes a rejected file
      setMessage({ ok: res?.ok ?? "Uploaded." });
      startTransition(() => router.refresh());
    } catch (e) {
      setMessage({ error: e instanceof Error ? e.message : "Upload failed." });
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Your own agreement (PDF, optional)</h3>
          <p className="text-sm text-muted-foreground">
            Use your own terms instead of, or as well as, the brand rules. PDF only, max 5 MB. Each upload is a new version.
          </p>
        </div>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
          data-testid="agreement-pdf-input"
        />
        <Button type="button" variant="secondary" disabled={!!busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          {busy ?? (versions.length ? "Upload new version" : "Upload PDF")}
        </Button>
      </div>

      {versions.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border text-sm" data-testid="agreement-pdf-versions">
          {versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2">
              <span className="min-w-0">
                <span className="font-medium">v{v.version}</span>{" "}
                <span className="break-all text-muted-foreground">{v.file_name}</span>
              </span>
              <span className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{uploadedAtLabels[v.id]}</span>
                <span>{Math.max(1, Math.round(v.size_bytes / 1024))} KB</span>
                <span title={v.sha256}>SHA-256 {shortHash(v.sha256)}…</span>
                <a href={agreementPdfHref(v.id)} target="_blank" rel="noopener" className="font-medium text-primary hover:underline">View</a>
              </span>
            </li>
          ))}
        </ul>
      )}
      {message?.error && <p className="text-sm text-destructive" role="alert">{message.error}</p>}
      {message?.ok && <p className="text-sm text-paid">{message.ok}</p>}
    </div>
  );
}
