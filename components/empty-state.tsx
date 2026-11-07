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
    <div className={cn("card flex flex-col items-center px-6 py-10 text-center", className)}>
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-violet-300">
        <Icon className="h-6 w-6" />
      </div>
      <div className="font-semibold">{title}</div>
      {body && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</div>}
      {action && (
        <Button asChild className="bg-brand mt-4 text-white">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
