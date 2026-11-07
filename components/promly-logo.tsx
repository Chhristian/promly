import Link from "next/link";

export function PromlyLogo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold tracking-tight">
      <span className="bg-brand grid h-8 w-8 place-items-center rounded-lg text-sm text-white shadow-lg shadow-violet-500/30">
        P
      </span>
      <span className="text-lg">
        Prom<span className="text-gradient">ly</span>
      </span>
    </Link>
  );
}
