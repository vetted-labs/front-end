"use client";

import { AlertCircle, ChevronRight } from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";
import {
  JUSTIFICATION_MIN_CHARS,
  JUSTIFICATION_MAX_CHARS,
  fieldAnchorId,
  focusFirstError,
} from "@/components/guild/review/shared";
import type {
  GeneralReviewQuestion,
  ReviewDomainTopic,
  RubricQuestionEntry,
  RubricRedFlag,
} from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * A single validation error entry with enough metadata to render an inline
 * "go to" link.
 */
export interface ReviewValidationIssue {
  /** Stable id used as React key. */
  id: string;
  /** The form scope this issue belongs to. Used to navigate steps. */
  scope: "general" | "domain" | "overall";
  /** Step the user must visit to fix this issue (1-indexed). */
  step: 1 | 2 | 3;
  /** Human-readable description shown in the error list. */
  message: string;
  /** DOM anchor id (`id` attribute) the "go to" link should scroll to + focus. */
  anchorId: string;
}

export interface ReviewValidationResult {
  ok: boolean;
  issues: ReviewValidationIssue[];
}

export interface ReviewValidationInput {
  /** General questions (optional rubric questions filtered upstream). */
  generalQuestions: GeneralReviewQuestion[];
  /** Per-question rubric metadata, keyed by question id. */
  generalRubricQuestions: Record<string, RubricQuestionEntry>;
  /** Per-question criterion → score map. */
  generalScores: Record<string, Record<string, number>>;
  /** Per-question total. */
  generalTotals: Record<string, number>;
  /** Per-question justification text. */
  generalJustifications: Record<string, string>;
  /** Domain topics the reviewer must score. */
  topicList: ReviewDomainTopic[];
  /** Per-topic 0–5 score. */
  topicScores: Record<string, number>;
  /** Per-topic justification text. */
  topicJustifications: Record<string, string>;
  /** Red flag toggles. */
  redFlags: Record<string, boolean>;
  /** Red flag definitions used to validate the deduction sum. */
  generalRedFlags: RubricRedFlag[];
  /** Sum of red-flag deductions, as computed by the modal. */
  redFlagDeductions: number;
  /** Computed overall score (general + domain - deductions). */
  overallScore: number;
  /** Maximum possible score (generalMax + topicMax). */
  totalMax: number;
}

// ─── Pure validation function ───────────────────────────────────────────────

/**
 * Validate a review prior to letting the user sign / submit.
 *
 * Pure: no side effects, no setState, safe to call from anywhere.
 *
 * Rules enforced (priority order):
 *   - Every general scored question has at least 1 point.
 *   - Every domain topic has at least 1 point.
 *   - Every required justification (general scored q + every domain topic) is
 *     non-empty AND meets the minimum character count.
 *   - No justification exceeds the maximum character count.
 *   - Overall score lands in [0, totalMax].
 *   - Red flag deduction sum is sane (matches the toggled flags' point total).
 */
