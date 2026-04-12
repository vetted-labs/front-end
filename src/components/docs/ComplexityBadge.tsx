import { Zap, Layers, Target } from "lucide-react";
import { cn } from "@/lib/utils";

type Complexity = "beginner" | "intermediate" | "advanced";

interface ComplexityBadgeProps {
  level: Complexity;
  className?: string;
}

const CONFIG: Record<
  Complexity,
  { label: string; icon: typeof Zap; className: string }
> = {
  beginner: {
    label: "Beginner",
    icon: Zap,
    className: "bg-positive/10 text-positive ring-positive/25 dark:bg-positive/[0.18]",
  },
  intermediate: {
    label: "Intermediate",
    icon: Layers,
    className: "bg-warning/10 text-warning ring-warning/25 dark:bg-warning/[0.18]",
  },
  advanced: {
    label: "Advanced",
    icon: Target,
    className: "bg-negative/10 text-negative ring-negative/25 dark:bg-negative/[0.18]",
  },
};

/**
 * Stripe-inspired complexity pill shown near a page title.
 * Helps readers self-select before committing to a page.
 */
export function ComplexityBadge({ level, className }: ComplexityBadgeProps) {
  const { label, icon: Icon, className: levelClass } = CONFIG[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1",
        levelClass,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
