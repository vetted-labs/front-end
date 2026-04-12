import { AlertTriangle, Info, Lightbulb, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type CalloutKind = "note" | "tip" | "warning" | "important" | "success";

interface DocsCalloutProps {
  kind?: CalloutKind;
  title?: string;
  children: ReactNode;
  className?: string;
}

const KIND_CONFIG: Record<
  CalloutKind,
  {
    icon: typeof Info;
    label: string;
    /** CSS class that maps to the --docs-callout-* tokens for both light + dark */
    card: string;
    /** Icon color */
    iconColor: string;
  }
> = {
  note: {
    icon: Info,
    label: "Note",
    card: "docs-callout-note",
    iconColor: "text-info-blue",
  },
  tip: {
    icon: Lightbulb,
    label: "Tip",
    card: "docs-callout-tip",
    iconColor: "text-positive",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    card: "docs-callout-warning",
    iconColor: "text-warning",
  },
  important: {
    icon: ShieldAlert,
    label: "Important",
    card: "docs-callout-danger",
    iconColor: "text-negative",
  },
  success: {
    icon: CheckCircle2,
    label: "Success",
    card: "docs-callout-tip",
    iconColor: "text-positive",
  },
};

/**
 * GitBook-style callout — a fully tinted card with an icon on the left.
 * No left-border bar, no coloured title text bleed into children.
 * Tint values match measured GitBook callouts (neutral rgb(247,247,247),
 * success rgb(241,250,243), warning rgb(255,248,237)).
 */
export function DocsCallout({ kind = "note", title, children, className }: DocsCalloutProps) {
  const config = KIND_CONFIG[kind];
  const Icon = config.icon;

  return (
    <aside
      className={cn(
        "my-10 flex gap-4 rounded-xl p-5",
        config.card,
        className
      )}
    >
      <Icon className={cn("mt-[2px] h-[18px] w-[18px] shrink-0", config.iconColor)} />
      <div className="min-w-0 flex-1 text-[15px] leading-[24px] text-foreground/90 [&>*:last-child]:mb-0 [&>p]:my-1.5 [&_a]:text-primary [&_a]:font-medium hover:[&_a]:underline">
        {title && (
          <p className="mb-1 text-[14px] font-semibold text-foreground">{title}</p>
        )}
        {children}
      </div>
    </aside>
  );
}
