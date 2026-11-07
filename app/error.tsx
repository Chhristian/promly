"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromlyLogo } from "@/components/promly-logo";

/** Friendly error page: never shows raw errors to people. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <PromlyLogo />
      <div className="card max-w-md p-8">
        <h1 className="text-2xl">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">
          That didn&apos;t load. It&apos;s usually a short connection hiccup. Try again, and your data will be right where you left it.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset} >
            <RefreshCw className="h-4 w-4" /> Try again
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
