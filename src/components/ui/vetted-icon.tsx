import { cn } from "@/lib/utils";

export type VettedIconName =
  | "application"
  | "consensus"
  | "design"
  | "document"
  | "earnings-notif"
  | "earnings"
  | "endorsement"
  | "engineering"
  | "finance"
  | "guild-ranks"
  | "guilds"
  | "home"
  | "hr"
  | "job"
  | "leaderboard"
  | "marketing"
  | "message"
  | "notification"
  | "operations"
  | "product"
  | "profile"
  | "reputation"
  | "sales"
  | "staking"
  | "vet-talent"
  | "vetting"
  | "voting"
  | "wallet";

interface VettedIconProps {
  name: VettedIconName;
  className?: string;
}

/**
 * Renders a custom Vetted brand icon using CSS mask-image.
 * The icon inherits `currentColor` so it works with Tailwind text color
 * utilities and responds to dark mode, active states, etc. — just like
 * Lucide SVG icons.
 */
export function VettedIcon({ name, className }: VettedIconProps) {
  return (
    <span
      role="img"
      aria-hidden="true"
      className={cn("inline-block", className)}
      style={{
        maskImage: `url(/icons/vetted/${name}.png)`,
        WebkitMaskImage: `url(/icons/vetted/${name}.png)`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        backgroundColor: "currentColor",
      }}
    />
  );
}
