import type { GuildDetailData, GuildActivity, GuildEarningsOverview, ExpertMember, LeaderboardExpert, LeaderboardEntry } from "@/types";
import { expertApi, guildsApi } from "@/lib/api";
import { logger } from "@/lib/logger";

/**
 * Fetches and normalizes guild detail data from the expert API,
 * falling back to public guild data for missing sections.
 */
export async function fetchAndNormalizeGuildData(
  guildId: string,
  walletAddress: string,
): Promise<{
  guild: GuildDetailData;
  blockchainGuildId: string | undefined;
  currentExpertId: string | null;
}> {
  const data = await expertApi.getGuildDetails(guildId, walletAddress);

  // Find the current user's expert entry to extract personal stats
  const currentExpert = Array.isArray(data.experts)
    ? data.experts.find((e: ExpertMember) => e.walletAddress?.toLowerCase() === walletAddress.toLowerCase())
    : null;

  const earningsRaw = data.earnings ?? {
    totalPoints: currentExpert?.reputation ?? 0,
    totalEndorsementEarnings: data.statistics?.totalEarningsFromEndorsements ?? 0,
    recentEarnings: [] as GuildEarningsOverview["recentEarnings"],
  };
  const earningsItems: GuildEarningsOverview["recentEarnings"] = Array.isArray(earningsRaw.recentEarnings)
    ? earningsRaw.recentEarnings as GuildEarningsOverview["recentEarnings"]
    : [];
  const earnings: GuildEarningsOverview = {
    totalPoints: earningsRaw.totalPoints || earningsItems.filter(e => e.type === "proposal").reduce((s, e) => s + e.amount, 0),
    totalEndorsementEarnings: earningsRaw.totalEndorsementEarnings || earningsItems.filter(e => e.type === "endorsement").reduce((s, e) => s + e.amount, 0),
    recentEarnings: earningsItems,
  };

  const normalized: GuildDetailData & { blockchainGuildId?: string } = {
    id: data.id,
    name: data.name,
    description: data.description,
    experts: Array.isArray(data.experts) ? data.experts : [],
    candidates: Array.isArray(data.candidates) ? data.candidates : [],
    recentJobs: Array.isArray(data.recentJobs) ? data.recentJobs : [],
    guildApplications: Array.isArray(data.guildApplications) ? data.guildApplications : [],
    applications: Array.isArray(data.applications) ? data.applications : [],
    recentActivity: Array.isArray(data.recentActivity) ? (data.recentActivity as GuildActivity[]) : [],
    memberCount: data.memberCount ?? data.totalMembers ?? 0,
    expertRole: data.expertRole ?? currentExpert?.role ?? "member",
    reputation: data.reputation ?? currentExpert?.reputation ?? 0,
    earnings,
    proposals: { pending: [], ongoing: [], closed: [] },
    totalProposalsReviewed: data.totalProposalsReviewed ?? data.statistics?.vettedProposals ?? 0,
    averageApprovalTime: data.averageApprovalTime ?? "\u2014",
    candidateCount: data.candidateCount ?? 0,
    openPositions: data.openPositions ?? 0,
    totalVetdStaked: data.totalVetdStaked ?? data.statistics?.totalVetdStaked ?? 0,
    blockchainGuildId: data.blockchainGuildId,
  };

  const needsPublicFallback =
    normalized.experts.length === 0 ||
    normalized.candidates.length === 0 ||
    normalized.recentJobs.length === 0;

  if (needsPublicFallback) {
    try {
      const publicData = await guildsApi.getPublicDetail(guildId);

      normalized.experts =
        normalized.experts.length > 0
          ? normalized.experts
          : Array.isArray(publicData.experts)
            ? publicData.experts
            : normalized.experts;
      normalized.candidates =
        normalized.candidates.length > 0
          ? normalized.candidates
          : Array.isArray(publicData.candidates)
            ? publicData.candidates
            : normalized.candidates;
      normalized.recentJobs =
        normalized.recentJobs.length > 0
          ? normalized.recentJobs
          : Array.isArray(publicData.recentJobs)
            ? publicData.recentJobs
            : normalized.recentJobs;

      normalized.description = normalized.description || publicData.description;
      normalized.memberCount =
        normalized.memberCount ??
        publicData.totalMembers ??
        publicData.memberCount ??
        (normalized.experts.length + normalized.candidates.length);
      normalized.candidateCount =
        normalized.candidateCount ??
        publicData.candidateCount ??
        normalized.candidates.length;
      normalized.openPositions =
        normalized.openPositions ??
        publicData.openPositions ??
        normalized.recentJobs.length;
      normalized.totalProposalsReviewed =
        normalized.totalProposalsReviewed ?? publicData.totalProposalsReviewed ?? 0;
      normalized.averageApprovalTime =
        normalized.averageApprovalTime ?? publicData.averageApprovalTime ?? "\u2014";
    } catch (err) {
      logger.warn("Public guild data fallback failed", err);
    }
  }

  const bcGuildId = normalized.blockchainGuildId || data.blockchainGuildId;

  return {
    guild: normalized,
    blockchainGuildId: bcGuildId,
    currentExpertId: currentExpert?.id || null,
  };
}

/**
 * Transforms raw leaderboard API entries into the LeaderboardExpert shape
 * used by GuildLeaderboardTab, and identifies the current user.
 */
export function transformLeaderboardData(
  entries: LeaderboardEntry[],
  currentAddress: string,
  fallback: { expertRole: string; reputation: number; totalEndorsementEarnings: number },
): { topExperts: LeaderboardExpert[]; currentUser: LeaderboardExpert | null } {
  const topExperts: LeaderboardExpert[] = entries.map((entry, index) => {
    const totalReviews = entry.totalReviews || 0;
    const approvals = entry.approvals || 0;
    const accuracy = totalReviews > 0 ? Math.round((approvals / totalReviews) * 100) : 0;

    return {
      id: entry.expertId,
      name: entry.fullName ?? entry.expertName ?? "Unknown",
      role: entry.role as LeaderboardExpert["role"],
      reputation: entry.reputation || 0,
      totalReviews,
      accuracy,
      totalEarnings: entry.totalEarnings || 0,
      rank: entry.rank || (index + 1),
      rankChange: undefined,
      reputationChange: undefined,
    };
  });

  const currentUserEntry = entries.find(
    (entry) => entry.walletAddress?.toLowerCase() === currentAddress.toLowerCase()
  );

  let currentUser: LeaderboardExpert | null = null;
  if (currentUserEntry) {
    const totalReviews = currentUserEntry.totalReviews || 0;
    const approvals = currentUserEntry.approvals || 0;
    const accuracy = totalReviews > 0 ? Math.round((approvals / totalReviews) * 100) : 0;

    currentUser = {
      id: currentUserEntry.expertId,
      name: "You",
      role: fallback.expertRole as LeaderboardExpert["role"],
      reputation: currentUserEntry.reputation || 0,
      totalReviews,
      accuracy,
      totalEarnings: currentUserEntry.totalEarnings || 0,
      rank: currentUserEntry.rank,
      rankChange: undefined,
      reputationChange: undefined,
    };
  } else {
    currentUser = {
      id: currentAddress,
      name: "You",
      role: fallback.expertRole as LeaderboardExpert["role"],
      reputation: fallback.reputation || 0,
      totalReviews: 0,
      accuracy: 0,
      totalEarnings: fallback.totalEndorsementEarnings || 0,
      rank: 999,
      rankChange: undefined,
      reputationChange: undefined,
    };
  }

  return { topExperts, currentUser };
}
