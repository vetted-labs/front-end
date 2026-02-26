// --- Review rubric types (used by expert review components) ---

/** A single scoring criterion within a rubric question (e.g., "Depth of Reflection", "Specificity"). */
export interface RubricCriterion {
  id: string;
  label: string;
  maxPoints?: number;
  max?: number;
}

/** A rubric entry for a single general question, containing its scoring criteria. */
export interface RubricQuestionEntry {
  criteria: RubricCriterion[];
  maxPoints?: number;
}

/** Red flag deduction item in the review rubric. */
export interface RubricRedFlag {
  id: string;
  label: string;
  points: number;
}

/** Interpretation guide entry that maps score ranges to qualitative labels. */
export interface RubricInterpretationGuideItem {
  range: string;
  label: string;
  notes: string[];
}

/** The rubric section of a general application template, used by reviewers to score applicants. */
export interface GeneralTemplateRubric {
  questions: Record<string, RubricQuestionEntry>;
  redFlags?: RubricRedFlag[];
  interpretationGuide?: RubricInterpretationGuideItem[];
  totalPoints?: number;
}

/**
 * Scoring guide for a domain topic, mapping point values to qualitative descriptions.
 * Used in the DomainReviewStep to show reviewers what each score level means.
 */
export interface TopicScoringGuide {
  five: string;
  threeToFour: string;
  oneToTwo: string;
  zero: string;
}

/** Part of a multi-part question (e.g., "What happened?", "What did you learn?"). */
export interface QuestionPart {
  id: string;
  label: string;
}

/**
 * The general template as returned by the API for the "general" stage,
 * extended with the rubric data used during expert reviews.
 *
 * This extends the base GuildApplicationTemplate shape with the review rubric.
 * The API returns this via `expertApi.getGuildApplicationTemplate(guildId, "general")`.
 */
export interface GeneralReviewTemplate {
  questions?: GeneralReviewQuestion[];
  guidance?: string[];
  noAiDeclarationText?: string;
  rubric?: GeneralTemplateRubric;
}

/**
 * A question within the general review template.
 * This is the shape used in the review flow -- it extends the application question
 * with an optional `parts` array and `scored` flag for the review rubric.
 */
export interface GeneralReviewQuestion {
  id: string;
  title?: string;
  prompt: string;
  parts?: QuestionPart[];
  scored?: boolean;
}

/**
 * The level template as returned by the API for the "level" stage,
 * containing domain-specific topics for expert review.
 *
 * The API returns this via `expertApi.getGuildApplicationTemplate(guildId, "level", level)`.
 */
export interface LevelReviewTemplate {
  templateName?: string;
  description?: string;
  totalPoints?: number;
  topics?: ReviewDomainTopic[];
}

/**
 * A domain topic within the level review template.
 * Extends the base GuildDomainTopic with scoring guides and lookup hints
 * that are used during the expert review process.
 */
export interface ReviewDomainTopic {
  id: string;
  title: string;
  prompt?: string;
  whatToLookFor?: string[];
  scoring?: TopicScoringGuide;
}

/**
 * The shape of applicationResponses stored on a guild application.
 * Contains the applicant's answers organized by section.
 */
export interface ApplicationResponses {
  general?: Record<string, string | Record<string, string>>;
  domain?: {
    topics?: Record<string, string>;
  };
  level?: string;
}

/** The payload sent when submitting a review. */
export interface ReviewSubmitPayload {
  feedback?: string;
  criteriaScores: Record<string, unknown>;
  criteriaJustifications: Record<string, unknown>;
  overallScore: number;
  redFlagDeductions: number;
}

/** The response returned after submitting a review. */
export interface ReviewSubmitResponse {
  message?: string;
}
