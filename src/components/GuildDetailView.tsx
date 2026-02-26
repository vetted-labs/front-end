"use client";

import { useState, useEffect } from "react";

import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Briefcase, Coins, Trophy, UserPlus, Activity, Users, Eye, Loader2 } from "lucide-react";
import { Alert } from "./ui/alert";
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
import type { Job, GuildApplicationSummary, GuildJobApplication, ExpertMember, CandidateMember } from "@/types";

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
  applicationResponses?: any;
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
  const validTabs = ["membershipApplications", "jobs", "activity", "earnings", "members", "leaderboard"] as const;
  type TabType = (typeof validTabs)[number];
  const initialTab = (() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam && validTabs.includes(tabParam as TabType)) return tabParam as TabType;
    if (searchParams?.get("applicationId")) return "membershipApplications" as TabType;
    return "membershipApplications" as TabType;
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
  const [candidateApplications, setCandidateApplications] = useState<any[]>([]);

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
      const data: any = await expertApi.getGuildDetails(guildId, address);
      // Find the current user's expert entry to extract personal stats
      const currentExpert = Array.isArray(data.experts)
        ? data.experts.find((e: any) => e.walletAddress?.toLowerCase() === address.toLowerCase())
        : null;

      const normalized = {
        ...data,
        experts: Array.isArray(data.experts) ? data.experts : [],
        candidates: Array.isArray(data.candidates) ? data.candidates : [],
        recentJobs: Array.isArray(data.recentJobs) ? data.recentJobs : [],
        guildApplications: Array.isArray(data.guildApplications) ? data.guildApplications : [],
        applications: Array.isArray(data.applications) ? data.applications : [],
        recentActivity: Array.isArray(data.recentActivity) ? data.recentActivity : [],
        memberCount: data.memberCount ?? data.totalMembers ?? 0,
        expertRole: data.expertRole ?? currentExpert?.role ?? "member",
        reputation: data.reputation ?? currentExpert?.reputation ?? 0,
        earnings: data.earnings ?? {
          totalPoints: currentExpert?.reputation ?? 0,
          totalEndorsementEarnings: data.statistics?.totalEarningsFromEndorsements ?? 0,
          recentEarnings: [],
        },
        totalProposalsReviewed: data.totalProposalsReviewed ?? data.statistics?.vettedProposals ?? 0,
        averageApprovalTime: data.averageApprovalTime ?? "—",
        totalVetdStaked: data.totalVetdStaked ?? data.statistics?.totalVetdStaked ?? 0,
      };

      const needsPublicFallback =
        normalized.experts.length === 0 ||
        normalized.candidates.length === 0 ||
        normalized.recentJobs.length === 0;

      if (needsPublicFallback) {
        try {
          const publicData: any = await guildsApi.getPublicDetail(guildId);

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
        } catch (publicError) {
        }
      }
      setGuild(normalized);

      // Store blockchain guild ID for staking checks
      const bcGuildId = normalized.blockchainGuildId || data.blockchainGuildId;
      if (bcGuildId) setGuildBlockchainId(bcGuildId);

      // Fetch staking status (pass guild-specific blockchain ID if available)
      try {
        const stakeData: any = await blockchainApi.getStakeBalance(address, bcGuildId || undefined);
        setStakingStatus({ meetsMinimum: !!stakeData?.meetsMinimum });
      } catch {
        setStakingStatus({ meetsMinimum: false });
        toast.warning("Could not load staking status");
      }

      // Fetch candidate guild applications
      try {
        const candidateApps: any = await guildsApi.getCandidateApplications(guildId, address) || [];
        setCandidateApplications(Array.isArray(candidateApps) ? candidateApps : []);
      } catch (candidateErr) {
        setCandidateApplications([]);
        toast.warning("Could not load candidate applications");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch guild details");
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
      const result: any = await expertApi.getLeaderboard({
        guildId: guildId,
        limit: 50
      });

      const leaderboardEntries = Array.isArray(result) ? result : [];

      // Transform backend data to frontend structure
      const topExperts: LeaderboardExpert[] = leaderboardEntries.map((entry: any, index: number) => {
        const totalReviews = entry.totalReviews || 0;
        const approvals = entry.approvals || 0;
        const accuracy = totalReviews > 0
          ? Math.round((approvals / totalReviews) * 100)
          : 0;

        return {
          id: entry.expertId,
          name: entry.fullName,
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
        (entry: any) => entry.walletAddress?.toLowerCase() === address.toLowerCase()
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
    } catch (err: any) {
      console.error("Failed to fetch leaderboard:", err);
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
    } catch (err: any) {
      setError(err.message || "Failed to stake on application");
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
    } catch (err: any) {
      setError(err.message || "Failed to endorse candidate");
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

  const handleReviewCandidateApplication = (candidateApp: any) => {
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

    const general: Record<string, any> = {};
    const domainTopics: Record<string, string> = {};

    Object.entries(flatAnswers).forEach(([key, value]) => {
      if (key.startsWith("domain.")) {
        const topicId = key.replace("domain.", "");
        domainTopics[topicId] = value as string;
      } else if (key.includes(".")) {
        const [questionId, partId] = key.split(".");
        const camelKey = generalKeyMap[questionId] || questionId;
        if (!general[camelKey]) general[camelKey] = {};
        general[camelKey][partId] = value;
      } else {
        const camelKey = generalKeyMap[key] || key;
        general[camelKey] = value;
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
    criteriaScores: Record<string, any>;
    criteriaJustifications: Record<string, any>;
    overallScore: number;
    redFlagDeductions: number;
  }): Promise<any> => {
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

      const response: any = applicationReviewType === "candidate"
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
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
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
    <div className="relative bg-background text-foreground overflow-x-hidden animate-page-enter">
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
          <div className="flex border-b border-border overflow-x-auto">
            <button
              onClick={() => setActiveTab("membershipApplications")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "membershipApplications"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Pending Reviews
              {(() => {
                const expertCount = guild?.guildApplications?.length || 0;
                const candidateCount = candidateApplications?.length || 0;
                const total = expertCount + candidateCount;
                return total > 0 ? (
                  <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary border border-primary/30 text-xs font-semibold rounded-full">
                    {total}
                  </span>
                ) : null;
              })()}
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "jobs"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="w-4 h-4 inline mr-2" />
              Jobs
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "activity"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Activity
            </button>
            <button
              onClick={() => setActiveTab("earnings")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "earnings"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Coins className="w-4 h-4 inline mr-2" />
              Earnings
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "members"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Members
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "leaderboard"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trophy className="w-4 h-4 inline mr-2" />
              Leaderboard
            </button>
          </div>

          <div className="p-6">
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
