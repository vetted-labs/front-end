"use client";

import { AlertTriangle, Award, Loader2 } from "lucide-react";
import {
  ScoreButtons,
  renderPromptLines,
  RequiredMark,
  OptionalMark,
  fieldAnchorId,
  JUSTIFICATION_MIN_CHARS,
  JUSTIFICATION_MAX_CHARS,
  justificationCounterTone,
  justificationCounterClass,
} from "@/components/guild/review/shared";
import { STATUS_COLORS } from "@/config/colors";
import { TOUR_TARGETS, dataTourTarget } from "@/components/expert/onboarding/tourTargets";
import type { LevelReviewTemplate, ReviewDomainTopic, RubricRedFlag } from "@/types";

export interface DomainReviewStepProps {
  loadingTemplates: boolean;
  levelTemplate: LevelReviewTemplate | null;
  topicList: ReviewDomainTopic[];
  topicAnswers: Record<string, string>;
  topicScores: Record<string, number>;
  topicJustifications: Record<string, string>;
  redFlags: Record<string, boolean>;
  generalRedFlags: RubricRedFlag[];
  redFlagDeductions: number;
  generalTotal: number;
  generalMax: number;
  topicTotal: number;
  topicMax: number;
  overallScore: number;
  feedback: string;
  onTopicScoresChange: (updater: (prev: Record<string, number>) => Record<string, number>) => void;
  onTopicJustificationsChange: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  onRedFlagsChange: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  onFeedbackChange: (value: string) => void;
  /**
   * Which topic to show. The modal paginates one topic at a time so the
   * form doesn't overwhelm; footer Next/Back walk through these before the
   * commit/submit confirmation surface.
   */
  currentTopicIndex?: number;
}

