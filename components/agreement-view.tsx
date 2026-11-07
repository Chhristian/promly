import { AGREEMENT_LEGAL_LABEL, renderAgreement, type AgreementTerms } from "@/lib/agreement-template";

export function AgreementView({ terms, version, acceptedAt }: { terms: AgreementTerms; version?: number; acceptedAt?: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4 text-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">Promoter agreement{version ? ` · version ${version}` : ""}</div>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200">
          {AGREEMENT_LEGAL_LABEL}
        </span>
      </div>
      <div className="space-y-3">
        {renderAgreement(terms).map((p) => (
          <div key={p.heading}>
            <div className="font-medium">{p.heading}</div>
            <p className="text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
      {acceptedAt && <p className="mt-3 text-xs text-muted-foreground">Accepted by the business on {acceptedAt}.</p>}
    </div>
  );
}
