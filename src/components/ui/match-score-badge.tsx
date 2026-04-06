"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { computeMatchScore, getMatchScoreConfig } from "@/lib/matchScore";
import { STATUS_COLORS } from "@/config/colors";

interface SkillBasedProps {
  candidateSkills: string[];
  jobSkills: string[];
  score?: never;
  compact?: boolean;
}

interface ScoreBasedProps {
  score: number;
  candidateSkills?: never;
  jobSkills?: never;
  compact?: boolean;
}

type MatchScoreBadgeProps = SkillBasedProps | ScoreBasedProps;

/**
 * Displays a match score between candidate and job.
 * Whitepaper §1.3 — Phase 1 deterministic matching.
 * Labeled as "AI-assisted" per whitepaper guardrail requirements.
 *
 * Accepts either:
 * - `score` directly (multi-dimensional backend score)
 * - `candidateSkills` + `jobSkills` (client-side Jaccard computation)
 */
export function MatchScoreBadge(props: MatchScoreBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const isScoreBased = "score" in props && props.score !== undefined;

  const score = isScoreBased
    ? props.score
    : computeMatchScore(props.candidateSkills, props.jobSkills);

  if (score === 0) return null;

  const config = getMatchScoreConfig(score);
  const { compact = false } = props;

  // For skill-based mode: find matched skills for tooltip
  const matchedSkills = isScoreBased
    ? []
    : (() => {
        const normalize = (s: string) => s.toLowerCase().trim();
        const candidateSet = new Set(props.candidateSkills.map(normalize));
        return props.jobSkills.filter((skill) => candidateSet.has(normalize(skill)));
      })();

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md text-xs font-medium border ${config.bgClass} ${config.colorClass}`}>
        <Sparkles className="w-3 h-3" />
        {score}%
      </span>
    );
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium border ${config.bgClass} ${config.colorClass} cursor-help`}>
        <Sparkles className="w-3.5 h-3.5" />
        {score}% {config.label}
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-xl border border-border bg-popover p-4 shadow-lg">
          {isScoreBased ? (
            <>
              <p className="text-xs font-medium text-foreground mb-1.5">Multi-dimensional match score</p>
              <p className="text-xs text-muted-foreground italic">
                Computed across skills, experience, location, guild, and salary.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-foreground mb-1.5">Skill Match Details</p>
              {matchedSkills.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Matching Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {matchedSkills.map((skill) => (
                      <span key={skill} className={`px-1.5 py-0.5 ${STATUS_COLORS.positive.bgSubtle} ${STATUS_COLORS.positive.text} text-xs rounded-md ${STATUS_COLORS.positive.border}`}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground italic">
                Skill-based match score. Does not auto-filter candidates.
              </p>
            </>
          )}
          {/* Pointer arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border" />
        </div>
      )}
    </div>
  );
}
