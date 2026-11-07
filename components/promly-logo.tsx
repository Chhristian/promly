import Link from "next/link";
import { cn } from "@/lib/utils";
import { MARK } from "@/lib/logo-mark";

/**
 * Promly mark: Jakob's megaphone, in the payout-slip palette.
 * Flat colours only (no gradient ids), so any number of logos can share a page.
 * `onDark` swaps the ink parts to white and the sound lines to yellow.
 */
export function PromlyMark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  const ink = onDark ? "#FFFFFF" : MARK.ink;
  return (
    <svg viewBox="0 0 40 40" className={cn("h-8 w-8 shrink-0", className)} aria-hidden>
      <path d={MARK.handle} fill="none" stroke={ink} strokeWidth={MARK.stroke.handle} strokeLinecap="round" />
      <path d={MARK.horn} fill={MARK.cobalt} />
      <ellipse {...MARK.bell} fill={MARK.marker} stroke={ink} strokeWidth={MARK.stroke.rim} />
      <g fill="none" stroke={onDark ? MARK.marker : ink} strokeWidth={MARK.stroke.sound} strokeLinecap="round">
        {MARK.sound.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}

export function PromlyWordmark({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <span
      className={cn(
        "text-[1.4rem] font-extrabold leading-none tracking-[-0.045em]",
        onDark ? "text-white" : "text-ink",
        className,
      )}
    >
      promly
    </span>
  );
}

export function PromlyLogo({ href = "/", className, onDark = false }: { href?: string; className?: string; onDark?: boolean }) {
  return (
    <Link href={href} className={cn("flex shrink-0 items-center gap-2", className)} aria-label="Promly home">
      <PromlyMark onDark={onDark} />
      <PromlyWordmark onDark={onDark} />
    </Link>
  );
}
