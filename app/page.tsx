import Link from "next/link";
import { PromlyLogo } from "@/components/promly-logo";
import { Button } from "@/components/ui/button";
import { getCurrentUser, homeFor } from "@/lib/auth";

export default async function Home() {
  const current = await getCurrentUser();
  const dashboard = current ? homeFor(current.profile.role) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <PromlyLogo />
        {dashboard ? (
          <Button asChild size="sm">
            <Link href={dashboard}>Open dashboard</Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="secondary">
            <Link href="/auth/login">Log in</Link>
          </Button>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="mb-4 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground">
          Anyone can be a marketer.
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Businesses get customers. <span className="text-gradient">People get paid.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          Businesses publish campaigns with a commission. Promoters share their personal link. When a referred
          customer&apos;s booking is verified, the promoter earns the commission.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          {dashboard ? (
            <Button asChild size="lg" className="bg-brand text-white">
              <Link href={dashboard}>Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="bg-brand text-white">
                <Link href="/auth/login">Log in</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/auth/sign-up">Create an account</Link>
              </Button>
            </>
          )}
        </div>

        <div className="mt-20 grid w-full max-w-4xl gap-4 text-left sm:grid-cols-3">
          {[
            ["1. Publish", "A business sets a commission and publishes a campaign."],
            ["2. Share", "Promoters join, get a personal link and share it anywhere."],
            ["3. Get paid", "A verified booking turns into commission for the promoter."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-border bg-card/60 p-5">
              <div className="font-semibold">{t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{d}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
