"use client";

import { useState, useEffect } from "react";

import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Eye } from "lucide-react";
import { Alert } from "./ui/alert";
import { PillTabs } from "./ui/pill-tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { expertApi, guildsApi, blockchainApi } from "@/lib/api";
import { GuildHeader } from "./guild/GuildHeader";
// GuildApplicationSummarysTab removed - merged into Membership Reviews
import { GuildLeaderboardTab } from "./guild/GuildLeaderboardTab";
import { GuildMembershipApplicationsTab } from "./guild/GuildMembershipApplicationsTab";
import { GuildEarningsTab } from "./guild/GuildEarningsTab";
import { GuildActivityFeed } from "./guild/GuildActivityTab";
import { GuildMembersTab } from "./guild/GuildMembersTab";
import { GuildJobsTab } from "./guild/GuildJobsTab";
import { GuildFeedTab } from "./guild/GuildFeedTab";
import dynamic from "next/dynamic";
import { StakeModal } from "./guild/StakeModal";

const ReviewGuildApplicationModal = dynamic(
  () => import("./guild/ReviewGuildApplicationModal").then(m => ({ default: m.ReviewGuildApplicationModal })),
  { ssr: false }
);
const StakingModal = dynamic(
  () => import("./dashboard/StakingModal").then(m => ({ default: m.StakingModal })),
  { ssr: false }
);
import type { Job, GuildApplicationSummary, GuildJobApplication, ExpertMember, CandidateMember, ExpertRole, LeaderboardEntry } from "@/types";

/** Extended guild detail response from expertApi.getGuildDetails — the backend returns more fields than the ExpertGuild type declares. */
interface ExpertGuildDetailResponse {
  id: string;
  name: string;
  description: string;
  memberCount?: number;
  totalMembers?: number;
  expertRole?: string;
  reputation?: number;
  experts?: ExpertMember[];
  candidates?: CandidateMember[];
  recentJobs?: Job[];
  guildApplications?: ExpertMembershipApplication[];
  applications?: GuildJobApplication[];
  recentActivity?: Activity[];
  earnings?: Partial<Earnings>;
  statistics?: {
    vettedProposals?: number;
    totalVetdStaked?: number;
    totalEarningsFromEndorsements?: number;
  };
  totalProposalsReviewed?: number;
  averageApprovalTime?: string;
  totalVetdStaked?: number;
  blockchainGuildId?: string;
  candidateCount?: number;
  openPositions?: number;
}

interface Earnings {
  totalPoints: number;
  totalEndorsementEarnings: number;
  recentEarnings: Array<{
    id: string;
    type: "proposal" | "endorsement";
    amount: number;
    description: string;
    date: string;
  }>;
}

interface ExpertMembershipApplication {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  linkedinUrl: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  expertiseLevel: string;
  yearsOfExperience: number;
  currentTitle: string;
  currentCompany: string;
  bio: string;
  motivation: string;
  expertiseAreas: string[];
  appliedAt: string;
  reviewCount: number;
  approvalCount: number;
  rejectionCount: number;
  applicationResponses?: Record<string, unknown>;
}

interface LeaderboardExpert {
  id: string;
  name: string;
  role: "recruit" | "apprentice" | "craftsman" | "officer" | "master";
  reputation: number;
  totalReviews: number;
  accuracy: number;
  totalEarnings: number;
  rank: number;
  rankChange?: number; // Positive = moved up, negative = moved down
  reputationChange?: number; // Change in reputation this period
}

interface Activity {
  id: string;
  type: "proposal_submitted" | "candidate_approved" | "job_posted" | "endorsement_given" | "expert_applied" | "candidate_applied" | "application_reviewed" | "member_approved" | "member_rejected";
  actor: string;
  target?: string;
  timestamp: string;
  details: string;
}