export function validateReviewSubmission(
  input: ReviewValidationInput
): ReviewValidationResult {
  const issues: ReviewValidationIssue[] = [];

  // ── General scored questions ──
  // The modal filters these the same way (`scored !== false` and
  // `id !== "guild_improvement"`) — mirror it here so this function is the
  // single source of truth.
  const scoredGeneralQuestions = input.generalQuestions.filter(
    (q) => q.scored !== false && q.id !== "guild_improvement"
  );

  for (const question of scoredGeneralQuestions) {
    const rubric = input.generalRubricQuestions[question.id];
    if (!rubric) continue;
    const total = input.generalTotals[question.id] ?? 0;
    const anchor = fieldAnchorId("general", question.id);
    const label = question.title || question.prompt || question.id;

    if (total < 1) {
      issues.push({
        id: `general-score-${question.id}`,
        scope: "general",
        step: 2,
        message: `“${truncate(label, 60)}” is unscored — give it at least 1 point.`,
        anchorId: anchor,
      });
      continue; // Don't also ding for missing justification when not even scored.
    }

    const justification = (input.generalJustifications[question.id] ?? "").trim();
    if (justification.length === 0) {
      issues.push({
        id: `general-just-empty-${question.id}`,
        scope: "general",
        step: 2,
        message: `Missing justification on “${truncate(label, 60)}”.`,
        anchorId: anchor,
      });
    } else if (justification.length < JUSTIFICATION_MIN_CHARS) {
      issues.push({
        id: `general-just-short-${question.id}`,
        scope: "general",
        step: 2,
        message: `Justification on “${truncate(label, 60)}” is too short (${justification.length}/${JUSTIFICATION_MIN_CHARS} chars).`,
        anchorId: anchor,
      });
    } else if (justification.length > JUSTIFICATION_MAX_CHARS) {
      issues.push({
        id: `general-just-long-${question.id}`,
        scope: "general",
        step: 2,
        message: `Justification on “${truncate(label, 60)}” exceeds ${JUSTIFICATION_MAX_CHARS} chars.`,
        anchorId: anchor,
      });
    }
  }

  // ── Domain topics ──
  for (const topic of input.topicList) {
    const score = input.topicScores[topic.id] ?? 0;
    const anchor = fieldAnchorId("domain", topic.id);
    const label = topic.title || topic.id;

    if (score < 1) {
      issues.push({
        id: `domain-score-${topic.id}`,
        scope: "domain",
        step: 3,
        message: `“${truncate(label, 60)}” is unscored — give it at least 1 point.`,
        anchorId: anchor,
      });
      continue;
    }

    const justification = (input.topicJustifications[topic.id] ?? "").trim();
    if (justification.length === 0) {
      issues.push({
        id: `domain-just-empty-${topic.id}`,
        scope: "domain",
        step: 3,
        message: `Missing justification on “${truncate(label, 60)}”.`,
        anchorId: anchor,
      });
    } else if (justification.length < JUSTIFICATION_MIN_CHARS) {
      issues.push({
        id: `domain-just-short-${topic.id}`,
        scope: "domain",
        step: 3,
        message: `Justification on “${truncate(label, 60)}” is too short (${justification.length}/${JUSTIFICATION_MIN_CHARS} chars).`,
        anchorId: anchor,
      });
    } else if (justification.length > JUSTIFICATION_MAX_CHARS) {
      issues.push({
        id: `domain-just-long-${topic.id}`,
        scope: "domain",
        step: 3,
        message: `Justification on “${truncate(label, 60)}” exceeds ${JUSTIFICATION_MAX_CHARS} chars.`,
        anchorId: anchor,
      });
    }
  }

  // ── Overall score range ──
  if (
    !Number.isFinite(input.overallScore) ||
    input.overallScore < 0 ||
    (input.totalMax > 0 && input.overallScore > input.totalMax)
  ) {
    issues.push({
      id: "overall-out-of-range",
      scope: "overall",
      step: 3,
      message: `Overall score ${input.overallScore} is outside the valid range (0–${input.totalMax}).`,
      anchorId: fieldAnchorId("overall", "score"),
    });
  }

  // ── Red flag deduction sanity check ──
  if (input.generalRedFlags.length > 0) {
    const expected = input.generalRedFlags.reduce(
      (acc, flag) => (input.redFlags[flag.id] ? acc + Math.abs(flag.points || 0) : acc),
      0
    );
    if (expected !== Math.abs(input.redFlagDeductions || 0)) {
      issues.push({
        id: "redflag-deduction-mismatch",
        scope: "overall",
        step: 3,
        message: `Red flag deduction (${input.redFlagDeductions}) does not match toggled flags (expected ${expected}).`,
        anchorId: fieldAnchorId("overall", "redflags"),
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1).trimEnd()}…`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface ReviewSubmitSectionProps {
  /**
   * Validation issues to surface above the submit button. When non-empty the
   * modal should keep the submit button disabled.
   */
  issues?: ReviewValidationIssue[];
  /**
   * Optional callback invoked when the user clicks a "go to" link on an
   * issue. The modal can use this to switch step + scroll. If omitted, we
   * fall back to scrolling within the current step.
   */
  onJumpToIssue?: (issue: ReviewValidationIssue) => void;
}

/**
 * Renders an inline error list with "go to" links for any pending validation
 * issues. The legacy per-review stake input was removed: review eligibility
 * comes from a one-time guild stake (see `EligibilityNote`), and per-candidate
 * staking is handled by a separate endorsement flow that runs post-consensus.
 */
export function ReviewSubmitSection({
  issues,
  onJumpToIssue,
}: ReviewSubmitSectionProps) {
  const hasIssues = (issues?.length ?? 0) > 0;
  if (!hasIssues) return null;

  return (
    <div className="mt-6 space-y-4">
      <div
        className={`rounded-xl border ${STATUS_COLORS.negative.border} ${STATUS_COLORS.negative.bgSubtle} p-4`}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <AlertCircle
            className={`w-4 h-4 ${STATUS_COLORS.negative.icon} mt-0.5 shrink-0`}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0 space-y-2">
            <p className={`text-sm font-bold ${STATUS_COLORS.negative.text}`}>
              Cannot submit: {summarizeIssues(issues!)}
            </p>
            <ul className="space-y-1.5">
              {issues!.map((issue) => (
                <li
                  key={issue.id}
                  className="flex items-start gap-2 text-xs text-foreground"
                >
                  <span className="text-muted-foreground/60 mt-0.5">•</span>
                  <span className="flex-1">{issue.message}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (onJumpToIssue) {
                        onJumpToIssue(issue);
                      } else {
                        focusFirstError(issue.anchorId);
                      }
                    }}
                    className={`shrink-0 inline-flex items-center gap-0.5 text-xs font-semibold ${STATUS_COLORS.negative.text} hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 rounded`}
                  >
                    Go to
                    <ChevronRight className="w-3 h-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function summarizeIssues(issues: ReviewValidationIssue[]): string {
  const counts = {
    unscored: 0,
    missingJust: 0,
    other: 0,
  };
  for (const issue of issues) {
    if (issue.id.includes("score")) counts.unscored += 1;
    else if (issue.id.includes("just")) counts.missingJust += 1;
    else counts.other += 1;
  }
  const parts: string[] = [];
  if (counts.unscored > 0)
    parts.push(`${counts.unscored} ${counts.unscored === 1 ? "field" : "fields"} unscored`);
  if (counts.missingJust > 0)
    parts.push(
      `${counts.missingJust} ${counts.missingJust === 1 ? "justification" : "justifications"} missing`
    );
  if (counts.other > 0)
    parts.push(`${counts.other} other ${counts.other === 1 ? "issue" : "issues"}`);
  return parts.join(", ");
}
