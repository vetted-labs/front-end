"use client";

import { useState, useEffect } from "react";
import { ExpertNavbar } from "@/components/ExpertNavbar";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Briefcase, Coins, Trophy, UserPlus, Activity, Users, Eye, Loader2 } from "lucide-react";
import { LoadingState } from "./ui/loadingstate";
import { Alert } from "./ui/alert";
import { useRouter, useSearchParams } from "next/navigation";
import { expertApi, guildsApi } from "@/lib/api";
import { GuildHeader } from "./guild/GuildHeader";
// GuildProposalsTab removed - merged into Membership Reviews
import { GuildLeaderboardTab } from "./guild/GuildLeaderboardTab";
import { GuildMembershipApplicationsTab } from "./guild/GuildMembershipApplicationsTab";
import { GuildEarningsTab } from "./guild/GuildEarningsTab";
import { GuildActivityTab } from "./guild/GuildActivityTab";
import { GuildMembersTab } from "./guild/GuildMembersTab";
import { GuildJobsTab } from "./guild/GuildJobsTab";
import { StakeModal } from "./guild/StakeModal";
import { ReviewGuildApplicationModal } from "./guild/ReviewGuildApplicationModal";
import { StakingModal } from "./dashboard/StakingModal";

interface Proposal {
  id: string;
  candidateName: string;
  candidateEmail: string;
  submittedAt: string;
  status: "pending" | "ongoing" | "closed";
  requiredStake: number;
  participantCount: number;
  votesFor: number;
  votesAgainst: number;
  expertHasStaked: boolean;
}

interface JobApplication {
  id: string;
  jobTitle: string;
  candidateName: string;
  candidateEmail: string;
  appliedAt: string;
  matchScore: number;
  reviewedByRecruiter: boolean;
  endorsementCount: number;
  applicationSummary: string;
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

interface GuildApplication {
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
  type: "proposal_submitted" | "candidate_approved" | "job_posted" | "endorsement_given";
  actor: string;
  target?: string;
  timestamp: string;
  details: string;
}

interface ExpertMember {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  role: "recruit" | "apprentice" | "craftsman" | "officer" | "master";
  reputation: number;
  expertise: string[];
  totalReviews: number;
  successRate: number;
  joinedAt: string;
}

interface CandidateMember {
  id: string;
  fullName: string;
  email: string;
  headline: string;
  experienceLevel: string;
  reputation: number;
  endorsements: number;
  joinedAt: string;
}

interface Job {
  id: string;
  title: string;
  location: string;
  type: string;
  salary: {
    min: number | null;
    max: number | null;
    currency: string;
  };
  applicants: number;
  createdAt: string;
}

interface GuildDetail {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  expertRole: string;
  reputation: number;
  proposals: {
    pending: Proposal[];
    ongoing: Proposal[];
    closed: Proposal[];
  };
  applications: JobApplication[];
  guildApplications: GuildApplication[];
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
  const [activeTab, setActiveTab] = useState<
    "activity" | "members" | "jobs" | "leaderboard" | "membershipApplications" | "earnings"
  >("members");

  // Stake modal state
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedGuildApplication, setSelectedGuildApplication] =
    useState<GuildApplication | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [autoOpenedReview, setAutoOpenedReview] = useState(false);
  const [applicationReviewType, setApplicationReviewType] = useState<"expert" | "candidate">("expert");

  // Candidate applications state
  const [candidateApplications, setCandidateApplications] = useState<any[]>([]);

  // VETD Staking modal state
  const [showVetdStakingModal, setShowVetdStakingModal] = useState(false);

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState<{
    topExperts: LeaderboardExpert[];
    currentUser: LeaderboardExpert | null;
  }>({ topExperts: [], currentUser: null });
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"all" | "month" | "week">("all");

  useEffect(() => {
    if (isConnected && address) {
      fetchGuildDetails();
    }
  }, [guildId, isConnected, address]);

  useEffect(() => {
    if (isConnected && address && activeTab === "leaderboard" && guild && leaderboardData.topExperts.length === 0) {
      fetchLeaderboard();
    }
  }, [activeTab, guildId, isConnected, address, guild]);
  // Note: leaderboardPeriod removed - backend doesn't support period filtering yet

