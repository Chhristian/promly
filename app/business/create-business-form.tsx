"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBusiness } from "./actions";
import { BUSINESS_CATEGORIES } from "@/lib/categories";

export const selectClass =
  "h-11 w-full rounded-[10px] border border-input bg-card px-3.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25 md:text-sm";
export const textareaClass =
  "min-h-24 w-full rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25 md:text-sm";

export function CreateBusinessForm() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-3xl">Set up your business</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Promly is for businesses that sell online: tours, rentals, experiences, tickets, classes and memberships booked through
        your own online checkout. Promoters and customers will see this.
      </p>
      <ActionForm action={createBusiness} className="mt-6 space-y-4 card p-5">
        <div className="grid gap-2">
          <Label htmlFor="name">Business name</Label>
          <Input id="name" name="name" required maxLength={120} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" maxLength={80} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="country">Country</Label>
            <select id="country" name="country" className={selectClass} defaultValue="NO">
              <option value="NO">Norway (NOK)</option>
              <option value="ES">Spain (EUR)</option>
            </select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <select id="category" name="category" className={selectClass} defaultValue="tour">
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="checkout_url">Your online checkout or booking page</Label>
          <Input
            id="checkout_url"
            name="checkout_url"
            type="url"
            inputMode="url"
            required
            maxLength={500}
            pattern="https://.+"
            placeholder="https://yourbusiness.com/book"
            aria-describedby="checkout_url_help"
          />
          <p id="checkout_url_help" className="text-sm text-muted-foreground">
            Where customers book or buy tickets today (https). Promoters send customers there with their tracked link.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Description</Label>
          <textarea id="description" name="description" maxLength={2000} className={textareaClass} />
        </div>
        <SubmitButton className="w-full">Create business</SubmitButton>
      </ActionForm>
    </div>
  );
}
