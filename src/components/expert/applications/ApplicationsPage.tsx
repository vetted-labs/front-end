"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { expertApi, guildsApi, guildApplicationsApi, extractApiError } from "@/lib/api";
import { mapCandidateToReviewApplication, mapProposalToReviewApplication } from "@/lib/reviewHelpers";
import { useApplicationsData } from "@/lib/hooks/useApplicationsData";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { Button } from "@/components/ui/button";
import { ArrowRight, Coins, Shield } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FirstTimeReviewerGuide } from "@/components/expert/FirstTimeReviewerGuide";
import { ViewReviewModal } from "./ViewReviewModal";
import { ApplicationsStatsRow } from "./ApplicationsStatsRow";
import { ApplicationsFilters } from "./ApplicationsFilters";
import { ApplicationsCardList } from "./ApplicationsCardList";
import type {
  ApplicationsTabType,
  ExpertMembershipApplication,
  CandidateGuildApplication,
  GuildApplication,
  ReviewSubmitPayload,
  ReviewSubmitResponse,
  ExpertCRPhaseStatus,
} from "@/types";

const ReviewGuildApplicationModal = dynamic(
  () => import("@/components/guild/ReviewGuildApplicationModal").then(m => ({ default: m.ReviewGuildApplicationModal })),
  { ssr: false },
);

const ALL_GUILDS = { id: "all", name: "All Guilds" } as const;

