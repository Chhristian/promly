import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Link2Off, Sparkles } from "lucide-react";
import { GLANS_REF_COOKIE, demoModeOn, isReferralCode } from "@/lib/conversions";
import { formatMinor, type Currency } from "@/lib/money";
import { getGlansCheckout } from "./data";
import { GlansCheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Glans Bilpleie (demo)", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Fictional car-care business with its "own" checkout, to demo the Conversions API flow. Demo Mode only. */
export default async function GlansDemoPage({ searchParams }: { searchParams: Promise<{ ref?: string | string[] }> }) {
  if (!demoModeOn()) notFound();

  const { ref: refParam } = await searchParams;
  const cookieRef = (await cookies()).get(GLANS_REF_COOKIE)?.value;
  // On the first visit the cookie is only being set on this response, so the URL wins.
  const ref = isReferralCode(refParam) ? refParam : isReferralCode(cookieRef) ? cookieRef : undefined;
  const checkout = await getGlansCheckout(ref);

  return (
    <div className="min-h-dvh bg-background">
      <div className="bg-marker px-4 py-2 text-center text-sm font-semibold text-ink" data-testid="glans-demo-banner">
        Demo business – not a real company
      </div>

      <main className="mx-auto max-w-md px-5 pb-12 pt-8">
        <header className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <div className="text-lg font-bold leading-tight">Glans Bilpleie</div>
            <div className="text-xs text-muted-foreground">Skinnende bil, uten styr</div>
          </div>
        </header>

        {checkout ? (
          <>
            <h1 className="mt-8 text-[2rem]">{checkout.serviceName}</h1>
            <div className="money mt-2 text-4xl" data-testid="glans-price">
              {formatMinor(checkout.priceMinor, checkout.currency as Currency)}
            </div>
            {checkout.description && <p className="mt-3 leading-relaxed text-muted-foreground">{checkout.description}</p>}
            <GlansCheckoutForm refCode={checkout.ref} />
          </>
        ) : (
          <div className="mt-10 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
              <Link2Off className="h-6 w-6" />
            </div>
            <h1 className="text-xl">Åpne siden via en henvisningslenke</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Denne demosiden viser tjenesten og prisen fra Promly-kampanjen lenken hører til.
            </p>
          </div>
        )}

        <footer className="mt-12 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Glans Bilpleie is fictional and is used to demonstrate Promly. No real payments are taken.
        </footer>
      </main>
    </div>
  );
}
