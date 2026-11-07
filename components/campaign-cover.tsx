import { Dumbbell, Lamp, Sailboat, Scissors, Sparkles, Store, UtensilsCrossed, Waves, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function categoryLabel(category?: string | null) {
  return (CATEGORY[category ?? "other"] ?? CATEGORY.other).label;
}

/**
 * Campaign "image": the business's photo when it has one, otherwise a
 * category artwork (gradient + icon). Never a fake photo.
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
      <img src={imageUrl} alt="" className={cn("h-full w-full object-cover", className)} />
    );
  }
  return (
    <div
      className={cn("relative grid h-full w-full place-items-center overflow-hidden", className)}
      style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,.35) 0 2px, transparent 3px), radial-gradient(circle at 80% 60%, rgba(255,255,255,.25) 0 1.5px, transparent 2.5px)",
          backgroundSize: "28px 28px, 36px 36px",
        }}
      />
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <Icon className={cn("relative text-white/90 drop-shadow-lg", iconSize)} strokeWidth={1.6} />
    </div>
  );
}

