"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dayKey, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createBookingAction } from "../actions";

const TZ = "Europe/Oslo";
const weekday = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" }).format(new Date(iso));
const dayNum = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric" }).format(new Date(iso));
const month = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, month: "short" }).format(new Date(iso));
const longDay = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long" }).format(new Date(iso));

export function BookingForm({ code, days }: { code: string; days: { day: string; slots: string[] }[] }) {
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const current = days[dayIdx];

  return (
    <ActionForm action={createBookingAction} className="mt-7 space-y-6">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="slot_start" value={slot ?? ""} />

      <div>
        <div className="mb-2 text-sm font-semibold">Pick a day</div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d, i) => (
            <button
              key={d.day}
              type="button"
              onClick={() => {
                setDayIdx(i);
                setSlot(null);
              }}
              className={cn(
                "flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2 transition-colors duration-150",
                i === dayIdx ? "border-ink bg-ink text-white" : "border-border hover:bg-secondary",
              )}
            >
              <span className={cn("text-xs", i === dayIdx ? "text-white/70" : "text-muted-foreground")}>{d.day === dayKey(new Date().toISOString()) ? "Today" : weekday(d.slots[0])}</span>
              <span className="money text-xl leading-tight">{dayNum(d.slots[0])}</span>
              <span className={cn("text-xs", i === dayIdx ? "text-white/70" : "text-muted-foreground")}>{month(d.slots[0])}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold">Pick a time</div>
        <div className="grid grid-cols-4 gap-2">
          {current?.slots.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSlot(s)}
              aria-pressed={slot === s}
              className={cn(
                "rounded-[10px] border py-3 text-base font-bold tabular-nums transition-colors duration-150",
                slot === s ? "border-ink bg-marker text-ink" : "border-border hover:bg-secondary",
              )}
            >
              {formatTime(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold">Your details</div>
        <div className="grid gap-1.5">
          <Label htmlFor="customer_name">Name</Label>
          <Input id="customer_name" name="customer_name" required maxLength={100} autoComplete="name" className="h-12 text-base" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="customer_phone">Phone</Label>
          <Input id="customer_phone" name="customer_phone" required type="tel" inputMode="tel" maxLength={40} autoComplete="tel" placeholder="+47 400 00 000" className="h-12 text-base" />
        </div>
      </div>

      <div className="sticky bottom-3 z-10">
        <SubmitButton pendingText="Booking…" disabled={!slot} className="h-14 w-full text-lg shadow-[0_8px_24px_-8px_hsl(232_87%_54%/0.6)]">
          {slot ? `Book ${longDay(slot)} ${formatTime(slot)}` : "Pick a time to book"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
