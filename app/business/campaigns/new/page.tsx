import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getMyBusiness } from "@/lib/business-data";
import { NewCampaignForm } from "../campaign-forms";

export default async function NewCampaignPage() {
  const { user, supabase } = await requireRole("business");
  const business = await getMyBusiness(supabase, user.id);
  if (!business) redirect("/business");
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold">New campaign</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start with the service. You&apos;ll set the commission in the agreement on the next screen.
      </p>
      <NewCampaignForm currency={business.currency} />
    </div>
  );
}
