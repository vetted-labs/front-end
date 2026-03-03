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
        const timestamp = statusTimestamps.get(stage);
        const label = APPLICATION_STATUS_CONFIG[stage]?.label ?? stage;
        const isLast = i === PIPELINE_STAGES.length - 1;

        return (
          <div key={stage} className="flex items-start flex-1 min-w-0">
            <div className="flex flex-col items-center">
              {/* Dot / icon */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  isCompleted
                    ? "bg-primary text-white shadow-md shadow-primary/25"
                    : isCurrent
                      ? "border-2 border-primary bg-primary/10 shadow-sm shadow-primary/10"
                      : "border-2 border-border/50 bg-muted/20"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isCurrent ? (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                ) : null}
              </div>

              {/* Label */}
              <span
                className={`text-[11px] font-medium mt-2 text-center leading-tight ${
                  isCompleted || isCurrent
                    ? "text-foreground"
                    : "text-muted-foreground/40"
                }`}
              >
                {label}
              </span>
              {timestamp && (isCompleted || isCurrent) && (
                <span className="text-[10px] text-muted-foreground/50 mt-0.5">
                  {formatDate(timestamp)}
                </span>
              )}
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="flex-1 mt-[13px] mx-2">
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
        <div className="flex flex-col items-center ml-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500 text-white shadow-md shadow-red-500/25">
            <X className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-medium mt-2 text-red-600 dark:text-red-400">
            Rejected
          </span>
          {statusTimestamps.get("rejected") && (
            <span className="text-[10px] text-muted-foreground/50 mt-0.5">
              {formatDate(statusTimestamps.get("rejected")!)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
