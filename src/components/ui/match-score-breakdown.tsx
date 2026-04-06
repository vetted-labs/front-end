"use client";

import { Sparkles } from "lucide-react";
import { getMatchScoreConfig } from "@/lib/matchScore";
import { STATUS_COLORS } from "@/config/colors";
import type { MatchScoreBreakdown } from "@/types";

interface MatchScoreBreakdownProps {
  totalScore: number;
  breakdown: MatchScoreBreakdown;
  matchedSkills?: string[];
  missingSkills?: string[];
  /** Phase B hook — LLM-generated explanation rendered below bars when provided. */
  explanation?: string;
}

const DIMENSION_LABELS: Record<keyof MatchScoreBreakdown, string> = {
  skills: "Skills",
  experience: "Experience",
  location: "Location",
  guild: "Guild",
  salary: "Salary",
};

const DIMENSION_ORDER: (keyof MatchScoreBreakdown)[] = [
  "skills",
  "experience",
  "location",
  "guild",
  "salary",
];

function getBarColor(score: number): string {
  if (score >= 80) return "bg-positive";
  if (score >= 60) return "bg-info-blue";
  if (score >= 40) return "bg-warning";
  return "bg-muted-foreground";
}

/**
 * Full 5-dimension match score breakdown card.
 * Whitepaper §1.3 — Phase 1 deterministic matching.
 * Phase B hook: renders LLM explanation below bars when `explanation` is provided.
 */
export function MatchScoreBreakdown({
  totalScore,
  breakdown,
  matchedSkills,
  missingSkills,
  explanation,
}: MatchScoreBreakdownProps) {
  const config = getMatchScoreConfig(totalScore);

  return (
    <div className="rounded-[14px] border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Match Score</h3>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${config.bgClass} ${config.colorClass}`}>
          <Sparkles className="w-3.5 h-3.5" />
          {totalScore}% {config.label}
        </span>
      </div>

      {/* Dimension bars */}
      <div className="space-y-3">
        {DIMENSION_ORDER.map((key) => {
          const dim = breakdown[key];
          const barColor = getBarColor(dim.score);
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">
                {DIMENSION_LABELS[key]}
              </span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-300`}
                  style={{ width: `${dim.score}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-medium text-foreground">
                {dim.score}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Skill pills */}
      {((matchedSkills && matchedSkills.length > 0) ||
        (missingSkills && missingSkills.length > 0)) && (
        <div className="space-y-2 pt-1">
          {matchedSkills && matchedSkills.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Matched</p>
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.map((skill) => (
                  <span
                    key={skill}
                    className={`px-2 py-0.5 rounded-md text-xs border ${STATUS_COLORS.positive.bgSubtle} ${STATUS_COLORS.positive.text} ${STATUS_COLORS.positive.border}`}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {missingSkills && missingSkills.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Missing</p>
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 rounded-md text-xs bg-muted text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phase B: LLM explanation */}
      {explanation && (
        <div className="pt-3 border-t border-border">
          <div className="flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground leading-relaxed">{explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
