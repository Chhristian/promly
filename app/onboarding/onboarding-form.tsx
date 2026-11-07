"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { finishSetup } from "./actions";

export function OnboardingForm({ email, suggestedName }: { email: string; suggestedName: string }) {
  const [role, setRole] = useState<"business" | "promoter">("promoter");
  const option = (value: "business" | "promoter", title: string, hint: string) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      aria-pressed={role === value}
      className={cn("rounded-xl border p-3 text-left transition", role === value ? "border-primary bg-primary/15" : "border-border hover:bg-secondary")}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </button>
  );
  return (
    <div className="card p-6">
      <h1 className="text-2xl font-bold">Finish setting up your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        You&apos;re logged in as {email}. Tell us how you&apos;ll use Promly.
      </p>
      <ActionForm action={finishSetup} className="mt-6 space-y-5">
        <input type="hidden" name="role" value={role} />
        <div className="grid grid-cols-2 gap-2">
          {option("business", "Business", "I want customers")}
          {option("promoter", "Promoter", "I want to earn")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="display_name">{role === "business" ? "Your name" : "Name shown to businesses"}</Label>
          <Input id="display_name" name="display_name" required maxLength={80} defaultValue={suggestedName} />
        </div>
        <SubmitButton pendingText="Setting up…" className="h-11 w-full">
          Continue
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
