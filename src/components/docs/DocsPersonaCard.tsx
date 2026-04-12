import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocsPersonaCardProps {
  icon: LucideIcon;
  label: string;
  description: string;
  href: string;
  /** Small accent color applied to the icon + hover ring. */
  accent?: "primary" | "positive" | "info";
  /** Optional eyebrow e.g. "Most detailed". */
  badge?: string;
}

const ACCENT_CLASSES: Record<NonNullable<DocsPersonaCardProps["accent"]>, { bg: string; text: string; ring: string; linkText: string }> = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    ring: "group-hover:ring-primary/40",
    linkText: "text-primary",
  },
  positive: {
    bg: "bg-positive/10",
    text: "text-positive",
    ring: "group-hover:ring-positive/40",
    linkText: "text-positive",
  },
  info: {
    bg: "bg-info-blue/10",
    text: "text-info-blue",
    ring: "group-hover:ring-info-blue/40",
    linkText: "text-info-blue",
  },
};

export function DocsPersonaCard({
  icon: Icon,
  label,
  description,
  href,
  accent = "primary",
  badge,
}: DocsPersonaCardProps) {
  const accentClasses = ACCENT_CLASSES[accent];
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col rounded-2xl bg-card p-5 ring-1 ring-border transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        accentClasses.ring
      )}
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {badge}
        </span>
      )}
      <div
        className={cn(
          "mb-3 flex h-10 w-10 items-center justify-center rounded-xl",
          accentClasses.bg
        )}
      >
        <Icon className={cn("h-4 w-4", accentClasses.text)} />
      </div>
      <h3 className="mb-1.5 text-[1.1rem] font-bold tracking-tight text-foreground">{label}</h3>
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>
      <div className={cn("mt-4 inline-flex items-center gap-1.5 text-sm font-semibold", accentClasses.linkText)}>
        Read the guide
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
