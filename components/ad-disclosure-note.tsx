import { Megaphone } from "lucide-react";

/** Reminder for promoters: every post must be labelled as advertising at the very start (markedsføringsloven). */
export function AdDisclosureNote({ businessName }: { businessName?: string }) {
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground" data-testid="ad-disclosure-note">
      <Megaphone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        Start every post with <span className="font-semibold text-foreground">&quot;Reklame:&quot;</span> or{" "}
        <span className="font-semibold text-foreground">&quot;Advertising:&quot;</span>
        {businessName ? ` and say you earn a commission from ${businessName}` : " and say you earn a commission"}. A hashtag at the end
        isn&apos;t enough. Follow the business&apos;s brand rules.
      </span>
    </p>
  );
}
