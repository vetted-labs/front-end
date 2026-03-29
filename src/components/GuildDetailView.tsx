"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { Alert } from "./ui/alert";
import { PillTabs } from "./ui/pill-tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { expertApi, guildsApi, blockchainApi, extractApiError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { Breadcrumb } from "./ui/breadcrumb";
import { GuildHeader } from "./guild/GuildHeader";
import { GuildLeaderboardTab } from "./guild/GuildLeaderboardTab";
import { GuildMembershipApplicationsTab } from "./guild/GuildMembershipApplicationsTab";
import { GuildEarningsTab } from "./guild/GuildEarningsTab";
import { GuildActivityFeed } from "./guild/GuildActivityTab";
import { GuildMembersTab } from "./guild/GuildMembersTab";
import { GuildJobsTab } from "./guild/GuildJobsTab";
import { GuildFeedTab } from "./guild/GuildFeedTab";
import { StakeModal } from "./guild/StakeModal";
import dynamic from "next/dynamic";
import { mapCandidateToReviewApplication } from "@/lib/reviewHelpers";
import { fetchAndNormalizeGuildData, transformLeaderboardData } from "@/lib/guildDetailHelpers";
import type {
  GuildDetailData, GuildDetailTab, GuildApplicationSummary, LeaderboardExpert,
  LeaderboardEntry, ExpertMembershipApplication, CandidateGuildApplication, ExpertRole, ExpertCRPhaseStatus,
} from "@/types";
import { GUILD_DETAIL_TABS } from "@/types";
import { GuildDetailSkeleton } from "@/components/ui/page-skeleton";

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

interface GuildDetailViewProps {
  guildId: string;
}