/** Candidate application shape returned by the candidate-applications endpoint — includes both review and listing fields. */
interface CandidateApplicationForReview {
  id: string;
  candidateName: string;
  candidateEmail: string;
  status: string;
  expertiseLevel: string;
  applicationResponses: Record<string, unknown>;
  resumeUrl?: string | null;
  submittedAt: string;
  reviewCount: number;
  approvalCount: number;
  rejectionCount: number;
  jobTitle: string | null;
  jobId: string | null;
  expertHasReviewed: boolean;
  // Additional fields used for review mapping
  linkedinUrl?: string;
  currentTitle?: string;
  currentCompany?: string;
  bio?: string;
  motivation?: string;
  expertiseAreas?: string[];
  yearsOfExperience?: number;
  requiredStake?: number;
}

interface GuildDetail {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  expertRole: string;
  reputation: number;
  proposals: {
    pending: GuildApplicationSummary[];
    ongoing: GuildApplicationSummary[];
    closed: GuildApplicationSummary[];
  };
  applications: GuildJobApplication[];
  guildApplications: ExpertMembershipApplication[];
  earnings: Earnings;
  recentActivity: Activity[];
  experts: ExpertMember[];
  candidates: CandidateMember[];
  recentJobs: Job[];
  totalProposalsReviewed: number;
  averageApprovalTime: string;
  candidateCount: number;
  openPositions: number;
  totalVetdStaked?: number;
}

interface GuildDetailViewProps {
  guildId: string;
}

