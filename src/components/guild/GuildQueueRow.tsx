import type { ReactNode } from "react";
import Link from "next/link";
import { Users, ListChecks, ShieldCheck, Eye, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCountdown } from "@/lib/hooks/useCountdown";
import type {
  GuildQueueItem,
  GuildQueueItemPhase,
  GuildQueueItemType,
} from "@/types";

type Variant = "default" | "hot" | "warm";

interface GuildQueueRowProps {
  item: GuildQueueItem;
  /** Visual emphasis — hot (red border) for urgent items, warm (yellow) for waiting. */
  variant?: Variant;
  /** Click handler for the row's primary action. Falls back to `actionHref` navigation. */
  onAction?: (item: GuildQueueItem) => void;
  /** Override label content for the "subject meta" sub-row chunk. */
  subjectExtra?: ReactNode;
}

const TYPE_ICON: Record<GuildQueueItemType, typeof Users> = {
  candidate: Users,
  expert: UserPlus,
  governance: ListChecks,
  reveal: Eye,
};

const TYPE_ICON_TONE: Record<GuildQueueItemType, string> = {
  // Sky-tinted uses the engineering guild signature; we keep it neutral via
  // info-blue tokens because queue rows render across multiple guilds.
  candidate: "bg-info-blue/10 border-info-blue/30 text-info-blue",
  expert: "bg-warning/10 border-warning/25 text-warning",
  governance: "bg-primary/10 border-primary/35 text-primary",
  reveal: "bg-positive/10 border-positive/25 text-positive",
};

const TAG_TONE: Record<GuildQueueItemType, string> = {
  candidate: "bg-info-blue/10 border-info-blue/30 text-info-blue",
  expert: "bg-warning/10 border-warning/25 text-warning",
  governance: "bg-primary/10 border-primary/35 text-primary",
  reveal: "bg-positive/10 border-positive/25 text-positive",
};

const PHASE_LABEL: Record<GuildQueueItemPhase, string> = {
  commit: "Commit",
  reveal: "Reveal",
  vouch: "Vouch",
  vote: "Vote",
  open: "Open",
};

const TYPE_LABEL: Record<GuildQueueItemType, string> = {
  candidate: "Candidate",
  expert: "Expert App",
  governance: "Governance",
  reveal: "Reveal",
};

const VARIANT_BORDER: Record<Variant, string> = {
  default: "border-border hover:border-surface-border-strong",
  hot: "border-negative/35 bg-gradient-to-r from-negative/[0.06] via-card to-card",
  warm: "border-warning/35",
};

const DEFAULT_ACTION_LABEL: Record<GuildQueueItemPhase, string> = {
  commit: "Start review",
  reveal: "Reveal vote",
  vouch: "Review",
  vote: "Cast vote",
  open: "Claim review",
};

interface DeadlineDisplay {
  label: string;
  caption: string;
  tone: "default" | "warm" | "hot";
}

