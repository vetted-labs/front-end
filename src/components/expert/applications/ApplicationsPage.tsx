"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { expertApi, guildsApi, guildApplicationsApi, commitRevealApi, extractApiError } from "@/lib/api";
import { mapCandidateToReviewApplication, mapProposalToReviewApplication } from "@/lib/reviewHelpers";
import { useApplicationsData } from "@/lib/hooks/useApplicationsData";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";
import { readStoredE2EWalletAddress } from "@/lib/e2e-wallet-fallback";
import { STORY_LAB_REVIEW_APPLICATION_ID } from "@/components/expert/story-lab/storyLabFixtures";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { Button } from "@/components/ui/button";
import { ArrowRight, Coins, Shield } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

import { Input } from "@/components/ui/input";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { HelpLink } from "@/components/ui/HelpLink";
import { DOC_LINKS } from "@/config/docLinks";
import { ViewReviewModal } from "./ViewReviewModal";
import { ApplicationsStatsRow } from "./ApplicationsStatsRow";
import { ApplicationsFilters } from "./ApplicationsFilters";
import { ApplicationsCardList } from "./ApplicationsCardList";
import { TOUR_TARGETS, dataTourTarget } from "@/components/expert/onboarding/tourTargets";
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

const STORY_LAB_REVIEW_STEP_IDS = new Set([
  "review-evidence",
  "review-scoring",
  "review-red-flags",
  "review-commit",
  "review-result",
]);

