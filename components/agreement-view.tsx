import { Download, ExternalLink } from "lucide-react";
import { AGREEMENT_LEGAL_LABEL, renderAgreement, type AgreementTerms } from "@/lib/agreement-template";
import { agreementPdfHref, shortHash } from "@/lib/agreement-pdf";
import { buttonVariants } from "@/components/ui/button";

export type AgreementPdf = { id: string; version: number; sha256: string };

export function AgreementView({
  terms,
  version,
  acceptedAt,
  pdf,
}: {
  terms: AgreementTerms;
  version?: number;
  acceptedAt?: string | null;
  pdf?: AgreementPdf | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">Promoter agreement{version ? ` · version ${version}` : ""}</div>
        <span className="rounded-full border border-[hsl(40_80%_72%)] bg-pending-bg px-2 py-0.5 text-xs text-pending">
          {AGREEMENT_LEGAL_LABEL}
        </span>
      </div>
      <div className="space-y-3">
        {renderAgreement({ ...terms, attachedPdf: pdf ?? null }).map((p) => (
          <div key={p.heading}>
            <div className="font-medium">{p.heading}</div>
            <p className="break-words text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
      {pdf && <AgreementPdfViewer pdf={pdf} />}
      {acceptedAt && <p className="mt-3 text-xs text-muted-foreground">Accepted by the business on {acceptedAt}.</p>}
    </div>
  );
}

/** The PDF shown inline, with Download. Both links redirect to a short-lived signed URL. */
export function AgreementPdfViewer({ pdf }: { pdf: AgreementPdf }) {
  return (
    <div className="mt-4 space-y-2" data-testid="agreement-pdf">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium">Agreement PDF · version {pdf.version}</div>
          <div className="text-xs text-muted-foreground">SHA-256 {shortHash(pdf.sha256)}…</div>
        </div>
        <div className="flex gap-2">
          <a href={agreementPdfHref(pdf.id)} target="_blank" rel="noopener" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ExternalLink className="h-4 w-4" /> Open
          </a>
          <a href={agreementPdfHref(pdf.id, true)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>
      </div>
      <iframe
        src={agreementPdfHref(pdf.id)}
        title={`Agreement PDF version ${pdf.version}`}
        className="h-[60vh] min-h-80 w-full rounded-xl border border-border bg-secondary"
      />
    </div>
  );
}
