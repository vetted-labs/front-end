import { Check, X } from "lucide-react";
import { PIPELINE_STAGES } from "@/lib/statusTransitions";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import { formatDate } from "@/lib/utils";
import type { ApplicationStatus, StatusTransition } from "@/types";

interface PipelineStepperProps {
  currentStatus: ApplicationStatus;
  history: StatusTransition[];
}

export function PipelineStepper({ currentStatus, history }: PipelineStepperProps) {
  const isRejected = currentStatus === "rejected";

  // Build a map of status → timestamp from history (earliest transition to each status)
  const statusTimestamps = new Map<string, string>();
  // Process oldest-first so earliest transition wins
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
  );
  for (const entry of sortedHistory) {
    if (!statusTimestamps.has(entry.toStatus)) {
      statusTimestamps.set(entry.toStatus, entry.changedAt);
    }
  }

  // Find the stage index where rejection happened (the fromStatus of the rejected transition)
  const rejectedFrom = isRejected
    ? history.find((h) => h.toStatus === "rejected")?.fromStatus
    : null;
  const rejectedAtIndex = rejectedFrom
    ? PIPELINE_STAGES.indexOf(rejectedFrom as ApplicationStatus)
    : -1;

  const currentIndex = PIPELINE_STAGES.indexOf(currentStatus);

  return (
    <div className="flex items-start gap-0 w-full">
      {PIPELINE_STAGES.map((stage, i) => {
        const isCompleted = !isRejected
          ? i < currentIndex
          : i <= rejectedAtIndex;
        const isCurrent = !isRejected && stage === currentStatus;
        const isUpcoming = !isCompleted && !isCurrent;
        const label = APPLICATION_STATUS_CONFIG[stage]?.label ?? stage;
        const isLast = i === PIPELINE_STAGES.length - 1;

        return (
          <div key={stage} className="flex items-start flex-1 min-w-0">
            <div className="flex flex-col items-center">
              {/* Dot / icon */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  isCompleted
                    ? "bg-primary text-white shadow-sm shadow-primary/25"
                    : isCurrent
                      ? "border-2 border-primary bg-primary/10"
                      : "border-2 border-border/50 bg-muted/20"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" />
                ) : isCurrent ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                ) : null}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-medium mt-1 text-center leading-tight ${
                  isCompleted || isCurrent
                    ? "text-foreground"
                    : "text-muted-foreground/40"
                }`}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="flex-1 mt-[9px] mx-1.5">
                <div
                  className={`h-0.5 w-full rounded-full transition-colors ${
                    isCompleted && !isUpcoming
                      ? "bg-primary/80"
                      : "bg-border/30 dark:bg-white/[0.05]"
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Rejection branch — shown after the stepper if rejected */}
      {isRejected && (
        <div className="flex flex-col items-center ml-1.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500 text-white shadow-sm shadow-red-500/25">
            <X className="w-3 h-3" />
          </div>
          <span className="text-[10px] font-medium mt-1 text-red-600 dark:text-red-400">
            Rejected
          </span>
        </div>
      )}
    </div>
  );
}
