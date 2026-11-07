import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";

// After login: send each user to their own dashboard.
export default async function DashboardRedirect() {
  const current = await getCurrentUser();
  if (!current) redirect("/auth/login");
  redirect(homeFor(current.profile.role));
}
