/**
 * Promly works with businesses that sell online: bookings or tickets through their own
 * online checkout. These are the categories new businesses can choose. (Older values such
 * as barbershop stay valid in the database for existing rows but are no longer offered.)
 */
export const BUSINESS_CATEGORIES = [
  { value: "tour", label: "Tours" },
  { value: "boat_tour", label: "Boat tours" },
  { value: "jet_ski", label: "Jet ski rental" },
  { value: "water_sports", label: "Water sports and rentals" },
  { value: "experience", label: "Experiences and classes" },
  { value: "activity", label: "Activities (escape rooms, climbing, …)" },
  { value: "event", label: "Events and festivals (tickets)" },
  { value: "nightlife", label: "Nightlife (18+)" },
  { value: "club", label: "Club tickets (18+)" },
  { value: "fitness", label: "Fitness memberships" },
  { value: "restaurant", label: "Restaurant with online booking" },
  { value: "other", label: "Other online service" },
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]["value"];
export const BUSINESS_CATEGORY_VALUES = BUSINESS_CATEGORIES.map((c) => c.value) as [BusinessCategory, ...BusinessCategory[]];
