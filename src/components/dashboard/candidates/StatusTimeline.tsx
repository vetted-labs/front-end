import { Card } from "@/components/ui/card";
import {
  APPLICATION_STATUS_CONFIG,
  APPLICATION_STATUS_TIMELINE_CONFIG,
  APPLICATION_STATUS_TIMELINE_DEFAULT,
  APPLICATION_STATUS_TIMELINE_NULL,
} from "@/config/constants";
import { formatTimeAgo, formatDate } from "@/lib/utils";
import { isTerminalStatus } from "@/lib/statusTransitions";
import type { StatusTransition, ApplicationStatus } from "@/types";

interface StatusTimelineProps {
  history: StatusTransition[];
}

function getStatusColor(status: ApplicationStatus | null): {
  dotClass: string;
  textClass: string;
} {
  if (!status) return APPLICATION_STATUS_TIMELINE_NULL;
  return APPLICATION_STATUS_TIMELINE_CONFIG[status] ?? APPLICATION_STATUS_TIMELINE_DEFAULT;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function TimelineEntry({ entry }: { entry: StatusTransition }) {
  const { dotClass, textClass } = getStatusColor(entry.toStatus);
  const toConfig = APPLICATION_STATUS_CONFIG[entry.toStatus];
  const fromConfig = entry.fromStatus ? APPLICATION_STATUS_CONFIG[entry.fromStatus] : null;
  const isInitial = entry.fromStatus === null;
  const terminal = isTerminalStatus(entry.toStatus);

  return (
    <div className="relative pl-14 group">
      {/* Timeline dot */}
      <div
        className={`absolute left-[16px] top-[20px] w-[15px] h-[15px] rounded-full border-2 border-background z-10 ${dotClass}`}
      />

      <Card padding="none" hover className="transition-all">
        <div className="p-4">
          {/* Top row: transition description */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {isInitial ? (
                <span className="text-sm font-medium text-foreground">
                  Application submitted
                </span>
              ) : (
                <span className="text-sm font-medium text-foreground">
                  Status changed to{" "}
                  <span className={textClass}>
                    {toConfig?.label ?? entry.toStatus}
                  </span>
                </span>
              )}

              {terminal && (
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${toConfig?.className ?? ""}`}
                >
                  Final
                </span>
              )}
            </div>

            <span className="text-xs text-muted-foreground/70 whitespace-nowrap tabular-nums flex-shrink-0">
              {formatTimeAgo(entry.changedAt)}
            </span>
          </div>

          {/* From → To badges */}
          {!isInitial && fromConfig && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${fromConfig.className}`}>
                {fromConfig.label}
              </span>
              <span className="text-muted-foreground/40">&rarr;</span>
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${toConfig?.className ?? ""}`}>
                {toConfig?.label ?? entry.toStatus}
              </span>
            </div>
          )}

          {/* Note */}
          {entry.note && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              &ldquo;{entry.note}&rdquo;
            </p>
          )}

          {/* Full date */}
          <p className="text-xs text-muted-foreground/40 mt-2 tabular-nums">
            {formatDate(entry.changedAt)} at {formatTime(entry.changedAt)}
          </p>
        </div>
      </Card>
    </div>
  );
}

export function StatusTimeline({ history }: StatusTimelineProps) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No status history available.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-[23px] top-0 bottom-0 w-px bg-border/60 dark:bg-muted/40" />

      <div className="space-y-2">
        {history.map((entry) => (
          <TimelineEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
