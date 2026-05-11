"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";
import type { RubricRedFlag } from "@/types";

export interface ReviewConfirmStepProps {
  /**
   * Display name for the applicant being reviewed — surfaces in the heading
   * so the reviewer can spot a wrong tab/window before signing.
   */
  applicantName?: string | null;
  /** "Junior", "Mid", etc. — pulled from the application envelope. */
  applicantLevel?: string | null;
  /**
   * Final score breakdown. The reviewer should sanity-check these before
   * committing on-chain.
   */
  generalTotal: number;
  generalMax: number;
  topicTotal: number;
  topicMax: number;
  redFlagDeductions: number;
  overallScore: number;
  /** Red flag definitions, so the panel can list the ticked ones explicitly. */
  generalRedFlags: RubricRedFlag[];
  /** Which red flags are ticked. */
  redFlags: Record<string, boolean>;
  /** Optional reviewer feedback, surfaced verbatim. */
  feedback: string;
  /**
   * Whether the modal is in the commit phase — affects the on-chain warning
   * copy. When `true`, this confirmation will trigger a MetaMask signature.
   */
  isCommitPhase: boolean;
  /**
   * Practice mode runs the same flow without an on-chain commit. The
   * confirmation panel still renders, but the warning copy is softened.
   */
  isPracticeMode: boolean;
  /**
   * Slot for the modal's existing commit-flow controls (CommitFlowPanel,
   * SessionFailureBanner, etc.). The modal owns the on-chain mechanics — this
   * step just gives them a stable, branded surface to live in.
   */
  commitFlowSlot?: ReactNode;
}

/**
 * Pre-submit confirmation surface. Step 4 of the review flow.
 *
 * Renders AFTER the reviewer has scored every general question + every
 * domain topic + flagged any deductions + written feedback. Surfaces the
 * final breakdown, an explicit "this is binding" warning, and the Submit
 * action — the user explicitly opts in to signing before the on-chain commit
 * fires.
 *
 * Once submission completes, the modal swaps this for `ReviewSuccessStep`.
 */
