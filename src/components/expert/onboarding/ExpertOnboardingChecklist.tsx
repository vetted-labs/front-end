"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Eye, HelpCircle, PlayCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TOUR_TARGETS,
  dataTourTarget,
  type TourTargetValue,
} from "./tourTargets";

export interface ExpertChecklistItem {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  statusLabel?: string;
  statusVariant?: "complete" | "viewed" | "pending";
  href?: string;
  onActivate?: () => void;
  tourTarget?: TourTargetValue;
}

interface ExpertOnboardingChecklistProps {
  items: ExpertChecklistItem[];
  onReplayTour: () => void;
  onDismiss: () => void;
}

export function ExpertOnboardingChecklist({
  items,
  onReplayTour,
  onDismiss,
}: ExpertOnboardingChecklistProps) {
  const completedCount = items.filter((item) => item.complete).length;

  return (
    <section
      className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm"
      {...dataTourTarget(TOUR_TARGETS.onboardingChecklist)}
      aria-labelledby="expert-onboarding-checklist-title"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" />
            <h2 id="expert-onboarding-checklist-title" className="text-sm font-bold text-foreground">
              First expert setup
            </h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {completedCount}/{items.length}
            </span>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Use this when you land here for the first time. It stays practical: where to review, what can block you, and where rewards show up.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onReplayTour}
            icon={<PlayCircle className="h-4 w-4" />}
          >
            Replay setup
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Dismiss expert setup checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const variant = item.statusVariant ?? (item.complete ? "complete" : "pending");
          const Icon =
            variant === "complete" ? CheckCircle2 : variant === "viewed" ? Eye : Circle;
          const statusLabel =
            item.statusLabel ??
            (variant === "complete"
              ? "Complete"
              : variant === "viewed"
                ? "Viewed"
                : "Not complete");
          const content = (
            <div
              {...(item.tourTarget ? dataTourTarget(item.tourTarget) : {})}
              className={cn(
                "flex h-full gap-3 rounded-lg border p-3 transition-colors",
                variant === "complete"
                  ? "border-positive/20 bg-positive/5"
                  : variant === "viewed"
                    ? "border-primary/20 bg-primary/5"
                  : "border-border bg-muted/20 hover:border-primary/25"
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  variant === "complete"
                    ? "text-positive"
                    : variant === "viewed"
                      ? "text-primary"
                      : "text-muted-foreground"
                )}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {item.label}
                  <span className="sr-only">
                    {" "}
                    - {statusLabel}
                  </span>
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
              </div>
            </div>
          );

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                className="block h-full"
                onClick={item.onActivate}
              >
                {content}
              </Link>
            );
          }

          return item.onActivate ? (
            <button
              key={item.id}
              type="button"
              onClick={item.onActivate}
              className="block h-full w-full text-left"
            >
              {content}
            </button>
          ) : (
            <div key={item.id}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}
