"use client";

import { useState, useEffect } from "react";

import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Eye } from "lucide-react";
import { Alert } from "./ui/alert";
import { PillTabs } from "./ui/pill-tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { expertApi, guildsApi, blockchainApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
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
const ViewReviewModal = dynamic(
  () => import("./expert/applications/ViewReviewModal").then(m => ({ default: m.ViewReviewModal })),
  { ssr: false }
);
import { mapCandidateToReviewApplication } from "@/lib/reviewHelpers";
import type { Job, GuildApplicationSummary, GuildJobApplication, ExpertMember, CandidateMember, ExpertRole, ExpertGuildDetail, LeaderboardEntry, ExpertMembershipApplication, CandidateGuildApplication } from "@/types";

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

// ExpertMembershipApplication imported from @/types

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

// CandidateGuildApplication imported from @/types — used as CandidateApplicationForReview
type CandidateApplicationForReview = CandidateGuildApplication;

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

  // View review modal state
  const [showViewReview, setShowViewReview] = useState(false);
  const [viewReviewAppId, setViewReviewAppId] = useState<string | null>(null);
  const [viewReviewApplicantName, setViewReviewApplicantName] = useState("");
  const [viewReviewType, setViewReviewType] = useState<"expert" | "candidate">("expert");

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

  const fetchGuildData = async (walletAddress: string) => {
    const data = await expertApi.getGuildDetails(guildId, walletAddress);
    // Find the current user's expert entry to extract personal stats
    const currentExpert = Array.isArray(data.experts)
      ? data.experts.find((e: ExpertMember) => e.walletAddress?.toLowerCase() === walletAddress.toLowerCase())
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

    return { normalized, bcGuildId: normalized.blockchainGuildId || data.blockchainGuildId };
  };

  const { isLoading, error, refetch } = useFetch(
    async () => {
      if (!address) throw new Error("No wallet address");

      const { normalized, bcGuildId } = await fetchGuildData(address);
      setGuild(normalized);

      // Store blockchain guild ID for staking checks
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
      } catch {
        setCandidateApplications([]);
        toast.warning("Could not load candidate applications");
      }

      return normalized;
    },
    {
      skip: !isConnected || !address,
      onError: (message) => {
        toast.error(message);
      },
    }
  );

  // Refetch when guildId or address changes
  useEffect(() => {
    if (isConnected && address) {
      refetch();
    }
  }, [guildId, address]);

  useEffect(() => {
    if (isConnected && address && activeTab === "leaderboard" && guild &&
        leaderboardData.topExperts.length === 0 && !isLoadingLeaderboard) {
      fetchLeaderboard();
    }
  }, [activeTab, guildId, isConnected, address, guild]);
  // Note: leaderboardPeriod removed - backend doesn't support period filtering yet

  useEffect(() => {
    if (!guild || autoOpenedReview) return;
    const applicationId = searchParams?.get("applicationId");
    if (!applicationId) return;

    // Always navigate to the membership applications tab
    setActiveTab("membershipApplications");
    setAutoOpenedReview(true);

    // Only auto-open the review modal if the expert has staked
    if (stakingStatus?.meetsMinimum) {
      const target = guild.guildApplications?.find((app) => app.id === applicationId);
      if (target) {
        setSelectedExpertMembershipApplication(target);
        setShowReviewModal(true);
      }
    }
  }, [guild, autoOpenedReview, searchParams, stakingStatus]);

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
      refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to stake on application";
      toast.error(message);
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

      refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to endorse candidate";
      toast.error(message);
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
    const mapped = mapCandidateToReviewApplication(candidateApp);
    setSelectedExpertMembershipApplication(mapped);
    setApplicationReviewType("candidate");
    setShowReviewModal(true);
  };

  const handleViewExpertReview = (application: ExpertMembershipApplication) => {
    setViewReviewAppId(application.id);
    setViewReviewApplicantName(application.fullName);
    setViewReviewType("expert");
    setShowViewReview(true);
  };

  const handleViewCandidateReview = (candidateApp: CandidateApplicationForReview) => {
    setViewReviewAppId(candidateApp.id);
    setViewReviewApplicantName(candidateApp.candidateName);
    setViewReviewType("candidate");
    setShowViewReview(true);
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

      refetch();
      setTimeout(() => refetch(), 3000);

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

  if (isLoading && !guild) {
    return null;
  }

  if (error && !guild) {
    return (
      <div className="flex items-center justify-center px-4">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  if (!guild) {
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
                onViewExpertReview={handleViewExpertReview}
                onReviewCandidateApplication={handleReviewCandidateApplication}
                onViewCandidateReview={handleViewCandidateReview}
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
        onSuccess={() => refetch()}
        preselectedGuildId={guildId}
      />

      <ViewReviewModal
        isOpen={showViewReview}
        onClose={() => setShowViewReview(false)}
        applicationId={viewReviewAppId}
        applicantName={viewReviewApplicantName}
        reviewType={viewReviewType}
        walletAddress={address || ""}
      />
      </div>
    </div>
  );
}
