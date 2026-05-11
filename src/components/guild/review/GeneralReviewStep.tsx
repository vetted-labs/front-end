"use client";

import { Loader2, Sparkles } from "lucide-react";
import {
  ScoreButtons,
  RequiredMark,
  fieldAnchorId,
  JUSTIFICATION_MIN_CHARS,
  JUSTIFICATION_MAX_CHARS,
  justificationCounterTone,
  justificationCounterClass,
} from "@/components/guild/review/shared";
import { STATUS_COLORS } from "@/config/colors";
import { TOUR_TARGETS, dataTourTarget } from "@/components/expert/onboarding/tourTargets";
import type {
  GeneralReviewTemplate,
  GeneralReviewQuestion,
  RubricQuestionEntry,
  RubricInterpretationGuideItem,
  QuestionPart,
  RubricCriterion,
} from "@/types";

export interface GeneralReviewStepProps {
  loadingTemplates: boolean;
  generalTemplate: GeneralReviewTemplate | null;
  generalRubricQuestions: Record<string, RubricQuestionEntry>;
  generalQuestions: GeneralReviewQuestion[];
  generalTotals: Record<string, number>;
  generalScores: Record<string, Record<string, number>>;
  generalJustifications: Record<string, string>;
  interpretationGuide: RubricInterpretationGuideItem[];
  generalTotal: number;
  generalMax: number;
  getGeneralResponseValue: (questionId: string, partId?: string) => string;
  onGeneralScoresChange: (updater: (prev: Record<string, Record<string, number>>) => Record<string, Record<string, number>>) => void;
  onGeneralJustificationsChange: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  /**
   * Which scored question to show. The modal paginates one question at a
   * time so the form doesn't overwhelm; footer Next/Back walk through these
   * before crossing into the next step.
   */
  currentQuestionIndex?: number;
}