function formatDeadline(deadlineMs: number): DeadlineDisplay {
  if (deadlineMs <= 0) return { label: "Overdue", caption: "Closed", tone: "hot" };

  const totalMinutes = Math.floor(deadlineMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
  const minutes = totalMinutes - days * 24 * 60 - hours * 60;

  let label: string;
  if (days >= 2) label = `${days}d`;
  else if (days === 1) label = `1d ${hours}h`;
  else if (hours >= 1) label = `${hours}h ${minutes}m`;
  else label = `${minutes}m`;

  const tone: DeadlineDisplay["tone"] =
    days === 0 && hours < 24
      ? "hot"
      : days < 3
        ? "warm"
        : "default";

  return { label, caption: "", tone };
}

function captionFor(item: GuildQueueItem): string {
  if (item.type === "governance") return "Vote closes";
  if (item.phase === "reveal") return "Reveal closes";
  if (item.phase === "commit") return "Commit due";
  if (item.phase === "vouch" || item.phase === "vote") return "Vote due";
  return "Closes";
}

/**
 * Single row in the unified member queue.
 *
 * Grid: 44px icon / flexible content / right-aligned deadline / action button.
 * Used by the Queue tab, My Reviews tab, and Governance tab — variant prop
 * controls the urgent (hot) / waiting (warm) borders called out in the mock.
 */
export function GuildQueueRow({
  item,
  variant = "default",
  onAction,
  subjectExtra,
}: GuildQueueRowProps) {
  const Icon = TYPE_ICON[item.type];
  const countdown = useCountdown(item.deadline ?? null);
  const deadline = item.deadline ? formatDeadline(countdown.remaining) : null;
  const actionLabel = item.actionLabel ?? DEFAULT_ACTION_LABEL[item.phase];
  const actionPrimary = item.actionPrimary !== false;

  const handleClick = () => {
    if (onAction) onAction(item);
  };

  const actionClass = cn(
    "rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
    actionPrimary
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "border border-border bg-card text-foreground hover:bg-muted",
  );

  const actionContent = (
    <span className="inline-flex items-center gap-1.5">
      {actionLabel}
      {actionPrimary && <span aria-hidden>→</span>}
    </span>
  );

  return (
    <div
      className={cn(
        "grid grid-cols-[44px_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border px-3 py-3 transition-colors sm:gap-3.5 sm:px-[18px] sm:py-4",
        VARIANT_BORDER[variant],
        variant === "default" && "bg-card",
        variant === "warm" && "bg-card",
        variant === "hot" && "",
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-lg border",
          TYPE_ICON_TONE[item.type],
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Main */}
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
          <span className="truncate">{item.title}</span>
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em]",
              TAG_TONE[item.type],
            )}
          >
            {TYPE_LABEL[item.type]} · {PHASE_LABEL[item.phase]}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          {item.subjectName && (
            <span>
              {item.type === "expert" ? "Sponsored by " : item.type === "governance" ? "Proposed by " : "Candidate: "}
              <strong className="text-foreground">{item.subjectName}</strong>
            </span>
          )}
          {item.subjectMeta && (
            <>
              <span className="text-foreground/40">·</span>
              <span>{item.subjectMeta}</span>
            </>
          )}

          {(item.commitsRequired ?? 0) > 0 && (
            <>
              <span className="text-foreground/40">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span>
                  {item.commitsCompleted ?? 0} of {item.commitsRequired}{" "}
                  {item.type === "governance" ? "votes" : "committed"}
                </span>
                <span className="relative h-1 w-20 overflow-hidden rounded-full bg-muted">
                  <span
                    className="absolute inset-y-0 left-0 bg-primary"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((item.commitsCompleted ?? 0) / Math.max(1, item.commitsRequired ?? 1)) * 100))}%`,
                    }}
                  />
                </span>
              </span>
            </>
          )}

          {typeof item.supportPercent === "number" && (
            <>
              <span className="text-foreground/40">·</span>
              <span className="text-positive">
                {Math.round(item.supportPercent)}% in favor
              </span>
            </>
          )}

          {(item.stakeLocked ?? 0) > 0 && (
            <>
              <span className="text-foreground/40">·</span>
              <span className="inline-flex items-center gap-1 rounded border border-warning/25 bg-warning/10 px-1.5 py-0.5 text-[11px] font-medium text-warning">
                <ShieldCheck className="h-3 w-3" />
                {item.stakeLocked} VETD locked
              </span>
            </>
          )}
          {!item.stakeLocked && (item.stakeRequired ?? 0) > 0 && (
            <>
              <span className="text-foreground/40">·</span>
              <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {item.stakeRequired} VETD required
              </span>
            </>
          )}

          {typeof item.estimatedFeeUsd === "number" && (
            <>
              <span className="text-foreground/40">·</span>
              <span className="text-primary">Est. fee ${item.estimatedFeeUsd}</span>
            </>
          )}

          {subjectExtra}
        </div>
      </div>

      {/* Deadline */}
      <div className="flex flex-col items-end text-right text-xs">
        {deadline ? (
          <>
            <div
              className={cn(
                "font-display text-lg leading-none",
                deadline.tone === "hot" && "text-negative",
                deadline.tone === "warm" && "text-warning",
                deadline.tone === "default" && "text-foreground",
              )}
            >
              {deadline.label}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
              {captionFor(item)}
            </div>
          </>
        ) : (
          <div className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
            Open
          </div>
        )}
      </div>

      {/* Action */}
      {item.actionHref ? (
        <Link href={item.actionHref} className={actionClass}>
          {actionContent}
        </Link>
      ) : (
        <button type="button" className={actionClass} onClick={handleClick}>
          {actionContent}
        </button>
      )}
    </div>
  );
}
