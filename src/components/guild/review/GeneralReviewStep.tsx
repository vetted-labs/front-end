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
}: GeneralReviewStepProps) {
  return (
    <div className="space-y-6" {...dataTourTarget(TOUR_TARGETS.practiceReviewGeneralRubric)}>
      <div className="flex items-center gap-3 mb-1">
        <div className={`w-8 h-8 rounded-lg ${STATUS_COLORS.warning.bgSubtle} flex items-center justify-center`}>
          <Sparkles className={`w-4 h-4 ${STATUS_COLORS.warning.icon}`} />
        </div>
        <h3 className="text-sm font-bold text-foreground">General Review</h3>
      </div>

      {loadingTemplates && !generalTemplate ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
          <Loader2 className={`w-4 h-4 ${STATUS_COLORS.warning.icon} animate-spin`} />
          <p className="text-sm text-muted-foreground">Loading general rubric...</p>
        </div>
      ) : Object.keys(generalRubricQuestions).length === 0 ? (
        <p className="text-sm text-muted-foreground">No general scoring rubric available for this guild.</p>
      ) : (
        generalQuestions
          .filter((question) => generalRubricQuestions[question.id])
          .map((question, index) => {
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

            return (
              <div
                key={question.id}
                id={fieldAnchorId("general", question.id)}
                className="rounded-xl border border-border bg-card overflow-hidden scroll-mt-24"
              >
                {/* Question header with score */}
                <div
                  className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30"
                  {...(index === 0 ? dataTourTarget(TOUR_TARGETS.practiceReviewQuestionPrompt) : {})}
                >
                  <p className="text-sm font-semibold text-foreground">{question.prompt}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
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

                <div className="p-5 space-y-4">
                  {/* Applicant responses */}
                  <div className="space-y-3">
                    {(() => {
                      // Check for combined (single string) answer — getGeneralResponseValue
                      // without partId returns the string for combined answers, empty for per-part
                      const combinedAnswer = getGeneralResponseValue(question.id);
                      if (combinedAnswer) {
                        return (
                          <div className="rounded-lg bg-muted/30 border border-border p-4">
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                              {combinedAnswer}
                            </p>
                          </div>
                        );
                      }
                      if (question.parts?.length) {
                        return (
                          <div className="space-y-3">
                            {question.parts.map((part: QuestionPart) => (
                              <div key={part.id} className="rounded-lg bg-muted/30 border border-border p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5">{part.label}</p>
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                  {getGeneralResponseValue(question.id, part.id) || <span className="text-muted-foreground italic">No response</span>}
                                </p>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return (
                        <div className="rounded-lg bg-muted/30 border border-border p-4">
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            <span className="text-muted-foreground italic">No response</span>
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Scoring area */}
                  <div
                    className="rounded-xl bg-card border border-border p-4 space-y-4"
                    {...(index === 0 ? dataTourTarget(TOUR_TARGETS.practiceReviewCriteria) : {})}
                  >
                    <p className={`text-xs ${STATUS_COLORS.warning.text} opacity-70 uppercase tracking-wider font-bold`}>Scoring</p>
                    {criteria.map((criterion, criterionIndex) => (
                      <div key={criterion.id} className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {criterion.label}{" "}
                          <span className="text-muted-foreground/60">(max {criterion.maxPoints || criterion.max || 0})</span>
                          {isScored ? <RequiredMark /> : null}
                        </p>
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
                    <div {...(index === 0 ? dataTourTarget(TOUR_TARGETS.practiceReviewJustification) : {})}>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <span>Justification</span>
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
                            ? `Explain why you gave these points (min ${JUSTIFICATION_MIN_CHARS} chars)…`
                            : "Explain why you gave these points..."
                        }
                        rows={2}
                        className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 resize-none transition-all"
                      />
                      <div className="flex items-center justify-between mt-1.5 text-[11px]">
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

      {/* Interpretation Guide */}
      {interpretationGuide.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden" {...dataTourTarget(TOUR_TARGETS.practiceReviewInterpretationGuide)}>
          <div className="px-5 py-3.5 border-b border-border bg-muted/30">
            <p className="text-sm font-semibold text-foreground">Interpretation Guide</p>
          </div>
          <div className="p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {interpretationGuide.map((item) => (
                <div
                  key={item.range}
                  className="rounded-xl bg-muted/50 border border-border p-4 space-y-2"
                >
                  <p className="text-xs font-bold text-primary">
                    {item.range} — {item.label}
                  </p>
                  <ul className="space-y-2">
                    {(item.notes || []).map((note: string, idx: number) => (
                      <li key={idx} className="text-xs text-muted-foreground pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1 before:h-1 before:rounded-full before:bg-muted-foreground/40">
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
