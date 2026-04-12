import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NextStep {
  title: string;
  description: string;
  href: string;
  icon?: LucideIcon;
  /** "doc" = internal docs link, "app" = deep-link into the running app. */
  kind?: "doc" | "app";
}

interface DocsNextStepsProps {
  title?: string;
  steps: NextStep[];
  className?: string;
  /** Grid layout: "cards" = 3-col tall cards with cover gradient (GitBook style),
   *               "compact" = 2-col horizontal rows with icon chip (legacy). */
  layout?: "cards" | "compact";
}

/**
 * Bottom-of-page "next steps" grid.
 *
 * Default layout is GitBook-style 3-column tall cards with a subtle
 * brand-coloured cover panel on top instead of an image (uses the
 * Vetted pattern as cheap cover art without needing bespoke illustrations).
 */
export function DocsNextSteps({
  title = "Next steps",
  steps,
  className,
  layout = "cards",
}: DocsNextStepsProps) {
  if (layout === "compact") {
    return (
      <section className={cn("mt-10", className)}>
        <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          {title}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((step) => (
            <CompactCard key={step.href} step={step} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={cn("mt-10", className)}>
      <h3 className="mb-5 text-[18px] font-bold tracking-tight text-foreground">
        {title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <CoverCard key={step.href} step={step} />
        ))}
      </div>
    </section>
  );
}

function CoverCard({ step }: { step: NextStep }) {
  const Icon = step.icon;
  const isApp = step.kind === "app";
  return (
    <Link
      href={step.href}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-border transition-all hover:-translate-y-[2px] hover:ring-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      {/* Cover — brand pattern + subtle gradient tint */}
      <div className="relative h-[120px] overflow-hidden bg-gradient-to-br from-primary/10 via-primary/[0.03] to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-primary/[0.03]">
        <div
          aria-hidden
          className="absolute inset-0 vetted-pattern-layer opacity-[0.25] dark:opacity-[0.18]"
        />
        {Icon && (
          <div className="absolute left-5 top-5 flex h-10 w-10 items-center justify-center rounded-lg bg-background/80 text-primary shadow-sm ring-1 ring-border backdrop-blur">
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
        {isApp && (
          <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary ring-1 ring-primary/30 backdrop-blur">
            App
            <ArrowUpRight className="h-3 w-3" />
          </div>
        )}
      </div>
      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[15px] font-semibold leading-[20px] text-foreground group-hover:text-primary">
          {step.title}
        </p>
        <p className="mt-1.5 text-[13.5px] leading-[20px] text-muted-foreground">
          {step.description}
        </p>
      </div>
    </Link>
  );
}

function CompactCard({ step }: { step: NextStep }) {
  const Icon = step.icon;
  const isApp = step.kind === "app";
  return (
    <Link
      href={step.href}
      className="group flex items-start gap-3 rounded-xl bg-card p-4 ring-1 ring-border transition-all hover:-translate-y-[1px] hover:ring-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      {Icon ? (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-foreground group-hover:text-primary">
          {step.title}
          {isApp && <ArrowUpRight className="h-3 w-3 opacity-60" />}
        </p>
        <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted-foreground">
          {step.description}
        </p>
      </div>
    </Link>
  );
}