export function DomainReviewStep({
  loadingTemplates,
  levelTemplate,
  topicList,
  topicAnswers,
  topicScores,
  topicJustifications,
  redFlags,
  generalRedFlags,
  redFlagDeductions,
  generalTotal,
  generalMax,
  topicTotal,
  topicMax,
  overallScore,
  feedback,
  onTopicScoresChange,
  onTopicJustificationsChange,
  onRedFlagsChange,
  onFeedbackChange,
  currentTopicIndex,
}: DomainReviewStepProps) {
  const totalTopics = topicList.length;
  // Show one topic at a time when an index is supplied.
  const visibleTopics = (() => {
    if (currentTopicIndex == null) return topicList;
    const safeIdx = Math.max(0, Math.min(currentTopicIndex, topicList.length - 1));
    const selected = topicList[safeIdx];
    return selected ? [selected] : [];
  })();
  const topicIndexOffset = currentTopicIndex == null
    ? 0
    : Math.max(0, Math.min(currentTopicIndex, Math.max(topicList.length - 1, 0)));

  return (
    <div className="space-y-7" {...dataTourTarget(TOUR_TARGETS.practiceReviewDomainRubric)}>
      {/* Domain / Level Questions */}
      <div className="space-y-7">
        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
              <Award className="w-4 h-4 text-warning" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground leading-tight">
                Domain Review
              </h3>
              <p className="text-xs text-muted-foreground">
                Score each topic 0–5 against the rubric. Justify every score.
              </p>
            </div>
          </div>
          {totalTopics > 0 && (
            <div className="text-[11px] font-semibold text-muted-foreground tabular-nums">
              {totalTopics} topic{totalTopics === 1 ? "" : "s"}
            </div>
          )}
        </div>

        {loadingTemplates && !levelTemplate ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
            <Loader2 className="w-4 h-4 text-warning animate-spin" />
            <p className="text-sm text-muted-foreground">Loading topic rubric...</p>
          </div>
        ) : topicList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No level-specific rubric available for this guild.</p>
        ) : (
          visibleTopics.map((topic, localIndex) => {
            const index = topicIndexOffset + localIndex;
            const score = topicScores[topic.id] || 0;
            const pct = (score / 5) * 100;
            const justificationValue = topicJustifications[topic.id] || "";
            const tone = justificationCounterTone(justificationValue.length, {
              required: true,
            });
            const topicNumber = index + 1;
            const progressPct =
              totalTopics > 0 ? (topicNumber / totalTopics) * 100 : 0;

            return (
              <div
                key={topic.id}
                id={fieldAnchorId("domain", topic.id)}
                className="rounded-2xl border border-border bg-card overflow-hidden scroll-mt-24"
                {...(index === 0 ? dataTourTarget(TOUR_TARGETS.practiceReviewTopicCard) : {})}
              >
                <div className="px-6 py-5 border-b border-border bg-muted/[0.04]">
                  <div className="flex items-center justify-between gap-4 mb-2.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                      Topic {topicNumber} of {totalTopics}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-primary tabular-nums">
                        {score}/5
                      </span>
                    </div>
                  </div>
                  <h4 className="font-display text-lg sm:text-xl font-semibold text-foreground leading-snug">
                    {topic.title || topic.id}
                  </h4>
                  <div className="mt-3 h-[2px] rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/50 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="space-y-3">
                    {topic.prompt && (
                      <div className="max-w-[70ch]">{renderPromptLines(topic.prompt)}</div>
                    )}
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">
                      Candidate response
                    </p>
                    <div className="rounded-lg bg-muted/30 border border-border p-5 max-w-[70ch]">
                      <p className="text-[15px] text-foreground whitespace-pre-wrap leading-[1.7]">
                        {topicAnswers[topic.id] || <span className="text-muted-foreground italic">No response</span>}
                      </p>
                    </div>
                  </div>

                  <div
                    className="rounded-xl bg-muted/[0.02] border border-border p-5 space-y-5"
                    {...(index === 0 ? dataTourTarget(TOUR_TARGETS.practiceReviewWhatToLookFor) : {})}
                  >
                    <p className="text-xs text-warning/80 uppercase tracking-wider font-bold flex items-center">
                      Scoring
                      <RequiredMark />
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      The rubric guide for this topic — &ldquo;what to look for&rdquo; and
                      score bands — is shown in the right pane.
                    </p>
                    <ScoreButtons
                      value={topicScores[topic.id] || 0}
                      max={5}
                      onChange={(val) => {
                        onTopicScoresChange((prev) => ({
                          ...prev,
                          [topic.id]: val,
                        }));
                        // Scroll the justification into view + focus it so the
                        // reviewer doesn't get stuck wondering where to type.
                        // Defer until after the score-button state update + paint.
                        requestAnimationFrame(() => {
                          const el = document.getElementById(
                            `review-justification-domain-${topic.id}`,
                          ) as HTMLTextAreaElement | null;
                          el?.scrollIntoView({ behavior: "smooth", block: "center" });
                          el?.focus({ preventScroll: true });
                        });
                      }}
                    />
                    <div {...(index === 0 ? dataTourTarget(TOUR_TARGETS.practiceReviewTopicJustification) : {})}>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <span className="font-semibold">Justification</span>
                        <RequiredMark label={`Required — min ${JUSTIFICATION_MIN_CHARS} characters`} />
                      </p>
                      <textarea
                        id={`review-justification-domain-${topic.id}`}
                        value={justificationValue}
                        onChange={(e) =>
                          onTopicJustificationsChange((prev) => ({
                            ...prev,
                            [topic.id]: e.target.value.slice(0, JUSTIFICATION_MAX_CHARS),
                          }))
                        }
                        maxLength={JUSTIFICATION_MAX_CHARS}
                        aria-required={true}
                        placeholder={`Tie the score to specific evidence from the response (min ${JUSTIFICATION_MIN_CHARS} chars)…`}
                        className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 resize-y transition-all min-h-[140px]"
                      />
                      <div className="flex items-center justify-between mt-2 text-[11px]">
                        <span className="text-muted-foreground/70">
                          Min {JUSTIFICATION_MIN_CHARS} chars
                        </span>
                        <span className={`tabular-nums ${justificationCounterClass(tone)}`}>
                          {justificationValue.length} / {JUSTIFICATION_MAX_CHARS}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Red Flags */}
      <div
        id={fieldAnchorId("overall", "redflags")}
        className={`rounded-xl border ${STATUS_COLORS.negative.border} ${STATUS_COLORS.negative.bgSubtle} overflow-hidden scroll-mt-24`}
        {...dataTourTarget(TOUR_TARGETS.practiceReviewRedFlagList)}
      >
        <div className={`flex items-center gap-3 px-5 py-3.5 border-b ${STATUS_COLORS.negative.border} ${STATUS_COLORS.negative.bgSubtle}`}>
          <AlertTriangle className={`w-4 h-4 ${STATUS_COLORS.negative.icon}`} />
          <h3 className="text-sm font-bold text-foreground">Red Flags (Deductions)</h3>
        </div>
        <div className="p-5">
          {generalRedFlags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No red flags defined for this rubric.</p>
          ) : (
            <div className="space-y-3">
              {generalRedFlags.map((flag) => (
                <label
                  key={flag.id}
                  className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                    redFlags[flag.id]
                      ? "bg-negative/10 border border-negative/25"
                      : "bg-muted/30 border border-border hover:border-border"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={redFlags[flag.id] || false}
                    onChange={(e) =>
                      onRedFlagsChange((prev) => ({
                        ...prev,
                        [flag.id]: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border bg-muted/50 accent-negative"
                  />
                  <span className={`text-sm flex-1 ${redFlags[flag.id] ? STATUS_COLORS.negative.text : "text-muted-foreground"}`}>
                    {flag.label}
                  </span>
                  <span className={`text-xs font-bold ${redFlags[flag.id] ? STATUS_COLORS.negative.text : "text-muted-foreground/60"}`}>
                    -{Math.abs(flag.points || 0)} pts
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overall Score Summary */}
      <div
        id={fieldAnchorId("overall", "score")}
        className="relative overflow-hidden rounded-xl border border-warning/20 bg-warning/5 p-6 scroll-mt-24"
        {...dataTourTarget(TOUR_TARGETS.practiceReviewOverallSummary)}
      >
        <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-warning/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-foreground">Overall Score</p>
            <p className="text-2xl font-bold text-warning tabular-nums">
              {overallScore}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2.5 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">General</p>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {generalTotal}{generalMax ? `/${generalMax}` : ""}
              </p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">Domain</p>
              <p className="text-sm font-bold text-foreground tabular-nums">
                {topicTotal}{topicMax ? `/${topicMax}` : ""}
              </p>
            </div>
            <div className={`text-center p-2.5 rounded-lg ${STATUS_COLORS.negative.bgSubtle} ${STATUS_COLORS.negative.border}`}>
              <p className="text-xs text-muted-foreground mb-0.5">Deductions</p>
              <p className={`text-sm font-bold ${STATUS_COLORS.negative.text} tabular-nums`}>-{redFlagDeductions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback */}
      <div {...dataTourTarget(TOUR_TARGETS.practiceReviewFeedback)}>
        <p className="text-xs text-warning/80 uppercase tracking-wider font-semibold mb-3 flex items-center">
          Overall feedback
          <OptionalMark />
        </p>
        <textarea
          value={feedback}
          onChange={(e) => onFeedbackChange(e.target.value)}
          placeholder="Share your reasoning and any feedback the candidate should see…"
          className="w-full px-4 py-3.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 resize-y transition-all min-h-[140px]"
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground mt-1.5 text-right tabular-nums">
          {feedback.length}/1000
        </p>
      </div>
    </div>
  );
}
