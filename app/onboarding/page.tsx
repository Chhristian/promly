import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/auth";
import { PromlyLogo } from "@/components/promly-logo";
import { OnboardingForm } from "./onboarding-form";

/** For logged-in accounts that have no profile yet: pick a role and finish setup. */
export default async function OnboardingPage() {
  const s = await getSession();
  if (!s) redirect("/auth/login");
  if (s.profile) redirect(homeFor(s.profile.role));
  const suggested = typeof s.user.user_metadata?.display_name === "string" ? s.user.user_metadata.display_name : "";
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl px-4 py-5">
        <PromlyLogo />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <OnboardingForm email={s.user.email ?? ""} suggestedName={suggested} />
        </div>
      </div>
    </div>
  );
}
