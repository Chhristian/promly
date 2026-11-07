import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PromlyLogo } from "@/components/promly-logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <PromlyLogo />
      <div className="card max-w-md p-8">
        <h1 className="text-2xl">Page not found</h1>
        <p className="mt-2 text-muted-foreground">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
