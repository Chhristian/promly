import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body?: React.ReactNode;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start rounded-2xl border border-dashed border-input bg-card/60 px-6 py-8", className)}>
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-marker text-ink">
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-lg font-extrabold tracking-[-0.01em]">{title}</div>
      {body && <div className="mt-1 max-w-md text-muted-foreground">{body}</div>}
      {action && (
        <Button asChild className="mt-4">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
