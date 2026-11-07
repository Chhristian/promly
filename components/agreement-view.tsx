import { AGREEMENT_LEGAL_LABEL, renderAgreement, type AgreementTerms } from "@/lib/agreement-template";

export function AgreementView({ terms, version, acceptedAt }: { terms: AgreementTerms; version?: number; acceptedAt?: string | null }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">Promoter agreement{version ? ` · version ${version}` : ""}</div>
        <span className="rounded-full border border-[hsl(40_80%_72%)] bg-pending-bg px-2 py-0.5 text-xs text-pending">
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
