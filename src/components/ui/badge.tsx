import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { RANK_COLORS } from "@/config/colors"

// Helper function to get rank-based badge variant
export function getRankBadgeVariant(role: string): "master" | "officer" | "craftsman" | "apprentice" | "recruit" {
  const normalizedRole = role.toLowerCase();
  if (normalizedRole === "master") return "master";
  if (normalizedRole === "officer") return "officer";
  if (normalizedRole === "craftsman") return "craftsman";
  if (normalizedRole === "apprentice") return "apprentice";
  return "recruit";
}

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        subtle:
          "bg-primary/30 text-primary border-primary/50 dark:bg-primary/40 dark:border-primary/70",
        master: RANK_COLORS.master.badge,
        officer: RANK_COLORS.officer.badge,
        craftsman: RANK_COLORS.craftsman.badge,
        apprentice: RANK_COLORS.apprentice.badge,
        recruit: RANK_COLORS.recruit.badge,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