export function GeneralReviewStep({
  loadingTemplates,
  generalTemplate,
  generalRubricQuestions,
  generalQuestions,
  generalTotals,
  generalScores,
  generalJustifications,
  interpretationGuide,
  generalTotal,
  generalMax,
  getGeneralResponseValue,
  onGeneralScoresChange,
  onGeneralJustificationsChange,
  currentQuestionIndex,
}: GeneralReviewStepProps) {
  const scoredQuestions = generalQuestions.filter(
    (question) => generalRubricQuestions[question.id],
  );
  const totalQuestions = scoredQuestions.length;
  // Show one question at a time when an index is supplied. When undefined,
  // fall back to showing the full list (e.g. story-lab fixture preview).
  const visibleQuestions = (() => {
    if (currentQuestionIndex == null) return scoredQuestions;
    const safeIdx = Math.max(0, Math.min(currentQuestionIndex, scoredQuestions.length - 1));
    const selected = scoredQuestions[safeIdx];
    return selected ? [selected] : [];
  })();
  const indexOffset = currentQuestionIndex == null
    ? 0
    : Math.max(0, Math.min(currentQuestionIndex, Math.max(scoredQuestions.length - 1, 0)));

  return (
    <div className="space-y-7" {...dataTourTarget(TOUR_TARGETS.practiceReviewGeneralRubric)}>
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${STATUS_COLORS.warning.bgSubtle} flex items-center justify-center`}>
            <Sparkles className={`w-4 h-4 ${STATUS_COLORS.warning.icon}`} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-foreground leading-tight">
              General Review
            </h3>
            <p className="text-xs text-muted-foreground">
              Score each prompt against the rubric. Justify every score with
              specifics from the response.
            </p>
          </div>
        </div>
        {totalQuestions > 0 && (
          <div className="text-[11px] font-semibold text-muted-foreground tabular-nums">
            {totalQuestions} question{totalQuestions === 1 ? "" : "s"}
          </div>
        )}
      </div>

      {loadingTemplates && !generalTemplate ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
          <Loader2 className={`w-4 h-4 ${STATUS_COLORS.warning.icon} animate-spin`} />
          <p className="text-sm text-muted-foreground">Loading general rubric...</p>
        </div>
      ) : Object.keys(generalRubricQuestions).length === 0 ? (
        <p className="text-sm text-muted-foreground">No general scoring rubric available for this guild.</p>
      ) : (
        visibleQuestions
          .map((question, localIndex) => {
            const index = indexOffset + localIndex;
            const rubric = generalRubricQuestions[question.id];
            const criteria: RubricCriterion[] = rubric?.criteria || [];
            const maxPoints =
              rubric?.maxPoints ||
              criteria.reduce((acc: number, c) => acc + (c.maxPoints || c.max || 0), 0);
            const score = generalTotals[question.id] || 0;
            const pct = maxPoints > 0 ? (score / maxPoints) * 100 : 0;
            // A justification is required whenever the rubric awards more than 1 point
            // total (high-stakes question per the rubric `whatToLookFor` / `scoring` cue).
            // The `guild_improvement` question is reflective and not scored.
            const isScored = question.scored !== false && question.id !== "guild_improvement";
            const justificationRequired = isScored && maxPoints > 1;
            const justificationValue = generalJustifications[question.id] || "";
            const tone = justificationCounterTone(justificationValue.length, {
              required: justificationRequired,
            });

            const questionNumber = index + 1;
            const progressPct =
              totalQuestions > 0
                ? (questionNumber / totalQuestions) * 100
                : 0;

            return (
              <div
                key={question.id}
                id={fieldAnchorId("general", question.id)}
                className="rounded-2xl border border-border bg-card overflow-hidden scroll-mt-24"
              >
                {/* Question header — generous heading + question-progress strip */}
                <div
                  className="px-6 py-5 border-b border-border bg-muted/[0.04]"
                  {...(index === 0 ? dataTourTarget(TOUR_TARGETS.practiceReviewQuestionPrompt) : {})}
                >
                  <div className="flex items-center justify-between gap-4 mb-2.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                      Question {questionNumber} of {totalQuestions}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-primary tabular-nums">
                        {score}/{maxPoints}
                      </span>
                    </div>
                  </div>
                  <h4 className="font-display text-lg sm:text-xl font-semibold text-foreground leading-snug">
                    {question.prompt}
                  </h4>
                  {/* Thin progression bar across all questions */}
                  <div className="mt-3 h-[2px] rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/50 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Applicant response — readable max-width, comfortable line-height */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.08em]">
                      Candidate response
                    </p>
                    {(() => {
                      const combinedAnswer = getGeneralResponseValue(question.id);
                      if (combinedAnswer) {
                        return (
                          <div className="rounded-lg bg-muted/30 border border-border p-5 max-w-[70ch]">
                            <p className="text-[15px] text-foreground whitespace-pre-wrap leading-[1.7]">
                              {combinedAnswer}
                            </p>
                          </div>
                        );
                      }
                      if (question.parts?.length) {
                        return (
                          <div className="space-y-3 max-w-[70ch]">
                            {question.parts.map((part: QuestionPart) => (
                              <div key={part.id} className="rounded-lg bg-muted/30 border border-border p-5">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">{part.label}</p>
                                <p className="text-[15px] text-foreground whitespace-pre-wrap leading-[1.7]">
                                  {getGeneralResponseValue(question.id, part.id) || <span className="text-muted-foreground italic">No response</span>}
                                </p>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <div className="rounded-lg bg-muted/30 border border-border p-5 max-w-[70ch]">
                          <p className="text-[15px] text-foreground whitespace-pre-wrap leading-[1.7]">
                            <span className="text-muted-foreground italic">No response</span>
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Scoring strip */}
                  <div
                    className="rounded-xl bg-muted/[0.02] border border-border p-5 space-y-5"
                    {...(index === 0 ? dataTourTarget(TOUR_TARGETS.practiceReviewCriteria) : {})}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`text-xs ${STATUS_COLORS.warning.text} opacity-80 uppercase tracking-wider font-bold`}>
                        Scoring
                      </p>
                      {criteria.length > 1 && (
                        <p className="text-[11px] text-muted-foreground">
                          {criteria.length} criteria
                        </p>
                      )}
                    </div>
                    {criteria.map((criterion, criterionIndex) => (
                      <div key={criterion.id} className="space-y-2.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">
                            {criterion.label}
                            {isScored ? <RequiredMark /> : null}
                          </p>
                          <span className="text-[11px] font-semibold text-muted-foreground tabular-nums shrink-0">
                            max {criterion.maxPoints || criterion.max || 0}
                          </span>
                        </div>
                        <div
                          {...(index === 0 && criterionIndex === 0
                            ? dataTourTarget(TOUR_TARGETS.practiceReviewScoreButtons)
                            : {})}
                        >
                          <ScoreButtons
                            value={generalScores[question.id]?.[criterion.id] || 0}
                            max={criterion.maxPoints || criterion.max || 0}
                            onChange={(val) =>
                              onGeneralScoresChange((prev) => ({
                                ...prev,
                                [question.id]: { ...prev[question.id], [criterion.id]: val },
                              }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                    <div
                      className="pt-1"
                      {...(index === 0 ? dataTourTarget(TOUR_TARGETS.practiceReviewJustification) : {})}
                    >
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <span className="font-semibold">Justification</span>
                        {justificationRequired ? (
                          <RequiredMark
                            label={`Required — min ${JUSTIFICATION_MIN_CHARS} characters`}
                          />
                        ) : (
                          <span className="text-muted-foreground/70 text-[11px] font-normal">
                            (optional)
                          </span>
                        )}
                      </p>
                      <textarea
                        id={`review-justification-general-${question.id}`}
                        value={justificationValue}
                        onChange={(e) =>
                          onGeneralJustificationsChange((prev) => ({
                            ...prev,
                            [question.id]: e.target.value.slice(0, JUSTIFICATION_MAX_CHARS),
                          }))
                        }
                        maxLength={JUSTIFICATION_MAX_CHARS}
                        aria-required={justificationRequired ? true : undefined}
                        placeholder={
                          justificationRequired
                            ? `Cite specific evidence from the response. What earned each point? (min ${JUSTIFICATION_MIN_CHARS} chars)`
                            : "Optional notes for the panel about how you scored this question…"
                        }
                        className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 resize-y transition-all min-h-[120px]"
                      />
                      <div className="flex items-center justify-between mt-2 text-[11px]">
                        <span className="text-muted-foreground/70">
                          {justificationRequired
                            ? `Min ${JUSTIFICATION_MIN_CHARS} chars`
                            : ""}
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

      {/* Interpretation Guide is rendered in the modal's right pane via
          <RubricGuideCard interpretationGuide={...} /> so it stays visible
          as a reference without crowding the question + answer flow. */}

      {/* Running subtotal */}
      <div
        className={`flex items-center justify-between p-4 rounded-xl ${STATUS_COLORS.warning.bgSubtle} ${STATUS_COLORS.warning.border}`}
        {...dataTourTarget(TOUR_TARGETS.practiceReviewGeneralSubtotal)}
      >
        <p className="text-sm text-muted-foreground font-medium">General Subtotal</p>
        <p className="text-sm font-bold text-primary tabular-nums">
          {generalTotal}{generalMax ? ` / ${generalMax}` : ""}
        </p>
      </div>
    </div>
  );
}
