import Link from "next/link";
import { cn } from "@/lib/utils";

/** Promly mark: a "P" whose bowl turns into an upward arrow (growth, getting paid). */
export function PromlyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-8 w-8", className)} aria-hidden>
      <defs>
        <linearGradient id="promly-g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="0.55" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#promly-g)" />
      <path d="M13 30V11h8.5a6.5 6.5 0 0 1 0 13H17" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24.5 17.5 30 12m0 0h-4.6M30 12v4.6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
    </svg>
  );
}

export function PromlyWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-xl font-extrabold tracking-tight", className)}>
      prom<span className="text-gradient">ly</span>
    </span>
  );
}

export function PromlyLogo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex shrink-0 items-center gap-2", className)} aria-label="Promly home">
      <PromlyMark />
      <PromlyWordmark />
    </Link>
  );
}
