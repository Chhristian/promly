import { Dumbbell, Lamp, Sailboat, Scissors, Sparkles, Store, UtensilsCrossed, Waves, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Flat daylight tints for covers without a photo (the promo image keeps from/to).
const TINT: Record<string, string> = {
  barbershop: "#DCE3FF",
  beauty: "#FBE0EC",
  restaurant: "#FFE6D2",
  experience: "#E4E0FA",
  water_sports: "#D6EEFA",
  jet_ski: "#D3F2F4",
  boat_tour: "#DAEBFB",
  fitness: "#DDF3E4",
  other: "#E6EAF0",
};

const CATEGORY: Record<string, { icon: LucideIcon; from: string; to: string; label: string }> = {
  barbershop: { icon: Scissors, from: "#7c3aed", to: "#1e3a8a", label: "Barbershop" },
  beauty: { icon: Sparkles, from: "#db2777", to: "#6d28d9", label: "Beauty" },
  restaurant: { icon: UtensilsCrossed, from: "#ea580c", to: "#7c2d12", label: "Restaurant" },
  experience: { icon: Lamp, from: "#0891b2", to: "#4c1d95", label: "Experience" },
  water_sports: { icon: Waves, from: "#0284c7", to: "#312e81", label: "Water sports" },
  jet_ski: { icon: Waves, from: "#06b6d4", to: "#1d4ed8", label: "Jet ski" },
  boat_tour: { icon: Sailboat, from: "#0ea5e9", to: "#1e3a8a", label: "Boat tour" },
  fitness: { icon: Dumbbell, from: "#16a34a", to: "#1e3a8a", label: "Fitness" },
  other: { icon: Store, from: "#6366f1", to: "#1e1b4b", label: "Other" },
};

/** Gradient colours of the category artwork (also used by the promo image). */
export function categoryColors(category?: string | null): { from: string; to: string } {
  const c = CATEGORY[category ?? "other"] ?? CATEGORY.other;
  return { from: c.from, to: c.to };
}

/** Flat tint of the category artwork (also used by the promo image). */
export function categoryTint(category?: string | null): string {
  return TINT[category ?? "other"] ?? TINT.other;
}

export function categoryLabel(category?: string | null) {
  return (CATEGORY[category ?? "other"] ?? CATEGORY.other).label;
}

/**
 * Campaign "image": the business's photo when it has one, otherwise a
 * flat category artwork (tint + icon). Never a fake photo.
 */
export function CampaignCover({
  category,
  imageUrl,
  className,
  size = "md",
}: {
  category?: string | null;
  imageUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const c = CATEGORY[category ?? "other"] ?? CATEGORY.other;
  const Icon = c.icon;
  const iconSize = size === "lg" ? "h-20 w-20" : size === "sm" ? "h-7 w-7" : "h-12 w-12";
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt="" className={cn("h-full w-full object-cover", className)} data-testid="cover-photo" />
    );
  }
  const tint = TINT[category ?? "other"] ?? TINT.other;
  return (
    <div
      className={cn("relative grid h-full w-full place-items-center overflow-hidden", className)}
      style={{ backgroundColor: tint }}
      aria-hidden
    >
      <Icon className={cn("relative text-ink", iconSize)} strokeWidth={1.5} />
    </div>
  );
}
