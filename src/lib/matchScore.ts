/**
 * Skill-based match scoring (whitepaper §1.3 — AI-Assisted Matching, Phase 1).
 *
 * Deterministic Jaccard similarity between candidate skills and job requirements.
 * No AI/LLM needed — pure skill overlap computation.
 */

import { STATUS_COLORS } from "@/config/colors";

/**
 * Compute a match score (0-100) between candidate skills and job required skills.
 * Uses weighted Jaccard similarity: exact matches score higher, partial matches score lower.
 */
export function computeMatchScore(
  candidateSkills: string[],
  jobSkills: string[],
): number {
  if (jobSkills.length === 0 || candidateSkills.length === 0) return 0;

  const normalize = (s: string) => s.toLowerCase().trim();
  const candidateSet = new Set(candidateSkills.map(normalize));
  const jobNormalized = jobSkills.map(normalize);

  let matched = 0;
  for (const skill of jobNormalized) {
    if (candidateSet.has(skill)) {
      matched += 1;
    } else {
      // Partial match: check if any candidate skill contains the job skill or vice versa
      for (const cs of candidateSet) {
        if (cs.includes(skill) || skill.includes(cs)) {
          matched += 0.5;
          break;
        }
      }
    }
  }

  return Math.round((matched / jobNormalized.length) * 100);
}

/**
 * Get a label and color for a match score.
 */
export function getMatchScoreConfig(score: number): { label: string; colorClass: string; bgClass: string } {
  if (score >= 80) return { label: "Strong Match", colorClass: STATUS_COLORS.positive.text, bgClass: `${STATUS_COLORS.positive.bgSubtle} ${STATUS_COLORS.positive.border}` };
  if (score >= 60) return { label: "Good Match", colorClass: STATUS_COLORS.info.text, bgClass: `${STATUS_COLORS.info.bgSubtle} ${STATUS_COLORS.info.border}` };
  if (score >= 40) return { label: "Partial Match", colorClass: STATUS_COLORS.warning.text, bgClass: `${STATUS_COLORS.warning.bgSubtle} ${STATUS_COLORS.warning.border}` };
  return { label: "Low Match", colorClass: "text-muted-foreground", bgClass: "bg-muted/50 border-border" };
}