export function ReviewConfirmStep({
  applicantName,
  applicantLevel,
  generalTotal,
  generalMax,
  topicTotal,
  topicMax,
  redFlagDeductions,
  overallScore,
  generalRedFlags,
  redFlags,
  feedback,
  isCommitPhase,
  isPracticeMode,
  commitFlowSlot,
}: ReviewConfirmStepProps) {
  const overallMax = (generalMax || 0) + (topicMax || 0);
  const scorePercent =
    overallMax > 0 ? Math.round((overallScore / overallMax) * 100) : 0;
  const tickedFlags = generalRedFlags.filter((flag) => redFlags[flag.id]);
  const trimmedFeedback = feedback.trim();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div
          className={`inline-flex items-center justify-center w-14 h-14 rounded-full ${STATUS_COLORS.info.bgSubtle} ${STATUS_COLORS.info.border} mb-3`}
        >
          <ShieldCheck className={`w-7 h-7 ${STATUS_COLORS.info.icon}`} />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-1">
          Confirm your review
        </h3>
        <p className="text-sm text-muted-foreground">
          {applicantName ? (
            <>
              You&apos;re about to submit your scores for{" "}
              <span className="font-semibold text-foreground">
                {applicantName}
              </span>
              {applicantLevel ? ` (${applicantLevel})` : ""}.
            </>
          ) : (
            <>You&apos;re about to submit your scores.</>
          )}
        </p>
      </div>

      {/* Binding warning */}
      {!isPracticeMode && (
        <div
          className={`rounded-xl border ${STATUS_COLORS.warning.border} ${STATUS_COLORS.warning.bgSubtle} p-4`}
          role="note"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`w-4 h-4 ${STATUS_COLORS.warning.icon} mt-0.5 shrink-0`}
            />
            <div className="text-sm">
              <p className="font-semibold text-foreground mb-1">
                {isCommitPhase
                  ? "This commits your vote on-chain."
                  : "This submits your review to the panel."}
              </p>
              <p className="text-muted-foreground">
                {isCommitPhase ? (
                  <>
                    The next step will open MetaMask to sign a commit hash.
                    Once confirmed on Sepolia, your score is bound to this
                    review — you can&apos;t change it.
                  </>
                ) : (
                  <>
                    Once submitted, your reputation will be staked on how well
                    your scores align with the consensus.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Score breakdown — mirrors ReviewSuccessStep so the pre/post visuals
          line up and the user recognises the figures. */}
      <div className="rounded-xl border border-border bg-muted/20 p-6 space-y-4">
        <h4 className="text-sm font-bold text-foreground tracking-wide uppercase">
          Final score breakdown
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-card border border-border">
            <p className="text-xs text-muted-foreground mb-1">General</p>
            <p className="text-xl font-bold text-foreground">
              {generalTotal}
              <span className="text-sm text-muted-foreground font-normal">
                /{generalMax || "?"}
              </span>
            </p>
          </div>
          <div className="text-center p-4 rounded-lg bg-card border border-border">
            <p className="text-xs text-muted-foreground mb-1">Domain</p>
            <p className="text-xl font-bold text-foreground">
              {topicTotal}
              <span className="text-sm text-muted-foreground font-normal">
                /{topicMax || "?"}
              </span>
            </p>
          </div>
          <div className="text-center p-4 rounded-lg bg-card border border-border">
            <p className="text-xs text-muted-foreground mb-1">Deductions</p>
            <p
              className={`text-xl font-bold ${
                redFlagDeductions > 0
                  ? STATUS_COLORS.negative.text
                  : "text-foreground"
              }`}
            >
              {redFlagDeductions > 0 ? `-${redFlagDeductions}` : "0"}
            </p>
          </div>
        </div>
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Overall Score
            </span>
            <span className="text-2xl font-bold text-foreground">
              {overallScore}
              <span className="text-sm text-muted-foreground font-normal">
                /{overallMax}
              </span>
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                scorePercent >= 70
                  ? STATUS_COLORS.positive.bg
                  : scorePercent >= 40
                    ? STATUS_COLORS.warning.bg
                    : STATUS_COLORS.negative.bg
              }`}
              style={{ width: `${Math.min(scorePercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {scorePercent}%
          </p>
        </div>
      </div>

      {/* Red flags ticked — only renders the ones the reviewer actually
          toggled. Surfaces them explicitly so the reviewer can sanity-check
          before signing. */}
      {tickedFlags.length > 0 && (
        <div
          className={`rounded-xl border ${STATUS_COLORS.negative.border} ${STATUS_COLORS.negative.bgSubtle} p-4`}
        >
          <p
            className={`text-sm font-bold ${STATUS_COLORS.negative.text} mb-2 flex items-center gap-2`}
          >
            <AlertTriangle className="w-4 h-4" />
            Deductions you flagged
          </p>
          <ul className="space-y-1.5">
            {tickedFlags.map((flag) => (
              <li
                key={flag.id}
                className="flex items-center justify-between gap-3 text-sm text-foreground"
              >
                <span>{flag.label}</span>
                <span
                  className={`text-xs font-bold ${STATUS_COLORS.negative.text}`}
                >
                  -{Math.abs(flag.points || 0)} pts
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Feedback preview — show the candidate-facing feedback verbatim so
          the reviewer can spot typos before submitting. */}
      {trimmedFeedback.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Your feedback to the candidate
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-[1.7]">
            {trimmedFeedback}
          </p>
        </div>
      )}

      {/* Permanent / lock affordance — visual cue that submit is binding. */}
      {!isPracticeMode && isCommitPhase && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
          <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            By submitting, you commit your scores on-chain. The score hash is
            anchored to your wallet and can&apos;t be altered after sign.
          </p>
        </div>
      )}

      {/* Commit-flow controls passed in from the modal — the existing
          CommitFlowPanel, SessionFailureBanner, etc. continue to own the
          on-chain mechanics. */}
      {commitFlowSlot && <div className="space-y-3">{commitFlowSlot}</div>}

      {/* Practice-mode footer hint */}
      {isPracticeMode && (
        <div
          className={`flex items-start gap-3 rounded-xl border ${STATUS_COLORS.positive.border} ${STATUS_COLORS.positive.bgSubtle} p-4`}
        >
          <CheckCircle2
            className={`w-4 h-4 ${STATUS_COLORS.positive.icon} mt-0.5 shrink-0`}
          />
          <p className="text-xs text-muted-foreground">
            Practice mode — submitting completes the calibration without
            recording a real vote or touching your wallet.
          </p>
        </div>
      )}
    </div>
  );
}
