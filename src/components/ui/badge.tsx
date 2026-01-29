import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Helper function to get rank-based badge variant
export function getRankBadgeVariant(role: string): "master" | "officer" | "craftsman" | "recruit" {
  const normalizedRole = role.toLowerCase();
  if (normalizedRole === "master") return "master";
  if (normalizedRole === "officer") return "officer";
  if (normalizedRole === "craftsman") return "craftsman";
  return "recruit";
}

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
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
        master:
          "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-700/60",
        officer:
          "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/50 dark:text-blue-100 dark:border-blue-700/60",
        craftsman:
          "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/50 dark:text-orange-100 dark:border-orange-700/60",
        recruit:
          "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-900/50 dark:text-cyan-100 dark:border-cyan-700/60",
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
