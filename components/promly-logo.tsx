import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Promly mark: a megaphone facing right, blue-to-violet horn, three violet sound lines.
 * Rim and handle use currentColor (ink, like the wordmark) so they read on light backgrounds.
 */
export function PromlyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-8 w-8 text-ink", className)} aria-hidden>
      <defs>
        <linearGradient id="promly-mark-horn" x1="3" y1="20" x2="25" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4F86F7" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      {/* handle */}
      <path d="M12.5 23.5 10.25 32.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      {/* horn */}
      <path
        d="M5.5 16.25 24.5 8.5v23L5.5 23.75C3.6 23.1 2.75 21.8 2.75 20s.85-3.1 2.75-3.75Z"
        fill="url(#promly-mark-horn)"
      />
      {/* bell opening and rim */}
      <ellipse cx="25" cy="20" rx="3.75" ry="11.75" fill="#2E1065" stroke="currentColor" strokeWidth="2.5" />
      {/* sound lines */}
      <g fill="none" stroke="#7C3AED" strokeWidth="2.75" strokeLinecap="round">
        <path d="M32 13.25 36 11" />
        <path d="M32.5 20h4.75" />
        <path d="M32 26.75 36 29" />
      </g>
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
