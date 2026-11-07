import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/auth";

// After login: send each user to their own dashboard.
export default async function DashboardRedirect() {
  const s = await getSession();
  if (!s) redirect("/auth/login");
  if (!s.profile) redirect("/onboarding"); // logged in, but the account has no profile yet
  redirect(homeFor(s.profile.role));
}