export function GuildDetailView({ guildId }: GuildDetailViewProps) {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [guild, setGuild] = useState<GuildDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const validTabs = ["feed", "membershipApplications", "jobs", "activity", "earnings", "members", "leaderboard"] as const;
  type TabType = (typeof validTabs)[number];
  const initialTab = (() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam && validTabs.includes(tabParam as TabType)) return tabParam as TabType;
    if (searchParams?.get("applicationId")) return "membershipApplications" as TabType;
    return "feed" as TabType;
  })();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Stake modal state
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<GuildApplicationSummary | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedExpertMembershipApplication, setSelectedExpertMembershipApplication] =
    useState<ExpertMembershipApplication | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [autoOpenedReview, setAutoOpenedReview] = useState(false);
  const [applicationReviewType, setApplicationReviewType] = useState<"expert" | "candidate">("expert");

  // Candidate applications state
  const [candidateApplications, setCandidateApplications] = useState<CandidateApplicationForReview[]>([]);

  // VETD Staking modal state
  const [showVetdStakingModal, setShowVetdStakingModal] = useState(false);

  // Staking status
  const [stakingStatus, setStakingStatus] = useState<{ meetsMinimum: boolean } | null>(null);

  // Guild blockchain ID for staking checks
  const [guildBlockchainId, setGuildBlockchainId] = useState<string | null>(null);

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState<{
    topExperts: LeaderboardExpert[];
    currentUser: LeaderboardExpert | null;
  }>({ topExperts: [], currentUser: null });
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"all" | "month" | "week">("all");
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      fetchGuildDetails();
    }
  }, [guildId, isConnected, address]);

  useEffect(() => {
    if (isConnected && address && activeTab === "leaderboard" && guild &&
        leaderboardData.topExperts.length === 0 && !isLoadingLeaderboard) {
      fetchLeaderboard();
    }
  }, [activeTab, guildId, isConnected, address, guild]);
  // Note: leaderboardPeriod removed - backend doesn't support period filtering yet

  const fetchGuildDetails = async (silent = false) => {
    if (!address) return;

    if (!silent) setIsLoading(true);
    setError(null);

    try {
      const data = await expertApi.getGuildDetails(guildId, address) as ExpertGuildDetailResponse;
      // Find the current user's expert entry to extract personal stats
      const currentExpert = Array.isArray(data.experts)
        ? data.experts.find((e: ExpertMember) => e.walletAddress?.toLowerCase() === address.toLowerCase())
        : null;

      const earningsRaw = data.earnings ?? {
        totalPoints: currentExpert?.reputation ?? 0,
        totalEndorsementEarnings: data.statistics?.totalEarningsFromEndorsements ?? 0,
        recentEarnings: [] as Earnings["recentEarnings"],
      };
      const earningsItems: Earnings["recentEarnings"] = Array.isArray(earningsRaw.recentEarnings)
        ? earningsRaw.recentEarnings as Earnings["recentEarnings"]
        : [];
      const earnings: Earnings = {
        totalPoints: earningsRaw.totalPoints || earningsItems.filter(e => e.type === "proposal").reduce((s, e) => s + e.amount, 0),
        totalEndorsementEarnings: earningsRaw.totalEndorsementEarnings || earningsItems.filter(e => e.type === "endorsement").reduce((s, e) => s + e.amount, 0),
        recentEarnings: earningsItems,
      };

      const normalized: GuildDetail & { blockchainGuildId?: string } = {
        id: data.id,
        name: data.name,
        description: data.description,
        experts: Array.isArray(data.experts) ? data.experts : [],
        candidates: Array.isArray(data.candidates) ? data.candidates : [],
        recentJobs: Array.isArray(data.recentJobs) ? data.recentJobs : [],
        guildApplications: Array.isArray(data.guildApplications) ? data.guildApplications : [],
        applications: Array.isArray(data.applications) ? data.applications : [],
        recentActivity: Array.isArray(data.recentActivity) ? data.recentActivity : [],
        memberCount: data.memberCount ?? data.totalMembers ?? 0,
        expertRole: data.expertRole ?? currentExpert?.role ?? "member",
        reputation: data.reputation ?? currentExpert?.reputation ?? 0,
        earnings,
        proposals: { pending: [], ongoing: [], closed: [] },
        totalProposalsReviewed: data.totalProposalsReviewed ?? data.statistics?.vettedProposals ?? 0,
        averageApprovalTime: data.averageApprovalTime ?? "—",
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
            normalized.averageApprovalTime ?? publicData.averageApprovalTime ?? "—";
        } catch {
          // Non-critical — public stats won't show but page is still usable
        }
      }
      setGuild(normalized);

      // Store blockchain guild ID for staking checks
      const bcGuildId = normalized.blockchainGuildId || data.blockchainGuildId;
      if (bcGuildId) setGuildBlockchainId(bcGuildId);

      // Fetch staking status (pass guild-specific blockchain ID if available)
      try {
        const stakeData = await blockchainApi.getStakeBalance(address, bcGuildId || undefined);
        setStakingStatus({ meetsMinimum: !!stakeData?.meetsMinimum });
      } catch {
        setStakingStatus({ meetsMinimum: false });
        toast.warning("Could not load staking status");
      }

      // Fetch candidate guild applications
      try {
        const candidateApps = await guildsApi.getCandidateApplications(guildId, address) as CandidateApplicationForReview[] ?? [];
        setCandidateApplications(Array.isArray(candidateApps) ? candidateApps : []);
      } catch (candidateErr) {
        setCandidateApplications([]);
        toast.warning("Could not load candidate applications");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch guild details";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!guild || autoOpenedReview) return;
    const applicationId = searchParams?.get("applicationId");
    if (!applicationId) return;
    const target = guild.guildApplications?.find((app) => app.id === applicationId);
    if (target) {
      setSelectedExpertMembershipApplication(target);
      setShowReviewModal(true);
      setActiveTab("membershipApplications");
      setAutoOpenedReview(true);
    }
  }, [guild, autoOpenedReview, searchParams]);

  const fetchLeaderboard = async () => {
    if (!address || isLoadingLeaderboard) return;

    setIsLoadingLeaderboard(true);
    try {
      // Call real API with guildId parameter
      const result = await expertApi.getLeaderboard({
        guildId: guildId,
        limit: 50
      });

      const leaderboardEntries: LeaderboardEntry[] = Array.isArray(result) ? result : [];

      // Transform backend data to frontend structure
      const topExperts: LeaderboardExpert[] = leaderboardEntries.map((entry, index) => {
        const totalReviews = entry.totalReviews || 0;
        const approvals = entry.approvals || 0;
        const accuracy = totalReviews > 0
          ? Math.round((approvals / totalReviews) * 100)
          : 0;

        return {
          id: entry.expertId,
          name: entry.fullName ?? entry.expertName ?? "Unknown",
          role: entry.role as "recruit" | "apprentice" | "craftsman" | "officer" | "master",
          reputation: entry.reputation || 0,
          totalReviews: totalReviews,
          accuracy: accuracy,
          totalEarnings: entry.totalEarnings || 0,
          rank: entry.rank || (index + 1),
          rankChange: undefined,
          reputationChange: undefined,
        };
      });

      // Find current user in the leaderboard
      const currentUserEntry = leaderboardEntries.find(
        (entry) => entry.walletAddress?.toLowerCase() === address.toLowerCase()
      );

      let currentUser: LeaderboardExpert | null = null;
      if (currentUserEntry) {
        const totalReviews = currentUserEntry.totalReviews || 0;
        const approvals = currentUserEntry.approvals || 0;
        const accuracy = totalReviews > 0
          ? Math.round((approvals / totalReviews) * 100)
          : 0;

        currentUser = {
          id: currentUserEntry.expertId,
          name: "You",
          role: guild?.expertRole as "recruit" | "apprentice" | "craftsman" | "officer" | "master",
          reputation: currentUserEntry.reputation || 0,
          totalReviews: totalReviews,
          accuracy: accuracy,
          totalEarnings: currentUserEntry.totalEarnings || 0,
          rank: currentUserEntry.rank,
          rankChange: undefined,
          reputationChange: undefined,
        };
      } else {
        // User not in top 50, use guild profile data as fallback
        currentUser = {
          id: address,
          name: "You",
          role: guild?.expertRole as "recruit" | "apprentice" | "craftsman" | "officer" | "master",
          reputation: guild?.reputation || 0,
          totalReviews: 0,
          accuracy: 0,
          totalEarnings: guild?.earnings?.totalEndorsementEarnings || 0,
          rank: 999,
          rankChange: undefined,
          reputationChange: undefined,
        };
      }

      setLeaderboardData({ topExperts, currentUser });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to fetch leaderboard: ${message}`);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const handleStakeOnApplication = (application: GuildApplicationSummary) => {
    setSelectedApplication(application);
    setStakeAmount(application.requiredStake.toString());
    setShowStakeModal(true);
  };

  const handleConfirmStake = async () => {
    if (!selectedApplication || !address) return;

    setIsStaking(true);

    try {
      await expertApi.stakeOnApplication(selectedApplication.id, {
        walletAddress: address,
        stakeAmount: parseFloat(stakeAmount),
      });

      setShowStakeModal(false);
      setSelectedApplication(null);
      fetchGuildDetails();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to stake on application";
      setError(message);
    } finally {
      setIsStaking(false);
    }
  };

  const handleEndorseCandidate = async (applicationId: string, endorse: boolean) => {
    if (!address) return;

    try {
      await expertApi.endorseApplication(applicationId, {
        walletAddress: address,
        endorse,
      });

      fetchGuildDetails();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to endorse candidate";
      setError(message);
    }
  };

  const handleReviewApplication = (application: ExpertMembershipApplication) => {
    if (!stakingStatus?.meetsMinimum) {
      toast.info("You need to stake VETD tokens first to unlock reviewing.");
      return;
    }
    setSelectedExpertMembershipApplication(application);
    setApplicationReviewType("expert");
    setShowReviewModal(true);
  };

  const handleReviewCandidateApplication = (candidateApp: CandidateApplicationForReview) => {
    if (!stakingStatus?.meetsMinimum) {
      toast.info("You need to stake VETD tokens first to unlock reviewing.");
      return;
    }
    // Transform flat answer format to nested format expected by review modal
    // Flat: { "learning_from_failure.event": "...", "domain.topicId": "..." }
    // Nested: { general: { learningFromFailure: { event: "..." } }, domain: { topics: { topicId: "..." } }, level: "..." }
    const flatAnswers = candidateApp.applicationResponses || {};
    const generalKeyMap: Record<string, string> = {
      learning_from_failure: "learningFromFailure",
      decision_under_uncertainty: "decisionUnderUncertainty",
      motivation_and_conflict: "motivationAndConflict",
      guild_improvement: "guildImprovement",
    };

    const general: Record<string, string | Record<string, string>> = {};
    const domainTopics: Record<string, string> = {};

    Object.entries(flatAnswers).forEach(([key, value]) => {
      if (key.startsWith("domain.")) {
        const topicId = key.replace("domain.", "");
        domainTopics[topicId] = value as string;
      } else if (key.includes(".")) {
        const [questionId, partId] = key.split(".");
        const camelKey = generalKeyMap[questionId] || questionId;
        if (!general[camelKey] || typeof general[camelKey] === "string") general[camelKey] = {};
        (general[camelKey] as Record<string, string>)[partId] = value as string;
      } else {
        const camelKey = generalKeyMap[key] || key;
        general[camelKey] = value as string;
      }
    });

    const structuredResponses = {
      general,
      domain: { topics: domainTopics },
      level: candidateApp.expertiseLevel || "",
    };

    const mapped: ExpertMembershipApplication = {
      id: candidateApp.id,
      fullName: candidateApp.candidateName,
      email: candidateApp.candidateEmail,
      walletAddress: "",
      linkedinUrl: candidateApp.linkedinUrl || "",
      resumeUrl: candidateApp.resumeUrl || undefined,
      expertiseLevel: candidateApp.expertiseLevel || "entry",
      yearsOfExperience: candidateApp.yearsOfExperience || 0,
      currentTitle: candidateApp.jobTitle ? `Applying for: ${candidateApp.jobTitle}` : (candidateApp.currentTitle || "Candidate"),
      currentCompany: candidateApp.currentCompany || "",
      bio: candidateApp.bio || "",
      motivation: candidateApp.motivation || "",
      expertiseAreas: candidateApp.expertiseAreas || [],
      appliedAt: candidateApp.submittedAt,
      reviewCount: candidateApp.reviewCount || 0,
      approvalCount: candidateApp.approvalCount || 0,
      rejectionCount: candidateApp.rejectionCount || 0,
      applicationResponses: structuredResponses,
    };
    setSelectedExpertMembershipApplication(mapped);
    setApplicationReviewType("candidate");
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (payload: {
    feedback?: string;
    criteriaScores: Record<string, unknown>;
    criteriaJustifications: Record<string, unknown>;
    overallScore: number;
    redFlagDeductions: number;
  }): Promise<{ message?: string } | void> => {
    if (!selectedExpertMembershipApplication || !address) return;

    setIsReviewing(true);

    try {
      const reviewData = {
        walletAddress: address,
        feedback: payload.feedback || undefined,
        criteriaScores: payload.criteriaScores,
        criteriaJustifications: payload.criteriaJustifications,
        overallScore: payload.overallScore,
        redFlagDeductions: payload.redFlagDeductions,
      };

      const response = applicationReviewType === "candidate"
        ? await guildsApi.reviewCandidateApplication(selectedExpertMembershipApplication.id, reviewData)
        : await expertApi.reviewGuildApplication(selectedExpertMembershipApplication.id, reviewData);

      // Optimistic activity entry
      const newActivity = {
        id: `temp-${Date.now()}`,
        type: "candidate_approved" as const,
        actor: "You",
        details: `Reviewed ${selectedExpertMembershipApplication?.fullName}'s application`,
        timestamp: new Date().toISOString(),
      };
      setGuild(prev => prev ? {
        ...prev,
        recentActivity: [newActivity, ...(prev.recentActivity || [])],
      } : prev);

      fetchGuildDetails(true);
      setTimeout(() => fetchGuildDetails(true), 3000);

      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit review";
      toast.error(message);
      throw err;
    } finally {
      setIsReviewing(false);
    }
  };

  const handleReviewModalClose = () => {
    setShowReviewModal(false);
    setSelectedExpertMembershipApplication(null);
  };

  if (isLoading) {
    return null;
  }

  if (error || !guild) {
    return (
      <div className="flex items-center justify-center px-4">
        <Alert variant="error">{error || "Failed to load guild details"}</Alert>
      </div>
    );
  }

  const expertCountFallback = Math.max(
    0,
    (guild.memberCount || 0) - (guild.candidateCount || 0)
  );

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden animate-page-enter">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.08),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_55%)]" />
        <div className="absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-orange-500/8 dark:bg-orange-500/15 blur-3xl" />
        <div className="absolute top-1/3 left-[-15%] h-96 w-96 rounded-full bg-amber-500/6 dark:bg-amber-500/12 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative z-10">
        <GuildHeader guild={guild} onStakeClick={() => setShowVetdStakingModal(true)} />

      {/* Navigation Link to Public View */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => router.push(`/guilds/${guildId}`)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-muted/50 border border-border rounded-lg hover:border-primary/40 hover:bg-muted transition-all"
        >
          <Eye className="w-4 h-4" />
          View Public Guild Page
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Tabs */}
        <div className="rounded-2xl border border-border bg-card shadow-sm dark:shadow-lg mb-6 overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <PillTabs
              tabs={(() => {
                const pendingCount = (guild?.guildApplications?.length || 0) + (candidateApplications?.length || 0);
                return [
                  { value: "feed" as const, label: "Feed" },
                  {
                    value: "membershipApplications" as const,
                    label: (
                      <>
                        Pending Reviews
                        {pendingCount > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary border border-primary/30 text-xs font-semibold rounded-full">
                            {pendingCount}
                          </span>
                        )}
                      </>
                    ),
                  },
                  { value: "jobs" as const, label: "Jobs" },
                  { value: "activity" as const, label: "Activity" },
                  { value: "earnings" as const, label: "Earnings" },
                  { value: "members" as const, label: "Members" },
                  { value: "leaderboard" as const, label: "Leaderboard" },
                ];
              })()}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          <div className="p-6">
            {activeTab === "feed" && (
              <GuildFeedTab
                guildId={guildId}
                isMember={true}
                membershipRole={guild.expertRole as ExpertRole}
                userType="expert"
              />
            )}

            {activeTab === "activity" && (
              <GuildActivityFeed activities={guild.recentActivity || []} />
            )}

            {activeTab === "members" && (
              <GuildMembersTab
                experts={guild.experts || []}
                candidates={guild.candidates || []}
                expertsCount={guild.experts?.length || expertCountFallback}
                candidatesCount={guild.candidates?.length || guild.candidateCount || 0}
              />
            )}

            {activeTab === "jobs" && (
              <GuildJobsTab
                jobs={guild.recentJobs || []}
                jobsCount={guild.openPositions || guild.recentJobs?.length || 0}
                guildId={guildId}
                guildName={guild.name}
                applications={guild.applications || []}
                onEndorseCandidate={handleEndorseCandidate}
              />
            )}

            {activeTab === "leaderboard" && (
              <GuildLeaderboardTab
                leaderboardData={leaderboardData}
                leaderboardPeriod={leaderboardPeriod}
                onPeriodChange={setLeaderboardPeriod}
              />
            )}

            {activeTab === "membershipApplications" && (
              <GuildMembershipApplicationsTab
                guildId={guildId}
                guildName={guild.name}
                guildApplications={guild.guildApplications}
                candidateApplications={candidateApplications}
                onReviewApplication={handleReviewApplication}
                onReviewCandidateApplication={handleReviewCandidateApplication}
                isStaked={!!stakingStatus?.meetsMinimum}
                onStakeClick={() => setShowVetdStakingModal(true)}
              />
            )}

            {activeTab === "earnings" && (
              <GuildEarningsTab earnings={guild.earnings} />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <StakeModal
        isOpen={showStakeModal}
        onClose={() => setShowStakeModal(false)}
        application={selectedApplication}
        stakeAmount={stakeAmount}
        onStakeAmountChange={setStakeAmount}
        onConfirmStake={handleConfirmStake}
        isStaking={isStaking}
      />

      <ReviewGuildApplicationModal
        isOpen={showReviewModal}
        onClose={handleReviewModalClose}
        application={selectedExpertMembershipApplication}
        guildId={guildId}
        onSubmitReview={handleSubmitReview}
        isReviewing={isReviewing}
      />

      <StakingModal
        isOpen={showVetdStakingModal}
        onClose={() => setShowVetdStakingModal(false)}
        onSuccess={() => fetchGuildDetails()}
        preselectedGuildId={guildId}
      />
      </div>
    </div>
  );
}
