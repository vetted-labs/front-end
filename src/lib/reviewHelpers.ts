import type { ExpertMembershipApplication, CandidateGuildApplication } from "@/types";

/**
 * Maps flat candidate application responses to the nested structure
 * expected by ReviewGuildApplicationModal.
 *
 * Flat format:  { "learning_from_failure.event": "...", "domain.topicId": "..." }
 * Nested format: { general: { learningFromFailure: { event: "..." } }, domain: { topics: { topicId: "..." } }, level: "..." }
 */
const GENERAL_KEY_MAP: Record<string, string> = {
  learning_from_failure: "learningFromFailure",
  decision_under_uncertainty: "decisionUnderUncertainty",
  motivation_and_conflict: "motivationAndConflict",
  guild_improvement: "guildImprovement",
};

export function mapCandidateToReviewApplication(
  candidateApp: CandidateGuildApplication,
): ExpertMembershipApplication {
  const flatAnswers = candidateApp.applicationResponses || {};

  const general: Record<string, string | Record<string, string>> = {};
  const domainTopics: Record<string, string> = {};

  Object.entries(flatAnswers).forEach(([key, value]) => {
    const strValue = typeof value === "string" ? value : String(value ?? "");
    if (key.startsWith("domain.")) {
      const topicId = key.replace("domain.", "");
      domainTopics[topicId] = strValue;
    } else if (key.includes(".")) {
      const [questionId, partId] = key.split(".");
      const camelKey = GENERAL_KEY_MAP[questionId] || questionId;
      if (!general[camelKey] || typeof general[camelKey] === "string") general[camelKey] = {};
      (general[camelKey] as Record<string, string>)[partId] = strValue;
    } else {
      const camelKey = GENERAL_KEY_MAP[key] || key;
      general[camelKey] = strValue;
    }
  });

  const structuredResponses = {
    general,
    domain: { topics: domainTopics },
    level: candidateApp.expertiseLevel || "",
  };

  return {
    id: candidateApp.id,
    fullName: candidateApp.candidateName,
    email: candidateApp.candidateEmail,
    walletAddress: "",
    linkedinUrl: candidateApp.linkedinUrl || "",
    resumeUrl: candidateApp.resumeUrl || undefined,
    expertiseLevel: candidateApp.expertiseLevel || "entry",
    yearsOfExperience: candidateApp.yearsOfExperience || 0,
    currentTitle: candidateApp.jobTitle
      ? `Applying for: ${candidateApp.jobTitle}`
      : (candidateApp.currentTitle || "Candidate"),
    currentCompany: candidateApp.currentCompany || "",
    bio: candidateApp.bio || "",
    motivation: candidateApp.motivation || "",
    expertiseAreas: candidateApp.expertiseAreas || [],
    appliedAt: candidateApp.submittedAt,
    reviewCount: candidateApp.reviewCount || 0,
    approvalCount: candidateApp.approvalCount || 0,
    rejectionCount: candidateApp.rejectionCount || 0,
    applicationResponses: structuredResponses,
    guildId: candidateApp.guildId,
    guildName: candidateApp.guildName,
  };
}
