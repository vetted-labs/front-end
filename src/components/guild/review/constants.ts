/** Maps general question IDs to their camelCase response keys in applicationResponses.general */
export const GENERAL_RESPONSE_KEY_MAP: Record<string, string> = {
  learning_from_failure: "learningFromFailure",
  decision_under_uncertainty: "decisionUnderUncertainty",
  motivation_and_conflict: "motivationAndConflict",
  guild_improvement: "guildImprovement",
};

/** Fallback general questions when no review template is loaded from the API */
export const FALLBACK_GENERAL_QUESTIONS = [
  {
    id: "learning_from_failure",
    title: "Learning from Failure",
    prompt: "Describe a specific professional or academic failure from recent years where you were the primary owner.",
  },
  {
    id: "decision_under_uncertainty",
    title: "Decision-Making Under Uncertainty",
    prompt: "Walk us through a complex technical or strategic decision you made without full information.",
  },
  {
    id: "motivation_and_conflict",
    title: "Motivation and Conflict",
    prompt: "Think about your transition into your current or most recent role.",
  },
  {
    id: "guild_improvement",
    title: "First Improvement",
    prompt: "If accepted into the Vetted guild, what is the first thing you would improve or change, and why?",
  },
];
