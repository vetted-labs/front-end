import type { ReviewDomainTopic, RubricQuestionEntry } from "@/types";

type ScoreMap = Record<string, number>;
type NestedScoreMap = Record<string, ScoreMap>;

export function getGeneralScoreErrorKey(questionId: string, criterionId: string): string {
  return `${questionId}.${criterionId}`;
}

export interface ReviewScoreValidationInput {
  generalRubricQuestions: Record<string, RubricQuestionEntry>;
  generalQuestionIds?: string[];
  generalScores: NestedScoreMap;
  topicList: Pick<ReviewDomainTopic, "id" | "title">[];
  topicScores: ScoreMap;
}

export interface ReviewScoreValidationResult {
  valid: boolean;
  message?: string;
  generalErrors: Record<string, string>;
  topicErrors: Record<string, string>;
}

function hasSelectedScore(scores: ScoreMap | undefined, key: string): boolean {
  return !!scores && Object.prototype.hasOwnProperty.call(scores, key);
}

export function validateReviewScores({
  generalRubricQuestions,
  generalQuestionIds,
  generalScores,
  topicList,
  topicScores,
}: ReviewScoreValidationInput): ReviewScoreValidationResult {
  const generalErrors: Record<string, string> = {};
  const topicErrors: Record<string, string> = {};
  let firstMessage: string | undefined;

  const renderedQuestionIds = generalQuestionIds ? new Set(generalQuestionIds) : null;
  for (const [questionId, rubric] of Object.entries(generalRubricQuestions)) {
    if (renderedQuestionIds && !renderedQuestionIds.has(questionId)) {
      const message = "Review rubric is missing a matching question. Reload the page or contact support.";
      generalErrors[questionId] = message;
      firstMessage ??= message;
      continue;
    }

    for (const criterion of rubric.criteria || []) {
      if (!hasSelectedScore(generalScores[questionId], criterion.id)) {
        const label = criterion.label || criterion.id;
        const message = `Select a score for ${label}.`;
        generalErrors[getGeneralScoreErrorKey(questionId, criterion.id)] = message;
        firstMessage ??= message;
      }
    }
  }

  for (const topic of topicList) {
    if (!hasSelectedScore(topicScores, topic.id)) {
      const message = `Select a score for ${topic.title || topic.id}.`;
      topicErrors[topic.id] = message;
      firstMessage ??= message;
    }
  }

  return {
    valid: !firstMessage,
    message: firstMessage,
    generalErrors,
    topicErrors,
  };
}
