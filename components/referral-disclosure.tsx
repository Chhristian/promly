import { Megaphone } from "lucide-react";

/**
 * Shown at the top of every page a customer reaches through a promoter's link
 * (Norwegian marketing law: the commercial relationship must be clear up front).
 * Only the promoter's display name is shown, nothing else about them.
 */
export function ReferralDisclosure({ promoterName, businessName }: { promoterName: string | null; businessName: string }) {
  const who = promoterName?.trim() || null;
  return (
    <div
      role="note"
      className="flex items-start gap-2 bg-ink px-4 py-3 text-sm text-white"
      data-testid="referral-disclosure"
    >
      <Megaphone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>
        <span className="font-semibold">Advertising.</span>{" "}
        {who ? (
          <>
            You came through {who}&apos;s link. {who} earns a commission from {businessName} if you book.
          </>
        ) : (
          <>You came through a promoter&apos;s link. The promoter earns a commission from {businessName} if you book.</>
        )}{" "}
        Your price is the same.
      </p>
    </div>
  );
}
