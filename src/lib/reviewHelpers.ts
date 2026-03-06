import type { ExpertMembershipApplication, CandidateGuildApplication, GuildApplication } from "@/types";

/**
 * Maps flat candidate application responses to the nested structure
 * expected by ReviewGuildApplicationModal.
 *
 * Flat format:  { "learning_from_failure.event": "...", "domain.topicId": "..." }
 * Nested format: { general: { learningFromFailure: { event: "..." } }, domain: { topics: { topicId: "..." } }, level: "..." }
 */
/**
 * Maps a GuildApplication (proposal with snake_case flat fields) to the
 * ExpertMembershipApplication shape expected by ReviewGuildApplicationModal.
 *
 * Proposals don't have Q&A applicationResponses — we map their structured
 * fields (motivation_statement, experience_summary, etc.) into the general
 * response format so the review rubric steps can display them.
 */
export function mapProposalToReviewApplication(
  proposal: GuildApplication,
): ExpertMembershipApplication {
  // Build best-effort applicationResponses from proposal fields
  const general: Record<string, string | Record<string, string>> = {};

  if (proposal.motivation_statement) {
    general.motivationAndConflict = {
      motivation: proposal.motivation_statement,
    };
  }
  if (proposal.experience_summary) {
    general.learningFromFailure = {
      event: proposal.experience_summary,
    };
  }
  if (proposal.credibility_evidence) {
    general.decisionUnderUncertainty = {
      decision: proposal.credibility_evidence,
    };
  }
  if (proposal.achievements?.length) {
    general.guildImprovement = proposal.achievements.join("\n\n");
  }

  const applicationResponses = {
    general,
    domain: { topics: {} },
    level: "",
  };

  const bio = [
    proposal.experience_summary,
    proposal.credibility_evidence,
  ].filter(Boolean).join("\n\n");

  const expertiseAreas = proposal.skills_summary
    ? proposal.skills_summary.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    id: proposal.id,
    fullName: proposal.candidate_name,
    email: proposal.candidate_email,
    walletAddress: "",
    linkedinUrl: "",
    expertiseLevel: "",
    yearsOfExperience: proposal.years_of_experience ?? 0,
    currentTitle: "Proposal Candidate",
    currentCompany: "",
    bio,
    motivation: proposal.motivation_statement || "",
    expertiseAreas,
    appliedAt: proposal.created_at,
    reviewCount: proposal.vote_count ?? 0,
    approvalCount: proposal.votes_for_count ?? 0,
    rejectionCount: proposal.votes_against_count ?? 0,
    applicationResponses,
    guildId: proposal.guild_id,
    guildName: proposal.guild_name,
  };
}

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
