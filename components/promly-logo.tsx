import Link from "next/link";
import { cn } from "@/lib/utils";

/** Promly mark: a cobalt tile with a lowercase p and the yellow "punched coin" of a payout slip. */
export function PromlyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="40" height="40" rx="10" fill="#2440F0" />
      <path
        d="M14.5 33V12.5h6.75a6.75 6.75 0 0 1 0 13.5H14.5"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="28.5" cy="31" r="3.25" fill="#FFE14D" />
    </svg>
  );
}

export function PromlyWordmark({ className }: { className?: string }) {
  return <span className={cn("text-[1.4rem] font-extrabold leading-none tracking-[-0.045em] text-ink", className)}>promly</span>;
}

export function PromlyLogo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex shrink-0 items-center gap-2", className)} aria-label="Promly home">
      <PromlyMark />
      <PromlyWordmark />
    </Link>
  );
}
