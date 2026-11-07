import Link from "next/link";
import { ArrowRight, BadgeCheck, Megaphone, Share2, Wallet } from "lucide-react";
import { PromlyLogo } from "@/components/promly-logo";
import { Button } from "@/components/ui/button";
import { getSession, homeFor } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  const dashboard = session ? (session.profile ? homeFor(session.profile.role) : "/onboarding") : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <PromlyLogo />
        {dashboard ? (
          <Button asChild size="sm" className="rounded-full">
            <Link href={dashboard}>Open dashboard</Link>
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button asChild size="sm" variant="ghost" className="rounded-full">
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild size="sm" variant="secondary" className="rounded-full">
              <Link href="/auth/sign-up">Get started</Link>
            </Button>
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 pb-16 pt-8 text-center sm:pt-12">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-200">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-300" /> Anyone can be a marketer
        </p>
        <h1 className="max-w-5xl text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.25rem]">
          Businesses get customers.
          <br />
          <span className="text-gradient">People get paid.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Local businesses publish offers with a commission. Anyone can share them. When a referred customer&apos;s booking is
          verified, the promoter earns the full commission.
        </p>
        <div className="mt-10 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          {dashboard ? (
            <Button asChild size="lg" className="bg-brand h-12 rounded-full px-8 text-base text-white shadow-xl shadow-violet-900/50">
              <Link href={dashboard}>
                Open dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="bg-brand h-12 rounded-full px-8 text-base text-white shadow-xl shadow-violet-900/50">
                <Link href="/auth/sign-up">
                  Create a free account <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="h-12 rounded-full px-8 text-base">
                <Link href="/auth/login">Log in</Link>
              </Button>
            </>
          )}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">Promoters keep 100% of the commission · Businesses pay 2.75% only on verified bookings</p>

        <div className="mt-16 grid w-full max-w-5xl gap-4 text-left sm:grid-cols-3">
          {[
            { icon: Megaphone, title: "Publish", body: "A business sets a commission, accepts the agreement and publishes a campaign." },
            { icon: Share2, title: "Share", body: "Promoters join, get a personal link, QR code and ready-made texts, and share anywhere." },
            { icon: Wallet, title: "Get paid", body: "The business confirms the service. After the refund window, the commission is the promoter's." },
          ].map((s, i) => (
            <div key={s.title} className="card p-6">
              <div className="flex items-center gap-3">
                <span className="bg-brand grid h-10 w-10 place-items-center rounded-xl text-white shadow-lg shadow-violet-900/40">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-muted-foreground">Step {i + 1}</span>
              </div>
              <div className="mt-4 text-xl font-semibold">{s.title}</div>
              <div className="mt-1 text-muted-foreground">{s.body}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-emerald-400" /> Pay only for verified customers</span>
          <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-emerald-400" /> Live updates for both sides</span>
          <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-emerald-400" /> Norway &amp; Spain · NOK &amp; EUR</span>
        </div>
      </main>
    </div>
  );
}