export default function ApplicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const data = useApplicationsData();
  const [storedReviewWalletAddress] = useState<`0x${string}` | undefined>(() =>
    readStoredE2EWalletAddress(),
  );
  const reviewWalletAddress = data.address ?? storedReviewWalletAddress;
  const { isActive: isStoryLabPreview, activeStepId } = useStoryLabContext();

  // When the guild workspace queue links to a row via
  // `?reviewAppId=<id>&reviewType=<expert|candidate>`, auto-open the
  // review modal once the matching application hydrates. Without this the
  // deep-link from `GuildQueueRow` would land on a generic reviews page
  // and the user would have to find the row again manually.
  const autoOpenAppId = searchParams.get("reviewAppId");
  const autoOpenGuildId = searchParams.get("guildId");
  const autoOpenReviewType = searchParams.get("reviewType") as
    | "expert"
    | "candidate"
    | null;

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

  // Search
  const [search, setSearch] = useState("");

  // Auto-open the practice review modal when the story-lab tour walks through
  // the review-* sub-stops. Steps 6-10 share the /expert/voting route but the
  // markers they target only render inside the review modal — keep modal state
  // synced with the tour's active step so the spotlight has something to anchor.
  // eslint-disable-next-line no-restricted-syntax -- reactive sync to story-lab tour state
  useEffect(() => {
    if (!isStoryLabPreview) {
      if (showReviewModal && selectedReviewApp?.id === STORY_LAB_REVIEW_APPLICATION_ID) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- close the synthetic modal when story mode exits; this DOM->state cleanup is the effect's purpose
        setShowReviewModal(false);
        setSelectedReviewApp(null);
        setReviewProposalContext(undefined);
      }
      return;
    }

    const isReviewStep = activeStepId !== null && STORY_LAB_REVIEW_STEP_IDS.has(activeStepId);

    if (isReviewStep) {
      const alreadyOpenForStory =
        showReviewModal && selectedReviewApp?.id === STORY_LAB_REVIEW_APPLICATION_ID;
      if (alreadyOpenForStory) return;

      const storyApp = data.expertApps.find((app) => app.id === STORY_LAB_REVIEW_APPLICATION_ID);
      if (!storyApp) return;

      setSelectedReviewApp(storyApp);
      setReviewType("expert");
      setReviewProposalContext(undefined);
      setShowReviewModal(true);
    } else if (showReviewModal && selectedReviewApp?.id === STORY_LAB_REVIEW_APPLICATION_ID) {
      setShowReviewModal(false);
      setSelectedReviewApp(null);
      setReviewProposalContext(undefined);
    }
  }, [isStoryLabPreview, activeStepId, data.expertApps, showReviewModal, selectedReviewApp?.id]);

  // Poll the BE while the review modal is open and the on-chain session is
  // still being prepared. The cron that creates the session ticks every 30s,
  // so without polling the modal banner stays "Preparing on-chain session…"
  // until the user closes and reopens it.
  //
  // Cleanup is registered unconditionally so an effect run that early-returns
  // (e.g. modal closes mid-poll, or selectedReviewApp swaps) still tears down
  // any interval started by a prior run, preventing leaked timers.
  // eslint-disable-next-line no-restricted-syntax -- runtime polling for backend session creation
  useEffect(() => {
    let alive = true;
    let intervalId: number | null = null;

    // Expert reviews poll the expert-application commit-reveal status; candidate
    // reviews poll the linked proposal's commit-reveal status (Pipeline B). Both
    // share the same `votingPhase` / `blockchainSessionCreated` shape.
    const pollTargetId =
      reviewType === "expert"
        ? selectedReviewApp?.id
        : reviewType === "candidate"
          ? selectedReviewApp?.candidateProposalId
          : undefined;
    const pollPhaseStatus =
      reviewType === "candidate"
        ? commitRevealApi.getProposalPhaseStatus
        : expertApi.expertCommitReveal.getPhaseStatus;

    const shouldPoll =
      showReviewModal &&
      (reviewType === "expert" || reviewType === "candidate") &&
      !!pollTargetId &&
      crPhaseStatus?.votingPhase === "commit" &&
      !crPhaseStatus?.blockchainSessionCreated;

    if (shouldPoll && pollTargetId) {
      const targetId = pollTargetId;
      intervalId = window.setInterval(async () => {
        try {
          const updated = await pollPhaseStatus(targetId);
          if (alive) setCrPhaseStatus(updated);
        } catch {
          /* transient — keep polling */
        }
      }, 5000);
    }

    return () => {
      alive = false;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [
    showReviewModal,
    reviewType,
    selectedReviewApp?.id,
    selectedReviewApp?.candidateProposalId,
    crPhaseStatus?.votingPhase,
    crPhaseStatus?.blockchainSessionCreated,
  ]);

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

  const handleReviewCandidate = async (
    candidateApp: CandidateGuildApplication,
    opts: { skipStakeGate?: boolean } = {},
  ) => {
    if (candidateApp.expertHasReviewed) return;
    if (!opts.skipStakeGate && !data.isStakedInGuild(candidateApp.guildId)) {
      toast.info("You need to stake VETD tokens in this guild to unlock reviewing.");
      return;
    }
    const mapped = mapCandidateToReviewApplication(candidateApp);
    setSelectedReviewApp(mapped);
    setReviewType("candidate");
    setCrPhaseStatus(null);
    setShowReviewModal(true);

    // Candidate guild-applications now run on Pipeline B (commit-reveal). Pull
    // the linked proposal's commit-reveal phase after opening so a slow phase
    // endpoint cannot block the reviewer from seeing the modal.
    if (candidateApp.candidateProposalId) {
      try {
        const phaseStatus = await commitRevealApi.getProposalPhaseStatus(
          candidateApp.candidateProposalId,
        );
        setCrPhaseStatus(phaseStatus);
      } catch {
        setCrPhaseStatus(null);
      }
    }
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

  // Fired by the modal after a successful on-chain commit OR direct review
  // submission. Flips the card optimistically (reviewedExpertIds / candidate
  // equivalent), refetches the queue, and re-pulls phase status once so a
  // commit→reveal/finalized advancement propagates to the modal banner.
  const handleReviewSuccess = () => {
    const appId = selectedReviewApp?.id;
    if (appId) {
      if (reviewType === "expert") {
        data.markExpertReviewed(appId);
      } else if (reviewType === "candidate") {
        data.markCandidateReviewed(appId);
      }
    }

    data.refetchExpertApps();
    data.refetchCandidateApps();
    data.refetchHistoryCandidateApps();

    if (appId && reviewType === "expert") {
      expertApi.expertCommitReveal
        .getPhaseStatus(appId)
        .then((status) => setCrPhaseStatus(status))
        .catch(() => {
          /* leave stale phase status; modal will re-fetch on next open */
        });
    } else if (reviewType === "candidate" && selectedReviewApp?.candidateProposalId) {
      // Re-pull the linked proposal's commit-reveal status so a commit→reveal
      // advancement propagates to the modal banner, mirroring the expert path.
      commitRevealApi
        .getProposalPhaseStatus(selectedReviewApp.candidateProposalId)
        .then((status) => setCrPhaseStatus(status))
        .catch(() => {
          /* leave stale phase status; modal will re-fetch on next open */
        });
    }
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

  // Auto-open the review modal when arriving from a guild-workspace queue
  // deep-link (`?reviewAppId=<id>&reviewType=<expert|candidate>`). We wait
  // until the matching application has hydrated in useApplicationsData
  // before opening so the modal receives a real `application` prop —
  // otherwise it would render against null and bail out at the
  // `if (!application || !isOpen) return null` guard. Once opened we
  // strip the query params so closing the modal doesn't trigger a reopen.
  // eslint-disable-next-line no-restricted-syntax -- reactive sync to URL deep-link → modal state
  useEffect(() => {
    if (!autoOpenAppId || !autoOpenReviewType) return;
    if (showReviewModal) return;

    let opened = false;
    if (autoOpenReviewType === "expert") {
      const match = data.expertApps.find((a) => a.id === autoOpenAppId);
      if (match) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- opens the modal in response to URL deep-link; the cascading render is intentional and one-shot (params are stripped below)
        void handleReviewExpert(match);
        opened = true;
      }
    } else if (autoOpenReviewType === "candidate") {
      // Switch to the candidate tab so the row is visible behind the modal
      // (and after the user closes it).
      if (data.activeTab !== "candidate") data.setActiveTab("candidate");
      const match = data.candidateApps.find((a) => a.id === autoOpenAppId);
      if (match) {
        // If the expert already reviewed this candidate, open the read-only
        // view-review modal instead of silently no-oping (handleReviewCandidate
        // early-returns when expertHasReviewed is true).
        if (match.expertHasReviewed) {
          handleViewCandidateReview(match);
        } else {
          void handleReviewCandidate(match, { skipStakeGate: true });
        }
        opened = true;
      }
    }
    if (!opened) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("reviewAppId");
    params.delete("reviewType");
    params.delete("guildId");
    const next = params.toString();
    router.replace(`/expert/voting${next ? `?${next}` : ""}`);
    // We intentionally depend only on the auto-open keys and the loaded
    // app lists — including handler refs would loop on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAppId, autoOpenReviewType, data.expertApps, data.candidateApps]);

  // Fallback for direct candidate-review deep links. Some E2E and queue-link
  // paths point at a guild that is not present in the expert's broad guild
  // list yet, so `useApplicationsData()` can have an empty candidate list even
  // though the targeted backend queue endpoint returns the assigned row.
  // eslint-disable-next-line no-restricted-syntax -- URL deep-link hydration fallback
  useEffect(() => {
    if (!autoOpenAppId || autoOpenReviewType !== "candidate") return;
    if (!autoOpenGuildId || !reviewWalletAddress) return;
    if (showReviewModal || showViewReview) return;
    if (data.candidateApps.some((app) => app.id === autoOpenAppId)) return;

    let cancelled = false;
    void (async () => {
      try {
        const apps = await guildsApi.getCandidateApplications(
          autoOpenGuildId,
          reviewWalletAddress,
        );
        if (cancelled) return;
        const match = apps.find((app) => app.id === autoOpenAppId);
        if (!match) return;
        const hydratedMatch = {
          ...match,
          guildId: match.guildId ?? autoOpenGuildId,
          guildName: match.guildName ?? "Linked Guild",
        };
        if (hydratedMatch.expertHasReviewed) {
          handleViewCandidateReview(hydratedMatch);
        } else {
          await handleReviewCandidate(hydratedMatch, { skipStakeGate: true });
        }
        if (cancelled) return;
        const params = new URLSearchParams(searchParams.toString());
        params.delete("reviewAppId");
        params.delete("reviewType");
        params.delete("guildId");
        const next = params.toString();
        router.replace(`/expert/voting${next ? `?${next}` : ""}`);
      } catch (error) {
        toast.error(extractApiError(error, "Could not load candidate review"));
      }
    })();

    return () => {
      cancelled = true;
    };
    // We intentionally depend on loaded candidate apps and the deep-link keys;
    // handler refs would re-run this one-shot fallback every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoOpenAppId,
    autoOpenReviewType,
    autoOpenGuildId,
    reviewWalletAddress,
    data.candidateApps,
    showReviewModal,
    showViewReview,
  ]);

  const handleSubmitReview = async (payload: ReviewSubmitPayload): Promise<ReviewSubmitResponse | void> => {
    if (!selectedReviewApp || !reviewWalletAddress) return;

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
        walletAddress: reviewWalletAddress,
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

  const filteredPaginatedItems = useMemo(() => {
    if (!search.trim()) return data.paginatedItems;
    const q = search.toLowerCase();
    return data.paginatedItems.filter((item) => {
      if (data.activeTab === "expert") {
        const a = item as ExpertMembershipApplication;
        return a.fullName?.toLowerCase().includes(q);
      }
      if (data.activeTab === "candidate") {
        const a = item as CandidateGuildApplication;
        return a.candidateName?.toLowerCase().includes(q);
      }
      if (data.activeTab === "proposals") {
        const a = item as GuildApplication;
        return a.candidate_name?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [data.paginatedItems, data.activeTab, search]);

  const filteredHistoryList = useMemo(() => {
    if (!search.trim()) return data.historyList;
    const q = search.toLowerCase();
    return data.historyList.filter((item) => {
      if (item.type === "expert") return (item.data as ExpertMembershipApplication).fullName?.toLowerCase().includes(q);
      if (item.type === "candidate") return (item.data as CandidateGuildApplication).candidateName?.toLowerCase().includes(q);
      if (item.type === "proposal") return (item.data as GuildApplication).candidate_name?.toLowerCase().includes(q);
      return true;
    });
  }, [data.historyList, search]);

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
        <div
          className="rounded-xl bg-card border border-border overflow-hidden"
          {...dataTourTarget(TOUR_TARGETS.applicationsOverview)}
        >
          <div className="px-6 py-5">
            <h1 className="text-xl font-bold tracking-tight">Reviews</h1>
            <div className="mt-1">
              <HelpLink href={DOC_LINKS.commitReveal} size="sm">
                How reviews work
              </HelpLink>
            </div>
          </div>
          <div className="border-t border-border" />
          <ApplicationsStatsRow
            pendingReviews={data.pendingReviews}
            completedReviews={data.historyCount}
          />
        </div>

        {/* Staking Warning */}
        {!data.guildStakesLoading && !data.hasAnyStake && (
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
                <Button onClick={() => router.push("/expert/dashboard?openStaking=withdraw")}>
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

        <div {...dataTourTarget(TOUR_TARGETS.applicationsSearch)}>
          <Input
            placeholder="Search by applicant name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Content */}
        <ApplicationsCardList
          activeTab={data.activeTab}
          isHistory={data.activeTab === "history"}
          filterMode={data.filterMode}
          isLoading={data.isLoading}
          isAllGuilds={data.isAllGuilds}
          selectedGuildName={data.selectedGuild.name}
          paginatedItems={filteredPaginatedItems}
          historyList={filteredHistoryList}
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
        commitRevealPhase={reviewType === "expert" || reviewType === "candidate" ? crPhaseStatus?.votingPhase : undefined}
        blockchainSessionId={reviewType === "expert" || reviewType === "candidate" ? crPhaseStatus?.blockchainSessionId : undefined}
        blockchainSessionCreated={reviewType === "expert" || reviewType === "candidate" ? crPhaseStatus?.blockchainSessionCreated : undefined}
        reviewerId={data.expertData?.id}
        expertWallet={data.address || undefined}
        onReviewSuccess={handleReviewSuccess}
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
