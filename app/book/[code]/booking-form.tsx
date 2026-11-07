"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDayHeading, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createBookingAction } from "../actions";

export function BookingForm({ code, days }: { code: string; days: { day: string; slots: string[] }[] }) {
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const current = days[dayIdx];

  return (
    <ActionForm action={createBookingAction} className="mt-6 space-y-5">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="slot_start" value={slot ?? ""} />

      <div>
        <div className="mb-2 text-sm font-medium">1. Pick a day</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((d, i) => (
            <button
              key={d.day}
              type="button"
              onClick={() => { setDayIdx(i); setSlot(null); }}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-2 text-sm",
                i === dayIdx ? "border-primary bg-primary/15" : "border-border",
              )}
            >
              {formatDayHeading(d.slots[0]).replace(/ \w+$/, "")}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium">2. Pick a time</div>
        <div className="grid grid-cols-4 gap-2">
          {current?.slots.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSlot(s)}
              aria-pressed={slot === s}
              className={cn(
                "rounded-lg border py-3 text-sm font-medium tabular-nums",
                slot === s ? "bg-brand border-transparent text-white" : "border-border hover:bg-secondary",
              )}
            >
              {formatTime(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium">3. Your details</div>
        <div className="grid gap-2">
          <Label htmlFor="customer_name">Name</Label>
          <Input id="customer_name" name="customer_name" required maxLength={100} autoComplete="name" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="customer_phone">Phone</Label>
          <Input id="customer_phone" name="customer_phone" required type="tel" inputMode="tel" maxLength={40} autoComplete="tel" placeholder="+47 400 00 000" />
        </div>
      </div>

      <SubmitButton pendingText="Booking…" className="h-12 w-full text-base">
        {slot ? `Book ${formatDayHeading(slot).split(" ").slice(0, 1).join("")} ${formatTime(slot)}` : "Pick a time to book"}
      </SubmitButton>
    </ActionForm>
  );
}