  const fetchGuildDetails = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const result: any = await expertApi.getGuildDetails(guildId, address);
      const data = result.data || result;
      const normalized = {
        ...data,
        experts: Array.isArray(data.experts) ? data.experts : [],
        candidates: Array.isArray(data.candidates) ? data.candidates : [],
        recentJobs: Array.isArray(data.recentJobs) ? data.recentJobs : [],
      };

      const needsPublicFallback =
        normalized.experts.length === 0 ||
        normalized.candidates.length === 0 ||
        normalized.recentJobs.length === 0;

      if (needsPublicFallback) {
        try {
          const publicResult: any = await guildsApi.getPublicDetail(guildId);
          const publicData = publicResult.data || publicResult;

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
          console.warn("Public guild fallback failed:", publicError);
        }
      }
      console.log("Guild details received:", data);
      console.log("Experts count:", data.experts?.length || 0);
      console.log("Candidates count:", data.candidates?.length || 0);
      setGuild(normalized);

      // Fetch candidate guild applications
      try {
        const candidateAppsResult: any = await guildsApi.getCandidateApplications(guildId, address);
        const candidateApps = candidateAppsResult?.data || candidateAppsResult || [];
        setCandidateApplications(Array.isArray(candidateApps) ? candidateApps : []);
      } catch (candidateErr) {
        console.warn("Failed to fetch candidate applications:", candidateErr);
        setCandidateApplications([]);
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
      setSelectedGuildApplication(target);
      setShowReviewModal(true);
      setAutoOpenedReview(true);
    }
  }, [guild, autoOpenedReview, searchParams]);

  const fetchLeaderboard = async () => {
    if (!address) return;

    try {
      // Call real API with guildId parameter
      const result: any = await expertApi.getLeaderboard({
        guildId: guildId,
        limit: 50
      });

      const leaderboardEntries = result.data || [];

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
    }
  };

  const handleStakeOnProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setStakeAmount(proposal.requiredStake.toString());
    setShowStakeModal(true);
  };

  const handleConfirmStake = async () => {
    if (!selectedProposal || !address) return;

    setIsStaking(true);

    try {
      await expertApi.stakeOnProposal(selectedProposal.id, {
        walletAddress: address,
        stakeAmount: parseFloat(stakeAmount),
      });

      setShowStakeModal(false);
      setSelectedProposal(null);
      fetchGuildDetails();
    } catch (err: any) {
      setError(err.message || "Failed to stake on proposal");
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

  const handleReviewApplication = (application: GuildApplication) => {
    setSelectedGuildApplication(application);
    setApplicationReviewType("expert");
    setShowReviewModal(true);
  };

  const handleReviewCandidateApplication = (candidateApp: any) => {
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

    const mapped: GuildApplication = {
      id: candidateApp.id,
      fullName: candidateApp.candidateName,
      email: candidateApp.candidateEmail,
      walletAddress: "",
      linkedinUrl: "",
      resumeUrl: candidateApp.resumeUrl || undefined,
      expertiseLevel: candidateApp.expertiseLevel || "entry",
      yearsOfExperience: 0,
      currentTitle: candidateApp.jobTitle ? `Applying for: ${candidateApp.jobTitle}` : "Candidate",
      currentCompany: "",
      bio: "",
      motivation: "",
      expertiseAreas: [],
      appliedAt: candidateApp.submittedAt,
      reviewCount: candidateApp.reviewCount || 0,
      approvalCount: candidateApp.approvalCount || 0,
      rejectionCount: candidateApp.rejectionCount || 0,
      applicationResponses: structuredResponses,
    };
    setSelectedGuildApplication(mapped);
    setApplicationReviewType("candidate");
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (payload: {
    feedback?: string;
    criteriaScores: Record<string, any>;
    criteriaJustifications: Record<string, any>;
    overallScore: number;
    redFlagDeductions: number;
  }) => {
    if (!selectedGuildApplication || !address) return;

    setIsReviewing(true);

    try {
      const reviewData = {
        walletAddress: address,
        wallet: address,
        feedback: payload.feedback || undefined,
        criteriaScores: payload.criteriaScores,
        criteriaJustifications: payload.criteriaJustifications,
        overallScore: payload.overallScore,
        redFlagDeductions: payload.redFlagDeductions,
      };

      const response: any = applicationReviewType === "candidate"
        ? await guildsApi.reviewCandidateApplication(selectedGuildApplication.id, reviewData)
        : await expertApi.reviewGuildApplication(selectedGuildApplication.id, reviewData);

      setShowReviewModal(false);
      setSelectedGuildApplication(null);
      toast.success(response?.data?.message || "Review submitted. Thanks for voting.");
      fetchGuildDetails();
    } catch (err: any) {
      setError(err.message || "Failed to submit review");
      toast.error(err.message || "Failed to submit review");
    } finally {
      setIsReviewing(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading guild details..." />;
  }

  if (error || !guild) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Alert variant="error">{error || "Failed to load guild details"}</Alert>
      </div>
    );
  }

  const expertCountFallback = Math.max(
    0,
    (guild.memberCount || 0) - (guild.candidateCount || 0)
  );

  return (
    <div className="relative min-h-screen bg-[#07080c] text-slate-100 overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_55%)]" />
        <div className="absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-orange-500/15 blur-3xl" />
        <div className="absolute top-1/3 left-[-15%] h-96 w-96 rounded-full bg-amber-500/12 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#07080c] via-transparent to-transparent" />
      </div>

      <div className="relative z-10">
        <ExpertNavbar />

        <GuildHeader guild={guild} onStakeClick={() => setShowVetdStakingModal(true)} />

      {/* Navigation Link to Public View */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => router.push(`/guilds/${guildId}`)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-200 bg-white/5 border border-white/10 rounded-lg hover:border-orange-400/40 hover:bg-white/10 transition-all"
        >
          <Eye className="w-4 h-4" />
          View Public Guild Page
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Tabs */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_60px_rgba(0,0,0,0.55)] mb-6 overflow-hidden">
          <div className="flex border-b border-white/10 overflow-x-auto">
            <button
              onClick={() => setActiveTab("activity")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "activity"
                  ? "text-amber-200 border-b-2 border-amber-400 bg-white/5"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Activity
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "members"
                  ? "text-amber-200 border-b-2 border-amber-400 bg-white/5"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Members
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "jobs"
                  ? "text-amber-200 border-b-2 border-amber-400 bg-white/5"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Briefcase className="w-4 h-4 inline mr-2" />
              Jobs
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "leaderboard"
                  ? "text-amber-200 border-b-2 border-amber-400 bg-white/5"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Trophy className="w-4 h-4 inline mr-2" />
              Leaderboard
            </button>
            <button
              onClick={() => setActiveTab("membershipApplications")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "membershipApplications"
                  ? "text-amber-200 border-b-2 border-amber-400 bg-white/5"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Membership Reviews
              {(() => {
                const expertCount = guild?.guildApplications?.length || 0;
                const candidateCount = candidateApplications?.length || 0;
                const total = expertCount + candidateCount;
                return total > 0 ? (
                  <span className="ml-2 px-2 py-0.5 bg-orange-500/20 text-amber-200 border border-orange-400/40 text-xs font-semibold rounded-full">
                    {total}
                  </span>
                ) : null;
              })()}
            </button>
            <button
              onClick={() => setActiveTab("earnings")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "earnings"
                  ? "text-amber-200 border-b-2 border-amber-400 bg-white/5"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Coins className="w-4 h-4 inline mr-2" />
              Earnings
            </button>
          </div>

          <div className="p-6">
            {activeTab === "activity" && (
              <GuildActivityTab activities={guild.recentActivity || []} />
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
        proposal={selectedProposal}
        stakeAmount={stakeAmount}
        onStakeAmountChange={setStakeAmount}
        onConfirmStake={handleConfirmStake}
        isStaking={isStaking}
      />

      <ReviewGuildApplicationModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        application={selectedGuildApplication}
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
