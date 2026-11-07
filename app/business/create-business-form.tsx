"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBusiness } from "./actions";

export const selectClass =
  "h-11 w-full rounded-[10px] border border-input bg-card px-3.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25 md:text-sm";
export const textareaClass =
  "min-h-24 w-full rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25 md:text-sm";

export function CreateBusinessForm() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-3xl">Set up your business</h1>
      <p className="mt-1 text-sm text-muted-foreground">Promoters and customers will see this.</p>
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
          <select id="category" name="category" className={selectClass} defaultValue="barbershop">
            <option value="barbershop">Barbershop</option>
            <option value="beauty">Beauty</option>
            <option value="restaurant">Restaurant</option>
            <option value="experience">Experience</option>
            <option value="water_sports">Water sports</option>
            <option value="jet_ski">Jet ski rental</option>
            <option value="boat_tour">Boat tour</option>
            <option value="fitness">Fitness</option>
            <option value="other">Other services</option>
          </select>
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