export function GuildDetailView({ guildId }: GuildDetailViewProps) {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [guild, setGuild] = useState<GuildDetailData | null>(null);
  const initialTab = ((): GuildDetailTab => {
    const tabParam = searchParams?.get("tab");
    if (tabParam && (GUILD_DETAIL_TABS as readonly string[]).includes(tabParam)) return tabParam as GuildDetailTab;
    if (searchParams?.get("applicationId")) return "membershipApplications";
    return "feed";
  })();
  const [activeTab, setActiveTab] = useState<GuildDetailTab>(initialTab);

  // Stake modal
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<GuildApplicationSummary | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedExpertMembershipApplication, setSelectedExpertMembershipApplication] =
    useState<ExpertMembershipApplication | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [autoOpenedReview, setAutoOpenedReview] = useState(false);
  const [applicationReviewType, setApplicationReviewType] = useState<"expert" | "candidate">("expert");
  // View review modal
  const [showViewReview, setShowViewReview] = useState(false);
  const [viewReviewAppId, setViewReviewAppId] = useState<string | null>(null);
  const [viewReviewApplicantName, setViewReviewApplicantName] = useState("");
  const [viewReviewType, setViewReviewType] = useState<"expert" | "candidate">("expert");
  // Data & staking
  const [candidateApplications, setCandidateApplications] = useState<CandidateGuildApplication[]>([]);
  const [showVetdStakingModal, setShowVetdStakingModal] = useState(false);
  const [stakingStatus, setStakingStatus] = useState<{ meetsMinimum: boolean } | null>(null);
  const [crPhaseStatus, setCrPhaseStatus] = useState<ExpertCRPhaseStatus | null>(null);
  const [currentExpertId, setCurrentExpertId] = useState<string | null>(null);
  // Leaderboard
  const [leaderboardData, setLeaderboardData] = useState<{
    topExperts: LeaderboardExpert[]; currentUser: LeaderboardExpert | null;
  }>({ topExperts: [], currentUser: null });
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"all" | "month" | "week">("all");
  const { execute: executeLeaderboard, isLoading: isLoadingLeaderboard } = useApi();
  const { execute: executeStake, isLoading: isStaking } = useApi();

  const { isLoading, error, refetch } = useFetch(
    async () => {
      if (!address) throw new Error("No wallet address");

      const { guild: normalized, blockchainGuildId: bcGuildId, currentExpertId: expertId } =
        await fetchAndNormalizeGuildData(guildId, address);
      setGuild(normalized);
      if (expertId) setCurrentExpertId(expertId);

      // Fetch staking status
      try {
        if (!bcGuildId) throw new Error("Guild has no blockchain ID configured");
        const stakeData = await blockchainApi.getStakeBalance(address, bcGuildId);
        const meetsMin = !!stakeData?.meetsMinimum
          || (!!stakeData?.stakedAmount && parseFloat(stakeData.stakedAmount) > 0);
        setStakingStatus({ meetsMinimum: meetsMin });
      } catch (err) {
        logger.warn("Primary staking check failed, trying fallback", err);
        try {
          const guildStakes = await blockchainApi.getExpertGuildStakes(address);
          const thisGuildStake = Array.isArray(guildStakes)
            ? guildStakes.find(s => s.guildId === guildId)
            : null;
          if (thisGuildStake && parseFloat(thisGuildStake.stakedAmount || "0") > 0) {
            setStakingStatus({ meetsMinimum: true });
          } else {
            setStakingStatus({ meetsMinimum: false });
            toast.warning("Could not verify staking status from blockchain");
          }
        } catch {
          setStakingStatus({ meetsMinimum: false });
          toast.warning("Could not load staking status");
        }
      }

      // Fetch candidate guild applications
      try {
        const candidateApps = await guildsApi.getCandidateApplications(guildId, address) as CandidateGuildApplication[] ?? [];
        setCandidateApplications(Array.isArray(candidateApps) ? candidateApps : []);
      } catch {
        setCandidateApplications([]);
        toast.warning("Could not load candidate applications");
      }

      return normalized;
    },
    {
      skip: !isConnected || !address,
      onError: (message) => { toast.error(message); },
    }
  );

  // eslint-disable-next-line no-restricted-syntax -- refetch when guildId or address changes (runtime deps)
  useEffect(() => {
    if (isConnected && address) refetch();
  }, [guildId, address]);

  // eslint-disable-next-line no-restricted-syntax -- lazy-load leaderboard when tab becomes active
  useEffect(() => {
    if (isConnected && address && activeTab === "leaderboard" && guild &&
        leaderboardData.topExperts.length === 0 && !isLoadingLeaderboard) {
      fetchLeaderboard();
    }
  }, [activeTab, guildId, isConnected, address, guild]);

  // eslint-disable-next-line no-restricted-syntax -- auto-open review from URL param after data loads
  useEffect(() => {
    if (!guild || autoOpenedReview) return;
    const applicationId = searchParams?.get("applicationId");
    if (!applicationId) return;
    setActiveTab("membershipApplications");
    setAutoOpenedReview(true);
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
    await executeLeaderboard(
      () => expertApi.getLeaderboard({ guildId, limit: 50 }),
      {
        onSuccess: (result) => {
          const entries: LeaderboardEntry[] = Array.isArray(result) ? result : [];
          const transformed = transformLeaderboardData(entries, address, {
            expertRole: guild?.expertRole || "recruit",
            reputation: guild?.reputation || 0,
            totalEndorsementEarnings: guild?.earnings?.totalEndorsementEarnings || 0,
          });
          setLeaderboardData(transformed);
        },
        onError: (errorMsg) => {
          toast.error(`Failed to fetch leaderboard: ${errorMsg}`);
        },
      }
    );
  };

  const handleConfirmStake = async () => {
    if (!selectedApplication || !address) return;
    await executeStake(
      () => expertApi.stakeOnApplication(selectedApplication.id, {
        walletAddress: address,
        stakeAmount: parseFloat(stakeAmount),
      }),
      {
        onSuccess: () => {
          setShowStakeModal(false);
          setSelectedApplication(null);
          refetch();
        },
        onError: (errorMsg) => {
          toast.error(errorMsg || "Failed to stake on application");
        },
      }
    );
  };

  const handleEndorseCandidate = async (applicationId: string, endorse: boolean) => {
    if (!address) return;
    try {
      await expertApi.endorseApplication(applicationId, { walletAddress: address, endorse });
      refetch();
    } catch (err: unknown) {
      toast.error(extractApiError(err, "Failed to endorse candidate"));
    }
  };

  const handleReviewApplication = async (application: ExpertMembershipApplication) => {
    if (!stakingStatus?.meetsMinimum) {
      toast.info("You need to stake VETD tokens first to unlock reviewing.");
      return;
    }
    try {
      const phaseStatus = await expertApi.expertCommitReveal.getPhaseStatus(application.id);
      setCrPhaseStatus(phaseStatus);
    } catch (err) {
      logger.warn("Commit-reveal status unavailable, falling back to direct voting", err);
      setCrPhaseStatus(null);
    }
    setSelectedExpertMembershipApplication(application);
    setApplicationReviewType("expert");
    setShowReviewModal(true);
  };

  const handleReviewCandidateApplication = (candidateApp: CandidateGuildApplication) => {
    if (!stakingStatus?.meetsMinimum) {
      toast.info("You need to stake VETD tokens first to unlock reviewing.");
      return;
    }
    setSelectedExpertMembershipApplication(mapCandidateToReviewApplication(candidateApp));
    setApplicationReviewType("candidate");
    setShowReviewModal(true);
  };

  const handleViewExpertReview = (application: ExpertMembershipApplication) => {
    setViewReviewAppId(application.id);
    setViewReviewApplicantName(application.fullName);
    setViewReviewType("expert");
    setShowViewReview(true);
  };

  const handleViewCandidateReview = (candidateApp: CandidateGuildApplication) => {
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
      const scores = payload.criteriaScores as { overallMax?: number };
      const overallMax = (scores?.overallMax as number) || 1;
      const normalizedScore = Math.round((payload.overallScore / overallMax) * 100);

      const reviewData = {
        walletAddress: address,
        score: Math.min(100, Math.max(0, normalizedScore)),
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
      setGuild(prev => prev ? {
        ...prev,
        recentActivity: [{
          id: `temp-${Date.now()}`,
          type: "candidate_approved" as const,
          actor: "You",
          details: `Reviewed ${selectedExpertMembershipApplication?.fullName}'s application`,
          timestamp: new Date().toISOString(),
        }, ...(prev.recentActivity || [])],
      } : prev);

      // Optimistically mark application as reviewed
      if (applicationReviewType === "candidate") {
        setCandidateApplications(prev =>
          prev.map(app =>
            app.id === selectedExpertMembershipApplication.id
              ? { ...app, expertHasReviewed: true, reviewCount: app.reviewCount + 1 }
              : app
          )
        );
      } else {
        setGuild(prev => prev ? {
          ...prev,
          guildApplications: prev.guildApplications.map(app =>
            app.id === selectedExpertMembershipApplication.id
              ? { ...app, expertHasReviewed: true, reviewCount: (app.reviewCount || 0) + 1 }
              : app
          ),
        } : prev);
      }

      await refetch();
      return response;
    } catch (err: unknown) {
      toast.error(extractApiError(err, "Failed to submit review"));
      throw err;
    } finally {
      setIsReviewing(false);
    }
  };

  const handleReviewModalClose = () => {
    setShowReviewModal(false);
    setSelectedExpertMembershipApplication(null);
  };

  const handleReviewSuccess = () => {
    if (selectedExpertMembershipApplication && applicationReviewType === "expert") {
      setGuild(prev => prev ? {
        ...prev,
        guildApplications: prev.guildApplications.map(app =>
          app.id === selectedExpertMembershipApplication.id
            ? { ...app, expertHasReviewed: true, reviewCount: (app.reviewCount || 0) + 1 }
            : app
        ),
      } : prev);
    }
    refetch();
  };

  if (isLoading && !guild) return null;
  if (!guild) {
    return (
      <div className="flex items-center justify-center px-4">
        <Alert variant="error">{error || "Failed to load guild details"}</Alert>
      </div>
    );
  }

  const expertCountFallback = Math.max(0, (guild.memberCount || 0) - (guild.candidateCount || 0));
  const pendingCount = (guild.guildApplications?.length || 0) + (candidateApplications?.length || 0);

  return (
    <div className="relative min-h-screen text-foreground overflow-x-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="profile-ambient-orb profile-ambient-orb-1" />
        <div className="profile-ambient-orb profile-ambient-orb-2" />
        <div className="profile-dot-grid" />
      </div>

      <div className="relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Breadcrumb items={[
            { label: "Dashboard", href: "/expert/dashboard" },
            { label: "Guilds", href: "/expert/guilds" },
            { label: guild?.name ?? "Guild" },
          ]} />
        </div>
        <GuildHeader guild={guild} onStakeClick={() => setShowVetdStakingModal(true)} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          {/* Sticky tab bar */}
          <div className="sticky top-0 z-20 bg-background/85 border-b border-border -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-6">
            <PillTabs
              tabs={[
                { value: "feed" as const, label: "Feed" },
                {
                  value: "membershipApplications" as const,
                  label: (
                    <>
                      Pending Reviews
                      {pendingCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 font-mono text-xs font-medium rounded-full">
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
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

            <div role="tabpanel">
              {activeTab === "feed" && (
                <GuildFeedTab guildId={guildId} isMember={true} membershipRole={guild.expertRole as ExpertRole} userType="expert" />
              )}
              {activeTab === "activity" && <GuildActivityFeed activities={guild.recentActivity || []} />}
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
                <GuildLeaderboardTab leaderboardData={leaderboardData} leaderboardPeriod={leaderboardPeriod} onPeriodChange={setLeaderboardPeriod} />
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
              {activeTab === "earnings" && <GuildEarningsTab earnings={guild.earnings} />}
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
          commitRevealPhase={applicationReviewType === "expert" ? crPhaseStatus?.votingPhase : undefined}
          blockchainSessionId={applicationReviewType === "expert" ? crPhaseStatus?.blockchainSessionId : undefined}
          blockchainSessionCreated={applicationReviewType === "expert" ? crPhaseStatus?.blockchainSessionCreated : undefined}
          reviewerId={currentExpertId || undefined}
          onReviewSuccess={handleReviewSuccess}
          reviewType={applicationReviewType}
        />
        {showVetdStakingModal && (
          <StakingModal
            isOpen={showVetdStakingModal}
            onClose={() => setShowVetdStakingModal(false)}
            onSuccess={() => refetch()}
            preselectedGuildId={guildId}
          />
        )}
        <ViewReviewModal
          isOpen={showViewReview}
          onClose={() => setShowViewReview(false)}
          applicationId={viewReviewAppId}
          applicantName={viewReviewApplicantName}
          reviewType={viewReviewType}
          walletAddress={address || ""}
          expertId={currentExpertId || undefined}
        />
      </div>
    </div>
  );
}