export default function ApplicationsPage() {
  const router = useRouter();
  const data = useApplicationsData();

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewApp, setSelectedReviewApp] = useState<ExpertMembershipApplication | null>(null);
  const [reviewType, setReviewType] = useState<"expert" | "candidate" | "proposal">("expert");
  const [reviewProposalContext, setReviewProposalContext] = useState<{ requiredStake: number } | undefined>();
  const [isReviewing, setIsReviewing] = useState(false);

  // View review modal state
  const [showViewReview, setShowViewReview] = useState(false);
  const [viewReviewAppId, setViewReviewAppId] = useState<string | null>(null);
  const [viewReviewApplicantName, setViewReviewApplicantName] = useState("");
  const [viewReviewType, setViewReviewType] = useState<"expert" | "candidate">("expert");

  // Commit-reveal state
  const [crPhaseStatus, setCrPhaseStatus] = useState<ExpertCRPhaseStatus | null>(null);

  // Handlers
  const handleReviewExpert = async (application: ExpertMembershipApplication) => {
    if (!data.isStakedInGuild(application.guildId)) {
      toast.info("You need to stake VETD tokens in this guild to unlock reviewing.");
      return;
    }

    try {
      const phaseStatus = await expertApi.expertCommitReveal.getPhaseStatus(application.id);
      setCrPhaseStatus(phaseStatus);
    } catch {
      setCrPhaseStatus(null);
    }

    setSelectedReviewApp(application);
    setReviewType("expert");
    setShowReviewModal(true);
  };

  const handleReviewCandidate = (candidateApp: CandidateGuildApplication) => {
    if (candidateApp.expertHasReviewed) return;
    if (!data.isStakedInGuild(candidateApp.guildId)) {
      toast.info("You need to stake VETD tokens in this guild to unlock reviewing.");
      return;
    }
    const mapped = mapCandidateToReviewApplication(candidateApp);
    setSelectedReviewApp(mapped);
    setReviewType("candidate");
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

  const handleReviewProposal = (proposal: GuildApplication) => {
    if (!data.isStakedInGuild(proposal.guild_id)) {
      toast.info("You need to stake VETD tokens in this guild to vote.");
      return;
    }
    const mapped = mapProposalToReviewApplication(proposal);
    setSelectedReviewApp(mapped);
    setReviewType("proposal");
    setReviewProposalContext({ requiredStake: proposal.required_stake });
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (payload: ReviewSubmitPayload): Promise<ReviewSubmitResponse | void> => {
    if (!selectedReviewApp || !data.address) return;

    setIsReviewing(true);
    try {
      if (reviewType === "proposal") {
        if (!data.expertData) throw new Error("Expert data not loaded");

        const scores = payload.criteriaScores as { overallMax?: number; overallScore?: number };
        const overallMax = (scores.overallMax as number) || 1;
        const normalizedScore = Math.round((payload.overallScore / overallMax) * 100);

        await guildApplicationsApi.vote(selectedReviewApp.id, {
          expertId: data.expertData.id,
          score: normalizedScore,
          stakeAmount: payload.stakeAmount ?? 0,
          comment: payload.feedback,
          criteriaScores: payload.criteriaScores,
          criteriaJustifications: payload.criteriaJustifications,
          overallScore: payload.overallScore,
          redFlagDeductions: payload.redFlagDeductions,
        });

        data.refetchProposals();
        return { message: "Your vote has been recorded with structured review data." };
      }

      const scores = payload.criteriaScores as { overallMax?: number; overallScore?: number };
      const overallMax = (scores?.overallMax as number) || 1;
      const normalizedScore = Math.round((payload.overallScore / overallMax) * 100);

      const reviewData = {
        walletAddress: data.address,
        score: normalizedScore,
        feedback: payload.feedback || undefined,
        criteriaScores: payload.criteriaScores,
        criteriaJustifications: payload.criteriaJustifications,
        overallScore: payload.overallScore,
        redFlagDeductions: payload.redFlagDeductions,
      };

      const response = reviewType === "candidate"
        ? await guildsApi.reviewCandidateApplication(selectedReviewApp.id, reviewData)
        : await expertApi.reviewGuildApplication(selectedReviewApp.id, reviewData);

      data.refetchExpertApps();
      data.refetchCandidateApps();
      data.refetchHistoryCandidateApps();

      if (reviewType === "candidate" && selectedReviewApp) {
        data.markCandidateReviewed(selectedReviewApp.id);
      }

      return response;
    } catch (err: unknown) {
      toast.error(extractApiError(err, "Failed to submit review"));
      throw err;
    } finally {
      setIsReviewing(false);
    }
  };

  if (!data.address) {
    return (
      <div className="flex items-center justify-center py-20">
        <WalletRequiredState message="Connect your wallet to access reviews" />
      </div>
    );
  }

  const pendingCounts = {
    expert: data.expertApps.filter((a) => !a.expertHasReviewed).length,
    candidate: data.candidateApps.filter((a) => !a.expertHasReviewed).length,
    proposals: data.proposals.filter((p) => p.is_assigned_reviewer && !p.has_voted).length,
    history: data.historyCount,
  };

  const handleTabChange = (tab: ApplicationsTabType) => {
    data.setActiveTab(tab);
    data.resetPage();
  };

  const handleGuildChange = (guildId: string) => {
    if (guildId === "all") {
      data.setSelectedGuild(ALL_GUILDS);
    } else {
      const guild = data.guildRecords.find((g) => g.id === guildId);
      if (guild) data.setSelectedGuild(guild);
    }
  };

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <Breadcrumb items={[
          { label: "Dashboard", href: "/expert/dashboard" },
          { label: "Applications" },
        ]} />
        {/* Header + Stats merged card */}
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="px-6 py-5">
            <h1 className="text-xl font-bold tracking-tight">Reviews</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review applications, vote on proposals, and track your review history.
            </p>
          </div>
          <div className="border-t border-border" />
          <ApplicationsStatsRow
            pendingReviews={data.pendingReviews}
            proposalsToVote={data.proposalsToVote}
            completedReviews={data.historyCount}
            guildsActive={data.guildRecords.length}
          />
        </div>

        {/* Onboarding guide for first-time reviewers */}
        <FirstTimeReviewerGuide />

        {/* Staking Warning */}
        {data.guildStakes && !data.hasAnyStake && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground mb-1">
                  Stake VETD to Start Reviewing
                </h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  To review applications and vote on proposals, you need to stake VETD tokens in at least one guild. Your stake will be returned after reviews, with bonus rewards if you vote with the majority.
                </p>
                <Button onClick={() => router.push("/expert/withdrawals")}>
                  <Coins className="w-4 h-4 mr-2" />
                  Stake VETD Tokens
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs + Filters */}
        <ApplicationsFilters
          activeTab={data.activeTab}
          onTabChange={handleTabChange}
          selectedGuildId={data.selectedGuild.id}
          onGuildChange={handleGuildChange}
          guilds={data.guildRecords}
          filterMode={data.filterMode}
          onFilterModeChange={data.setFilterMode}
          pendingCounts={pendingCounts}
        />

        {/* Content */}
        <ApplicationsCardList
          activeTab={data.activeTab}
          filterMode={data.filterMode}
          isLoading={data.isLoading}
          isAllGuilds={data.isAllGuilds}
          selectedGuildName={data.selectedGuild.name}
          paginatedItems={data.paginatedItems}
          historyList={data.historyList}
          totalItemCount={data.activeItems.length}
          currentPage={data.currentPage}
          totalPages={data.totalPages}
          onPageChange={data.setCurrentPage}
          onReviewExpert={handleReviewExpert}
          onViewExpertReview={handleViewExpertReview}
          onReviewCandidate={handleReviewCandidate}
          onViewCandidateReview={handleViewCandidateReview}
          onReviewProposal={handleReviewProposal}
          isStakedInGuild={data.isStakedInGuild}
        />
      </div>

      {/* Review Modal */}
      <ReviewGuildApplicationModal
        isOpen={showReviewModal}
        onClose={() => { setShowReviewModal(false); setSelectedReviewApp(null); setReviewProposalContext(undefined); setCrPhaseStatus(null); data.refetchExpertApps(); }}
        application={selectedReviewApp}
        guildId={selectedReviewApp?.guildId || data.selectedGuild.id}
        onSubmitReview={handleSubmitReview}
        isReviewing={isReviewing}
        proposalContext={reviewType === "proposal" ? reviewProposalContext : undefined}
        commitRevealPhase={reviewType === "expert" ? crPhaseStatus?.votingPhase : undefined}
        blockchainSessionId={reviewType === "expert" ? crPhaseStatus?.blockchainSessionId : undefined}
        blockchainSessionCreated={reviewType === "expert" ? crPhaseStatus?.blockchainSessionCreated : undefined}
        reviewerId={data.expertData?.id}
        reviewType={reviewType}
      />

      {/* View Review Modal (read-only) */}
      <ViewReviewModal
        isOpen={showViewReview}
        onClose={() => { setShowViewReview(false); setViewReviewAppId(null); }}
        applicationId={viewReviewAppId}
        applicantName={viewReviewApplicantName}
        reviewType={viewReviewType}
        walletAddress={data.address as string}
        expertId={data.expertData?.id}
      />

    </div>
  );
}
