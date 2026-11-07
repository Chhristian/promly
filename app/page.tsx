import Link from "next/link";
import { PromlyLogo } from "@/components/promly-logo";
import { Button } from "@/components/ui/button";
import { getSession, homeFor } from "@/lib/auth";
import { businessTotalMinor, formatMinor, platformFeeMinor } from "@/lib/money";

// Example figures for the slip, computed with the same functions the server uses.
const PRICE = 50_000;
const COMMISSION = 10_000;
const FEE = platformFeeMinor(PRICE);
const TOTAL = businessTotalMinor(COMMISSION, FEE);
const kr = (m: number) => formatMinor(m, "NOK");

export default async function Home() {
  const session = await getSession();
  const dashboard = session ? (session.profile ? homeFor(session.profile.role) : "/onboarding") : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <PromlyLogo />
        {dashboard ? (
          <Button asChild size="sm">
            <Link href={dashboard}>Open dashboard</Link>
          </Button>
        ) : (
          <div className="flex gap-1.5">
            <Button asChild size="sm" variant="ghost">
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href="/auth/sign-up">Sign up</Link>
            </Button>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4">
        <section className="grid items-center gap-10 pb-16 pt-6 sm:pt-12 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:pb-24">
          <div>
            <h1 className="text-[clamp(2.75rem,8.5vw,4.6rem)] leading-[0.98] tracking-[-0.045em]">
              Refer a sale.
              <br />
              Get paid.
            </h1>
            <p className="mt-4 text-xl font-bold tracking-[-0.02em] sm:text-2xl">Only when the customer actually shows up.</p>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground sm:text-xl">
              Local businesses set a commission. You share their offer with friends. When the customer has been and the
              business confirms it, the whole commission is yours.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {dashboard ? (
                <Button asChild size="lg">
                  <Link href={dashboard}>Open dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/auth/sign-up">Create a free account</Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary">
                    <Link href="/auth/login">Log in</Link>
                  </Button>
                </>
              )}
            </div>
            <ul className="mt-8 grid max-w-xl gap-x-6 gap-y-1.5 text-sm text-muted-foreground sm:grid-cols-2">
              <li>Promoters keep 100% of the commission</li>
              <li>Businesses pay 2.75% only on verified bookings</li>
              <li>Both sides see every step live</li>
            </ul>
          </div>

          {/* A static example, labelled as one. It never pretends to be live activity. */}
          <figure className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="slip relative overflow-hidden p-6 sm:p-8">
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>Example payout slip</span>
                <span>Oslo</span>
              </div>
              <div className="mt-5 text-lg font-bold">Dinner for two at a local restaurant</div>
              <dl className="mt-5 space-y-2.5 text-[0.95rem]">
                <div className="flex justify-between gap-4">
                  <dt className="text-white/65">Customer pays the business</dt>
                  <dd className="money font-semibold">{kr(PRICE)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/65">Business pays Promly</dt>
                  <dd className="money font-semibold">{kr(TOTAL)}</dd>
                </div>
                <div className="flex justify-between gap-4 pl-4 text-sm">
                  <dt className="text-white/50">Platform fee 2.75% of {kr(PRICE)}</dt>
                  <dd className="money font-medium text-white/70">{kr(FEE)}</dd>
                </div>
              </dl>
              <div className="my-6 border-t border-dashed border-white/25" />
              <div className="text-sm text-white/65">You earn</div>
              <div className="money mt-1 text-[clamp(3rem,10vw,4.5rem)] leading-none tracking-[-0.045em]">
                <span className="text-marker">{kr(COMMISSION)}</span>
              </div>
              <p className="mt-4 text-sm text-white/60">Paid once the service is verified and the refund window has passed.</p>
            </div>
          </figure>
        </section>

        <section className="border-t border-border py-14 sm:py-20">
          <h2 className="text-3xl sm:text-4xl">How it works</h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {[
              { title: "The business publishes", body: "It picks a service, sets the commission, accepts the agreement and goes live." },
              { title: "You share", body: "Join the campaign and get your own link, QR code and ready-made texts. Share them anywhere." },
              { title: "You get paid", body: "The customer books through your link. The business confirms the visit. After the refund window, it's yours." },
            ].map((s, i) => (
              <li key={s.title}>
                <div className="money grid h-10 w-10 place-items-center rounded-full bg-ink text-white">{i + 1}</div>
                <h3 className="mt-4 text-xl">{s.title}</h3>
                <p className="mt-1.5 text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-2 sm:pb-24">
          <div className="card p-6 sm:p-8">
            <h2 className="text-2xl">For businesses</h2>
            <p className="mt-2 text-muted-foreground">
              Pay for customers who actually came, not for clicks or views. You set the commission, and you confirm every visit
              before anything is owed.
            </p>
          </div>
          <div className="card p-6 sm:p-8">
            <h2 className="text-2xl">For promoters</h2>
            <p className="mt-2 text-muted-foreground">
              Recommend places you already like. Track clicks, bookings and money as it happens, and keep the full commission.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground">
          <PromlyLogo className="scale-90" />
          <span>Built for the Oslo Sprint, 2026</span>
        </div>
      </footer>
    </div>
  );
}
