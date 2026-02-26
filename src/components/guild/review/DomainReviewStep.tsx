"use client";

import { AlertTriangle, Award, Loader2 } from "lucide-react";
import { ScoreButtons, renderPromptLines } from "@/components/guild/ReviewGuildApplicationModal";
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
}: DomainReviewStepProps) {
  return (
    <div className="space-y-6">
      {/* Domain / Level Questions */}
      <div className="space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <Award className="w-4 h-4 text-amber-300" />
          </div>
          <h3 className="text-base font-bold text-foreground">Domain Review</h3>
        </div>

        {loadingTemplates && !levelTemplate ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading topic rubric...</p>
          </div>
        ) : topicList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No level-specific rubric available for this guild.</p>
        ) : (
          topicList.map((topic) => {
            const score = topicScores[topic.id] || 0;
            const pct = (score / 5) * 100;

            return (
              <div
                key={topic.id}
                className="rounded-2xl border border-border bg-card overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
                  <p className="text-sm font-semibold text-foreground">
                    {topic.title || topic.id}
                  </p>
                  <div className="flex items-center gap-2.5">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-primary tabular-nums">
                      {score}/5
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="space-y-3">
                    {renderPromptLines(topic.prompt)}
                    <div className="rounded-lg bg-muted/30 border border-border p-3.5">
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {topicAnswers[topic.id] || <span className="text-muted-foreground italic">No response</span>}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-card border border-border p-4 space-y-4">
                    <p className="text-[11px] text-amber-300/70 uppercase tracking-wider font-bold">Scoring</p>
                    {topic.whatToLookFor && topic.whatToLookFor.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-foreground">What to look for</p>
                        <ul className="space-y-1">
                          {topic.whatToLookFor.map((item: string, idx: number) => (
                            <li key={idx} className="text-xs text-muted-foreground pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1 before:h-1 before:rounded-full before:bg-muted-foreground/40">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {topic.scoring && (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "5 pts", value: topic.scoring.five, color: "text-green-400" },
                          { label: "3-4", value: topic.scoring.threeToFour, color: "text-amber-300" },
                          { label: "1-2", value: topic.scoring.oneToTwo, color: "text-orange-400" },
                          { label: "0", value: topic.scoring.zero, color: "text-red-400" },
                        ].map((s) => (
                          <div key={s.label} className="text-xs text-muted-foreground rounded-lg bg-muted/30 border border-border p-2">
                            <span className={`font-bold ${s.color}`}>{s.label}:</span> {s.value}
                          </div>
                        ))}
                      </div>
                    )}
                    <ScoreButtons
                      value={topicScores[topic.id] || 0}
                      max={5}
                      onChange={(val) =>
                        onTopicScoresChange((prev) => ({
                          ...prev,
                          [topic.id]: val,
                        }))
                      }
                    />
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Justification <span className="text-red-400/60">*</span>
                      </p>
                      <textarea
                        value={topicJustifications[topic.id] || ""}
                        onChange={(e) =>
                          onTopicJustificationsChange((prev) => ({
                            ...prev,
                            [topic.id]: e.target.value,
                          }))
                        }
                        placeholder="Tie the score to specific criteria from the rubric..."
                        rows={2}
                        className="w-full px-3.5 py-2.5 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 resize-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Red Flags */}
      <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.03] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-red-500/10 bg-red-500/[0.03]">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-bold text-foreground">Red Flags (Deductions)</h3>
        </div>
        <div className="p-5">
          {generalRedFlags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No red flags defined for this rubric.</p>
          ) : (
            <div className="space-y-2.5">
              {generalRedFlags.map((flag) => (
                <label
                  key={flag.id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    redFlags[flag.id]
                      ? "bg-red-500/10 border border-red-500/25"
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
                    className="h-4 w-4 rounded border-border bg-muted/50 accent-red-500"
                  />
                  <span className={`text-sm flex-1 ${redFlags[flag.id] ? "text-red-300" : "text-muted-foreground"}`}>
                    {flag.label}
                  </span>
                  <span className={`text-xs font-bold ${redFlags[flag.id] ? "text-red-400" : "text-muted-foreground/60"}`}>
                    -{Math.abs(flag.points || 0)} pts
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overall Score Summary */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.08] via-orange-500/[0.05] to-transparent p-5">
        <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-foreground">Overall Score</p>
            <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 tabular-nums">
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
            <div className="text-center p-2.5 rounded-lg bg-red-500/[0.06] border border-red-500/15">
              <p className="text-xs text-muted-foreground mb-0.5">Deductions</p>
              <p className="text-sm font-bold text-red-400 tabular-nums">-{redFlagDeductions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback */}
      <div>
        <p className="text-[11px] text-amber-300/70 uppercase tracking-wider font-semibold mb-3">
          Feedback (Optional)
        </p>
        <textarea
          value={feedback}
          onChange={(e) => onFeedbackChange(e.target.value)}
          placeholder="Share your reasoning and key feedback..."
          className="w-full px-4 py-3.5 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 resize-none transition-all"
          rows={4}
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground mt-1.5 text-right">
          {feedback.length}/1000
        </p>
      </div>
    </div>
  );
}
