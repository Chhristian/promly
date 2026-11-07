const TZ = "Europe/Oslo";

/** "Sun 8 Nov, 10:00" in Oslo time. */
/** External and discount-code bookings have no Promly time slot. */
export function formatSlot(iso: string | null): string {
  if (!iso) return "Booked outside Promly";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

/** "8 Nov 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

/** "8 Nov, 10:42" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

/** Day key "2026-11-08" in Oslo time, for grouping slots. */
export function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });
}

export function formatDayHeading(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
