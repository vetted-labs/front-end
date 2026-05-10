"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
  Link2,
  ShieldCheck,
  Eye,
  Lock,
  TrendingUp,
  TrendingDown,
  Brain,
  Target,
  AlertTriangle,
  ExternalLink,
  Award,
  Users,
} from "lucide-react";
import { expertApi, guildsApi, commitRevealApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { logger } from "@/lib/logger";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { STATUS_COLORS } from "@/config/colors";
import { cn } from "@/lib/utils";
import type {
  ExpertCRPhaseStatus,
  CommitRevealPhaseStatus,
  ExpertApplicationFinalization,
} from "@/types";

interface ViewReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string | null;
  applicantName: string;
  reviewType: "expert" | "candidate";
  walletAddress: string;
  expertId?: string;
}

type StatusTone = "positive" | "negative" | "warning" | "info" | "neutral" | "pending";

export function ViewReviewModal({
  isOpen,
  onClose,
  applicationId,
  applicantName,
  reviewType,
  walletAddress,
  expertId,
}: ViewReviewModalProps) {
  const [crStatus, setCrStatus] = useState<
    ExpertCRPhaseStatus | CommitRevealPhaseStatus | null
  >(null);
  const [finalization, setFinalization] =
    useState<ExpertApplicationFinalization | null>(null);

  const shouldFetch = isOpen && !!applicationId && !!walletAddress;

  const { data: review, isLoading: loading, error } = useFetch(
    () =>
      reviewType === "expert"
        ? expertApi.getMyExpertApplicationReview(applicationId!, walletAddress)
        : guildsApi.getMyCandidateApplicationReview(applicationId!, walletAddress),
    { skip: !shouldFetch }
  );

  // Fetch commit-reveal phase status (non-critical — silent on failure)
  useFetch<ExpertCRPhaseStatus | CommitRevealPhaseStatus>(
    () => {
      const fetch =
        reviewType === "expert"
          ? expertApi.expertCommitReveal.getPhaseStatus(applicationId!)
          : commitRevealApi.getPhaseStatus(applicationId!);
      return fetch;
    },
    {
      skip: !shouldFetch,
      onSuccess: (data) => setCrStatus(data),
      onError: (msg) => {
        logger.warn(
          "Phase status not available — direct vote or no CR enabled",
          msg
        );
        setCrStatus(null);
      },
    }
  );

  // Fetch finalization data for consensus results (non-critical — silent on failure)
  useFetch<ExpertApplicationFinalization>(
    () => expertApi.getExpertApplicationFinalization(applicationId!),
    {
      skip: !shouldFetch || reviewType !== "expert",
      onSuccess: (data) => setFinalization(data),
      onError: () => setFinalization(null),
    }
  );

  if (!isOpen || !applicationId) return null;

  const isCommitPhase = review?.revealed === false && !review?.vote;

  // Derive the phase from crStatus
  const crPhase = crStatus
    ? "votingPhase" in crStatus
      ? (crStatus as ExpertCRPhaseStatus).votingPhase
      : (crStatus as CommitRevealPhaseStatus).phase
    : null;

  // Missed reveal: application is finalized but the expert never revealed
  const missedReveal = crPhase === "finalized" && review?.revealed === false;

  // Consensus result data for finalized applications
  const isFinalized = crPhase === "finalized" && !!finalization;
  const expertVote = finalization?.votes?.find(
    (v) => expertId && v.reviewerId === expertId
  );

  // Score data comes from the review (stored server-side during commit)
  const scores = review?.criteriaScores as Record<string, unknown> | undefined;
  const generalScores = scores?.general as Record<string, unknown> | undefined;
  const domainScores = scores?.domain as Record<string, unknown> | undefined;
  const generalTotal = (generalScores?.total as number) ?? 0;
  const generalMax = (generalScores?.max as number) ?? 0;
  const domainTotal = (domainScores?.total as number) ?? 0;
  const domainMax = (domainScores?.max as number) ?? 0;
  const overallMax =
    (scores?.overallMax as number) || generalMax + domainMax || 0;
  const overallScore = review?.overallScore ?? 0;
  const scorePercent =
    overallMax > 0 ? Math.round((overallScore / overallMax) * 100) : 0;

  const justifications = review?.criteriaJustifications as
    | Record<string, unknown>
    | undefined;
  const generalJustifications = justifications?.general as
    | Record<string, string>
    | undefined;
  const domainJustifications = justifications?.domain as
    | Record<string, string>
    | undefined;

  const hasScores = !isCommitPhase && overallMax > 0;

  // Status badge config
  const statusBadge = isCommitPhase
    ? {
        label: "Pending Reveal",
        className: STATUS_COLORS.warning.badge,
        icon: <Lock className="w-3.5 h-3.5" />,
      }
    : review?.vote === "approve"
      ? {
          label: "Approved",
          className: STATUS_COLORS.positive.badge,
          icon: <CheckCircle className="w-3.5 h-3.5" />,
        }
      : review?.vote === "reject"
        ? {
            label: "Rejected",
            className: STATUS_COLORS.negative.badge,
            icon: <XCircle className="w-3.5 h-3.5" />,
          }
        : {
            label: "Pending",
            className: STATUS_COLORS.pending.badge,
            icon: null,
          };

  // Score ring tone
  const ringTone: StatusTone =
    scorePercent >= 70 ? "positive" : scorePercent >= 50 ? "warning" : "negative";

  const committedDate = review?.committedAt || review?.createdAt;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl">
      <div className="-m-4 sm:-m-6">
        {/* Header */}
        <header className="px-6 sm:px-8 py-5 border-b border-border bg-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
                Your review
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display truncate">
                  {applicantName}
                </h2>
                {review && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                      statusBadge.className
                    )}
                  >
                    {statusBadge.icon}
                    {statusBadge.label}
                  </span>
                )}
              </div>
              {review && committedDate && (
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    Committed{" "}
                    {new Date(committedDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    at{" "}
                    {new Date(committedDate).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {review.onChainCommitTxHash && (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${review.onChainCommitTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted border border-border text-[11px] font-mono text-primary/80 hover:text-primary hover:bg-muted/70 transition-colors"
                    >
                      <Link2 className="w-3 h-3" />
                      View commit tx
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
            {/* Modal renders its own close button when title is empty;
                no need for a duplicate here. */}
          </div>
        </header>

        {/* Body */}
        <div className="px-6 sm:px-8 py-6 space-y-6">
          {loading && (
            <div
              className="flex items-center justify-center py-16"
              role="status"
              aria-label="Loading review"
            >
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          )}

          {error && (
            <Alert variant="error">{error}</Alert>
          )}

          {review && (
            <>
              {/* Missed Reveal Warning */}
              {missedReveal && (
                <Alert variant="error">
                  You missed the reveal window. Your vote will not count toward
                  consensus. This may affect your reputation score.
                </Alert>
              )}

              {/* Score visualization */}
              {hasScores ? (
                <Section
                  icon={<Award className="w-4 h-4" />}
                  title="Your scoring"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 flex items-center justify-center rounded-xl border border-border bg-muted/30 p-6">
                      <ScoreRing
                        percent={scorePercent}
                        score={overallScore}
                        max={overallMax}
                        tone={ringTone}
                      />
                    </div>
                    <div className="lg:col-span-1 space-y-3">
                      <KvTile
                        icon={<Brain className="w-4 h-4" />}
                        tone="info"
                        label="General"
                        value={`${generalTotal}`}
                        suffix={generalMax ? `/ ${generalMax} pts` : undefined}
                      />
                      <KvTile
                        icon={<Target className="w-4 h-4" />}
                        tone="primary"
                        label="Domain"
                        value={`${domainTotal}`}
                        suffix={domainMax ? `/ ${domainMax} pts` : undefined}
                      />
                      <KvTile
                        icon={<AlertTriangle className="w-4 h-4" />}
                        tone={
                          (review.redFlagDeductions ?? 0) > 0
                            ? "negative"
                            : "neutral"
                        }
                        label="Deductions"
                        value={
                          (review.redFlagDeductions ?? 0) > 0
                            ? `-${review.redFlagDeductions}`
                            : "0"
                        }
                        suffix="pts"
                      />
                    </div>
                  </div>
                </Section>
              ) : isCommitPhase ? (
                <PadlockCard />
              ) : null}

              {/* Verification status */}
              {crStatus && (
                <CRStatusSection crStatus={crStatus} reviewType={reviewType} />
              )}

              {/* Consensus Result (shown when finalized) */}
              {isFinalized && finalization && (
                <Section
                  icon={<Users className="w-4 h-4" />}
                  title="How your vote landed"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <ConsensusTile
                      label="Consensus score"
                      value={`${finalization.consensusScore}%`}
                    />
                    <ConsensusTile
                      label="Your score"
                      value={`${scorePercent}%`}
                    />
                    {expertVote ? (
                      <>
                        <ConsensusTile
                          label="Reputation change"
                          value={`${expertVote.reputationChange > 0 ? "+" : ""}${expertVote.reputationChange}`}
                          valueClassName={
                            expertVote.reputationChange > 0
                              ? STATUS_COLORS.positive.text
                              : expertVote.reputationChange < 0
                                ? STATUS_COLORS.negative.text
                                : "text-muted-foreground"
                          }
                          trailingIcon={
                            expertVote.reputationChange > 0 ? (
                              <TrendingUp
                                className={cn(
                                  "w-3.5 h-3.5",
                                  STATUS_COLORS.positive.text
                                )}
                              />
                            ) : expertVote.reputationChange < 0 ? (
                              <TrendingDown
                                className={cn(
                                  "w-3.5 h-3.5",
                                  STATUS_COLORS.negative.text
                                )}
                              />
                            ) : null
                          }
                        />
                        <ConsensusTile
                          label="VETD reward"
                          value={
                            (
                              expertVote as typeof expertVote & {
                                vetdReward?: number;
                              }
                            ).vetdReward != null
                              ? `+${(expertVote as typeof expertVote & { vetdReward?: number }).vetdReward}`
                              : "—"
                          }
                          valueClassName="text-primary"
                        />
                      </>
                    ) : null}
                  </div>
                </Section>
              )}

              {/* Justifications */}
              {((generalJustifications &&
                Object.keys(generalJustifications).length > 0) ||
                (domainJustifications &&
                  Object.keys(domainJustifications).length > 0)) && (
                <Section
                  icon={<MessageSquare className="w-4 h-4" />}
                  title="Your justifications"
                >
                  <div className="space-y-6">
                    {generalJustifications &&
                      Object.entries(generalJustifications).length > 0 && (
                        <JustificationGroup
                          heading="General"
                          icon={<Brain className="w-3.5 h-3.5" />}
                          entries={Object.entries(generalJustifications)}
                        />
                      )}

                    {domainJustifications &&
                      Object.entries(domainJustifications).length > 0 && (
                        <JustificationGroup
                          heading="Domain"
                          icon={<Target className="w-3.5 h-3.5" />}
                          entries={Object.entries(domainJustifications)}
                        />
                      )}
                  </div>
                </Section>
              )}

              {/* Feedback */}
              {review.feedback && (
                <Section
                  icon={<MessageSquare className="w-4 h-4" />}
                  title="Your feedback"
                >
                  <div className="rounded-lg bg-muted/30 border border-border p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {review.feedback}
                    </p>
                  </div>
                </Section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {review && (
          <footer className="px-6 sm:px-8 py-4 border-t border-border bg-muted/20 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Close
            </button>
          </footer>
        )}
      </div>
    </Modal>
  );
}

/* ── Verification Status Section ── */

function CRStatusSection({
  crStatus,
  reviewType,
}: {
  crStatus: ExpertCRPhaseStatus | CommitRevealPhaseStatus;
  reviewType: "expert" | "candidate";
}) {
  const isExpertCR = reviewType === "expert" && "votingPhase" in crStatus;
  const phase = isExpertCR
    ? (crStatus as ExpertCRPhaseStatus).votingPhase
    : (crStatus as CommitRevealPhaseStatus).phase;

  const isCommitReveal = phase !== "direct" && phase !== "none";
  const blockchainSessionId = crStatus.blockchainSessionId;
  const isOnChain =
    !!crStatus.blockchainSessionCreated && !!blockchainSessionId;

  const commitCount = isExpertCR
    ? (crStatus as ExpertCRPhaseStatus).totalCommitments
    : (crStatus as CommitRevealPhaseStatus).commitCount ?? 0;

  const phaseLabel: Record<string, string> = {
    commit: "Voting In Progress",
    finalized: "Finalized",
    direct: "Direct Vote",
    none: "No Commit-Reveal",
  };

  const phaseTone: Record<string, KvTileTone> = {
    commit: "warning",
    finalized: "positive",
    direct: "neutral",
    none: "neutral",
  };

  return (
    <Section
      icon={<ShieldCheck className="w-4 h-4" />}
      title="Verification status"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KvTile
          icon={<Lock className="w-4 h-4" />}
          tone="neutral"
          label="Method"
          value={isCommitReveal ? "Commit-Reveal" : "Direct Vote"}
        />
        <KvTile
          icon={<Eye className="w-4 h-4" />}
          tone={phaseTone[phase] ?? "neutral"}
          label="Phase"
          value={phaseLabel[phase] ?? phase}
        />
        <KvTile
          icon={<ShieldCheck className="w-4 h-4" />}
          tone={isOnChain ? "positive" : "neutral"}
          label="On-Chain"
          value={isOnChain ? "Recorded" : "Off-chain"}
        />
        <KvTile
          icon={<CheckCircle className="w-4 h-4" />}
          tone="info"
          label="Votes"
          value={isCommitReveal ? `${commitCount} voted` : "—"}
        />
      </div>
    </Section>
  );
}

/* ── Padlock card (shown during commit phase when scores are hidden) ── */

function PadlockCard() {
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed p-8 sm:p-10 flex flex-col items-center text-center",
        STATUS_COLORS.warning.border,
        STATUS_COLORS.warning.bgSubtle
      )}
    >
      <span
        className={cn(
          "w-14 h-14 rounded-2xl grid place-items-center mb-4",
          STATUS_COLORS.warning.bgSubtle
        )}
      >
        <Lock className={cn("w-7 h-7", STATUS_COLORS.warning.icon)} />
      </span>
      <h3 className="text-lg font-bold text-foreground font-display">
        Scores hidden until reveal phase
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mt-1.5 leading-relaxed">
        Your commitment is locked on-chain. Submit your reveal during the
        reveal window so your scoring counts toward consensus.
      </p>
    </div>
  );
}

/* ── Justification group ── */

function JustificationGroup({
  heading,
  icon,
  entries,
}: {
  heading: string;
  icon: React.ReactNode;
  entries: Array<[string, string]>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-md bg-primary/10 text-primary grid place-items-center flex-shrink-0">
          {icon}
        </span>
        <h4 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {heading}
        </h4>
      </div>
      <div className="space-y-2.5 pl-9">
        {entries.map(([key, value]) => (
          <JustificationCard key={key} criterionKey={key} value={value} />
        ))}
      </div>
    </div>
  );
}

function JustificationCard({
  criterionKey,
  value,
}: {
  criterionKey: string;
  value: string;
}) {
  const url = useMemo(() => {
    if (!value || typeof value !== "string") return null;
    try {
      const u = new URL(value.trim());
      if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
      return null;
    } catch {
      return null;
    }
  }, [value]);

  const label = criterionKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3.5">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
        {label}
      </p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline break-all"
        >
          <span className="truncate">{url}</span>
          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
        </a>
      ) : (
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {value}
        </p>
      )}
    </div>
  );
}

/* ── Score ring ── */

function ScoreRing({
  percent,
  score,
  max,
  tone,
}: {
  percent: number;
  score: number;
  max: number;
  tone: StatusTone;
}) {
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset =
    circumference - (Math.min(percent, 100) / 100) * circumference;

  // Map tone to stroke color via CSS variable classes — use stroke-current and color the SVG via text-*
  const toneTextClass = STATUS_COLORS[tone].text;

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-border"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={cn("transition-all duration-700", toneTextClass)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p
            className={cn(
              "text-4xl sm:text-5xl font-bold font-display tabular-nums",
              toneTextClass
            )}
          >
            {percent}
            <span className="text-2xl">%</span>
          </p>
          <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
            {score} / {max} pts
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Section helper (mirrors JobDetailPage) ── */

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

/* ── KPI tile (mirrors HiringDashboard pattern) ── */

type KvTileTone = "primary" | "positive" | "negative" | "warning" | "info" | "neutral";

const KV_TILE_TONES: Record<KvTileTone, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  positive: { bg: STATUS_COLORS.positive.bgSubtle, text: STATUS_COLORS.positive.text },
  negative: { bg: STATUS_COLORS.negative.bgSubtle, text: STATUS_COLORS.negative.text },
  warning: { bg: STATUS_COLORS.warning.bgSubtle, text: STATUS_COLORS.warning.text },
  info: { bg: STATUS_COLORS.info.bgSubtle, text: STATUS_COLORS.info.text },
  neutral: { bg: "bg-muted", text: "text-muted-foreground" },
};

function KvTile({
  icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  tone: KvTileTone;
}) {
  const t = KV_TILE_TONES[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
      <span
        className={cn(
          "w-9 h-9 rounded-lg grid place-items-center flex-shrink-0",
          t.bg,
          t.text
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-base font-bold text-foreground leading-tight mt-0.5 tabular-nums truncate">
          {value}
          {suffix && (
            <span className="ml-1 text-xs font-medium text-muted-foreground">
              {suffix}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

/* ── Consensus tile (the 4-cell row inside the consensus Section) ── */

function ConsensusTile({
  label,
  value,
  valueClassName,
  trailingIcon,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  trailingIcon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3.5 flex flex-col gap-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "text-xl font-bold text-foreground tabular-nums flex items-center gap-1.5",
          valueClassName
        )}
      >
        {trailingIcon}
        {value}
      </p>
    </div>
  );
}
