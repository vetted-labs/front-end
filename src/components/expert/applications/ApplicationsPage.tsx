"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useAuthContext } from "@/hooks/useAuthContext";
import { expertApi, guildsApi, guildApplicationsApi, blockchainApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { useGuilds } from "@/lib/hooks/useGuilds";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { mapCandidateToReviewApplication, mapProposalToReviewApplication } from "@/lib/reviewHelpers";
import { Pagination } from "@/components/ui/pagination";
import { PillTabs } from "@/components/ui/pill-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { Button } from "@/components/ui/button";
import { ArrowRight, Coins, History, Inbox, Shield } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ViewReviewModal } from "./ViewReviewModal";
import { ApplicationsStatsRow } from "./ApplicationsStatsRow";
import { ExpertReviewCard } from "./ExpertReviewCard";
import { CandidateReviewCard } from "./CandidateReviewCard";
import { ProposalCard } from "./ProposalCard";
import type {
  ExpertMembershipApplication,
  CandidateGuildApplication,
  GuildApplication,
  ExpertProfile,
  GuildStakeInfo,
} from "@/types";
import type { ReviewSubmitPayload, ReviewSubmitResponse } from "@/types";

const ReviewGuildApplicationModal = dynamic(
  () => import("@/components/guild/ReviewGuildApplicationModal").then(m => ({ default: m.ReviewGuildApplicationModal })),
  { ssr: false },
);

const ALL_GUILDS = { id: "all", name: "All Guilds" } as const;

type TabType = "expert" | "candidate" | "proposals" | "history";

export default function ApplicationsPage() {
  const { address: wagmiAddress } = useAccount();
  const searchParams = useSearchParams();
  const auth = useAuthContext();
  const address = wagmiAddress || auth.walletAddress;
  const { guilds: guildRecords } = useGuilds();

  const [selectedGuild, setSelectedGuild] = useState<{ id: string; name: string }>(ALL_GUILDS);
  const [filterMode, setFilterMode] = useState<"assigned" | "all">("assigned");
  const [activeTab, setActiveTab] = useState<TabType>("expert");

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

  const isAllGuilds = selectedGuild.id === "all";

  // Expert profile
  const { data: expertData } = useFetch<ExpertProfile>(
    () => expertApi.getProfile(address as string),
    { skip: !address, onError: (err) => toast.error(err) },
  );

  // Per-guild staking data
  const { data: guildStakes } = useFetch<GuildStakeInfo[]>(
    () => blockchainApi.getExpertGuildStakes(address as string),
    { skip: !address },
  );

  const stakedGuildIds = useMemo(() => {
    if (!guildStakes) return new Set<string>();
    return new Set(guildStakes.filter(s => parseFloat(s.stakedAmount) > 0).map(s => s.guildId));
  }, [guildStakes]);

  const isStakedInGuild = (guildId?: string) => {
    if (!guildId) return stakedGuildIds.size > 0;
    return stakedGuildIds.has(guildId);
  };
  const hasAnyStake = stakedGuildIds.size > 0;

  // Expert membership applications (across all guilds)
  const { data: expertAppsRaw, isLoading: expertAppsLoading, refetch: refetchExpertApps } = useFetch<ExpertMembershipApplication[]>(
    async () => {
      if (!address || guildRecords.length === 0) return [];
      const targetGuilds = isAllGuilds ? guildRecords : [selectedGuild];
      const results = await Promise.all(
        targetGuilds.map(async (g) => {
          try {
            const data = await expertApi.getGuildDetails(g.id, address);
            const apps = Array.isArray(data.guildApplications) ? data.guildApplications : [];
            return apps.map((a) => ({ ...a, guildId: g.id, guildName: g.name }));
          } catch {
            return [];
          }
        }),
      );
      return results.flat();
    },
    { onError: (err) => toast.error(err) },
  );

  // Candidate guild applications (across all guilds)
  const { data: candidateAppsRaw, isLoading: candidateAppsLoading, refetch: refetchCandidateApps } = useFetch<CandidateGuildApplication[]>(
    async () => {
      if (!address || guildRecords.length === 0) return [];
      const targetGuilds = isAllGuilds ? guildRecords : [selectedGuild];
      const results = await Promise.all(
        targetGuilds.map(async (g) => {
          try {
            const apps = await guildsApi.getCandidateApplications(g.id, address);
            return (Array.isArray(apps) ? apps : []).map((a) => ({ ...a, guildId: g.id, guildName: g.name }));
          } catch {
            return [];
          }
        }),
      );
      return results.flat();
    },
    { onError: (err) => toast.error(err) },
  );

  // Proposals (Schelling voting)
  const { data: proposalsRaw, isLoading: proposalsLoading, refetch: refetchProposals } = useFetch<GuildApplication[]>(
    async () => {
      if (filterMode === "assigned" && expertData?.id) {
        return guildApplicationsApi.getAssigned(
          expertData.id,
          isAllGuilds ? undefined : selectedGuild.id,
        );
      }
      if (isAllGuilds) {
        const results = await Promise.all(
          guildRecords.map((g) => guildApplicationsApi.getByGuild(g.id, "ongoing")),
        );
        return results.flat();
      }
      return guildApplicationsApi.getByGuild(selectedGuild.id, "pending");
    },
    { onError: (err) => toast.error(err) },
  );

  // History: finalized proposals the expert voted on
  const { data: historyProposalsRaw, isLoading: historyLoading, refetch: refetchHistory } = useFetch<GuildApplication[]>(
    async () => {
      if (!expertData?.id) return [];
      const all = await guildApplicationsApi.getAssigned(
        expertData.id,
        isAllGuilds ? undefined : selectedGuild.id,
        "all",
      );
      return all.filter((p) => p.finalized && p.has_voted);
    },
    { onError: (err) => toast.error(err) },
  );

  // Expert apps — membership apps have no assigned field, so no filtering needed
  const expertApps = expertAppsRaw ?? [];

  // Candidate apps — show all (including reviewed) so experts can view their past reviews
  const candidateApps = candidateAppsRaw ?? [];

  const proposals = proposalsRaw ?? [];

  // History: combine finalized proposals + reviewed candidate apps
  const historyItems = useMemo(() => {
    const finalized = historyProposalsRaw ?? [];
    const reviewedCandidateApps = (candidateAppsRaw ?? []).filter((a) => a.expertHasReviewed);
    return { proposals: finalized, candidateApps: reviewedCandidateApps };
  }, [historyProposalsRaw, candidateAppsRaw]);

  const historyCount = historyItems.proposals.length + historyItems.candidateApps.length;

  // Unified history list for pagination (proposals first, then candidate reviews, both by date desc)
  const historyList = useMemo(() => {
    const items: Array<{ type: "proposal"; data: GuildApplication; sortDate: string } | { type: "candidate"; data: CandidateGuildApplication; sortDate: string }> = [
      ...historyItems.proposals.map((p) => ({ type: "proposal" as const, data: p, sortDate: p.created_at })),
      ...historyItems.candidateApps.map((a) => ({ type: "candidate" as const, data: a, sortDate: a.submittedAt })),
    ];
    return items.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());
  }, [historyItems]);

  // Pagination for the active tab
  const activeItems = activeTab === "history" ? historyList : activeTab === "expert" ? expertApps : activeTab === "candidate" ? candidateApps : proposals;
  const {
    paginatedItems,
    currentPage,
    totalPages,
    setCurrentPage,
    resetPage,
  } = useClientPagination(activeItems, 10);

  // Pre-select guild from URL query param
  useEffect(() => {
    const guildParam = searchParams.get("guild");
    if (guildParam && guildRecords.length > 0) {
      const match = guildRecords.find((g) => g.id === guildParam);
      if (match) setSelectedGuild(match);
    }
  }, [searchParams, guildRecords]);

  // Refetch on filter/guild change
  useEffect(() => {
    resetPage();
    refetchExpertApps();
    refetchCandidateApps();
    refetchProposals();
    refetchHistory();
  }, [selectedGuild, filterMode, expertData, guildRecords]);

  // Stats
  const pendingReviews = (expertApps?.filter((a) => !a.expertHasReviewed)?.length ?? 0) + (candidateApps?.filter((a) => !a.expertHasReviewed)?.length ?? 0);
  const proposalsToVote = proposals.filter((p) => p.is_assigned_reviewer && !p.has_voted).length;
  const completedReviews = historyCount;
  const guildsActive = guildRecords.length;

  // Handlers
  const handleReviewExpert = (application: ExpertMembershipApplication) => {
    if (!isStakedInGuild(application.guildId)) {
      toast.info("You need to stake VETD tokens in this guild to unlock reviewing.");
      return;
    }
    setSelectedReviewApp(application);
    setReviewType("expert");
    setShowReviewModal(true);
  };

  const handleReviewCandidate = (candidateApp: CandidateGuildApplication) => {
    if (!isStakedInGuild(candidateApp.guildId)) {
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
    if (!isStakedInGuild(proposal.guild_id)) {
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
    if (!selectedReviewApp || !address) return;

    setIsReviewing(true);
    try {
      if (reviewType === "proposal") {
        if (!expertData) throw new Error("Expert data not loaded");

        // Normalize rubric score to 0-100 for the vote API
        const scores = payload.criteriaScores as { overallMax?: number; overallScore?: number };
        const overallMax = (scores.overallMax as number) || 1;
        const normalizedScore = Math.round((payload.overallScore / overallMax) * 100);

        await guildApplicationsApi.vote(selectedReviewApp.id, {
          expertId: expertData.id,
          score: normalizedScore,
          stakeAmount: payload.stakeAmount ?? 0,
          comment: payload.feedback,
          criteriaScores: payload.criteriaScores,
          criteriaJustifications: payload.criteriaJustifications,
          overallScore: payload.overallScore,
          redFlagDeductions: payload.redFlagDeductions,
        });

        refetchProposals();
        return { message: "Your vote has been recorded with structured review data." };
      }

      const reviewData = {
        walletAddress: address,
        feedback: payload.feedback || undefined,
        criteriaScores: payload.criteriaScores,
        criteriaJustifications: payload.criteriaJustifications,
        overallScore: payload.overallScore,
        redFlagDeductions: payload.redFlagDeductions,
      };

      const response = reviewType === "candidate"
        ? await guildsApi.reviewCandidateApplication(selectedReviewApp.id, reviewData)
        : await expertApi.reviewGuildApplication(selectedReviewApp.id, reviewData);

      refetchExpertApps();
      refetchCandidateApps();

      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit review";
      toast.error(message);
      throw err;
    } finally {
      setIsReviewing(false);
    }
  };


  if (!address) {
    return (
      <div className="flex items-center justify-center py-20">
        <WalletRequiredState message="Connect your wallet to access reviews" />
      </div>
    );
  }

  const isLoading = activeTab === "expert" ? expertAppsLoading
    : activeTab === "candidate" ? candidateAppsLoading
    : activeTab === "proposals" ? proposalsLoading
    : historyLoading;

  const tabs: { value: TabType; label: React.ReactNode }[] = [
    {
      value: "expert",
      label: (
        <>
          Expert Reviews
          {expertApps.filter((a) => !a.expertHasReviewed).length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/30 text-xs font-semibold rounded-full">
              {expertApps.filter((a) => !a.expertHasReviewed).length}
            </span>
          )}
        </>
      ),
    },
    {
      value: "candidate",
      label: (
        <>
          Candidate Reviews
          {candidateApps.filter((a) => !a.expertHasReviewed).length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/30 text-xs font-semibold rounded-full">
              {candidateApps.filter((a) => !a.expertHasReviewed).length}
            </span>
          )}
        </>
      ),
    },
    {
      value: "proposals",
      label: (
        <>
          Proposals
          {proposals.filter((p) => p.is_assigned_reviewer && !p.has_voted).length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/30 text-xs font-semibold rounded-full">
              {proposals.filter((p) => p.is_assigned_reviewer && !p.has_voted).length}
            </span>
          )}
        </>
      ),
    },
    {
      value: "history",
      label: (
        <>
          History
          {historyCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-muted text-muted-foreground text-xs font-semibold rounded-full">
              {historyCount}
            </span>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-5xl mx-auto py-10 px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review expert applications, candidate applications, and vote on proposals across your guilds.
          </p>
        </div>

        {/* Stats */}
        <ApplicationsStatsRow
          pendingReviews={pendingReviews}
          proposalsToVote={proposalsToVote}
          completedReviews={completedReviews}
          guildsActive={guildsActive}
        />

        {/* Staking Warning */}
        {guildStakes && !hasAnyStake && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Stake VETD to Start Reviewing
                </h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  To review applications and vote on proposals, you need to stake VETD tokens in at least one guild. Your stake will be returned after reviews, with bonus rewards if you vote with the majority.
                </p>
                <Button>
                  <Coins className="w-4 h-4 mr-2" />
                  Stake VETD Tokens
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs + Filters */}
        <div className="space-y-4">
          <PillTabs tabs={tabs} activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); resetPage(); }} />

          <div className="flex items-center gap-3 flex-wrap">
            <Select
              value={selectedGuild.id}
              onValueChange={(value) => {
                if (value === "all") {
                  setSelectedGuild(ALL_GUILDS);
                } else {
                  const guild = guildRecords.find((g) => g.id === value);
                  if (guild) setSelectedGuild(guild);
                }
              }}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="All Guilds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Guilds</SelectItem>
                {guildRecords.map((guild) => (
                  <SelectItem key={guild.id} value={guild.id}>
                    {guild.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center rounded-lg border border-border/60 overflow-hidden">
              <button
                onClick={() => setFilterMode("assigned")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterMode === "assigned"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Assigned
              </button>
              <button
                onClick={() => setFilterMode("all")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterMode === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
            </div>

          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-5 animate-pulse dark:bg-card/40 dark:border-white/[0.06]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-36 rounded-md bg-muted/50" />
                      <div className="h-5 w-16 rounded-full bg-muted/40" />
                    </div>
                    <div className="h-3 w-48 rounded bg-muted/40" />
                    <div className="flex gap-3 mt-1">
                      <div className="h-3 w-20 rounded bg-muted/30" />
                      <div className="h-3 w-24 rounded bg-muted/30" />
                    </div>
                  </div>
                  <div className="h-8 w-20 rounded-lg bg-muted/40" />
                </div>
              </div>
            ))}
          </div>
        ) : activeItems.length === 0 ? (
          <EmptyState
            icon={activeTab === "history" ? History : Inbox}
            title={
              activeTab === "expert" ? "No expert applications"
                : activeTab === "candidate" ? "No candidate applications"
                : activeTab === "proposals" ? "No proposals"
                : "No completed reviews"
            }
            description={
              activeTab === "history"
                ? "Completed reviews and finalized proposals will appear here."
                : filterMode === "assigned"
                  ? "No items assigned to you right now."
                  : isAllGuilds
                    ? "No items across your guilds."
                    : `No items in ${selectedGuild.name}.`
            }
          />
        ) : (
          <div className="space-y-3">
            {activeTab === "expert" && (
              (paginatedItems as ExpertMembershipApplication[]).map((app) => (
                <ExpertReviewCard
                  key={app.id}
                  application={app}
                  onReview={handleReviewExpert}
                  onViewReview={handleViewExpertReview}
                  showGuildBadge={isAllGuilds}
                />
              ))
            )}

            {activeTab === "candidate" && (
              (paginatedItems as CandidateGuildApplication[]).map((app) => (
                <CandidateReviewCard
                  key={app.id}
                  application={app}
                  onReview={handleReviewCandidate}
                  onViewReview={handleViewCandidateReview}
                  showGuildBadge={isAllGuilds}
                />
              ))
            )}

            {activeTab === "proposals" && (
              (paginatedItems as GuildApplication[]).map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onReview={handleReviewProposal}
                  meetsStakingRequirement={isStakedInGuild(proposal.guild_id)}
                  showGuildBadge={isAllGuilds}
                />
              ))
            )}

            {activeTab === "history" && (
              (paginatedItems as typeof historyList).map((item) =>
                item.type === "proposal" ? (
                  <ProposalCard
                    key={`proposal-${item.data.id}`}
                    proposal={item.data}
                    onReview={handleReviewProposal}
                    meetsStakingRequirement={false}
                    showGuildBadge={isAllGuilds}
                  />
                ) : (
                  <CandidateReviewCard
                    key={`candidate-${item.data.id}`}
                    application={item.data}
                    onReview={() => {}}
                    onViewReview={handleViewCandidateReview}
                    showGuildBadge={isAllGuilds}
                  />
                )
              )
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Review Modal */}
      <ReviewGuildApplicationModal
        isOpen={showReviewModal}
        onClose={() => { setShowReviewModal(false); setSelectedReviewApp(null); setReviewProposalContext(undefined); }}
        application={selectedReviewApp}
        guildId={selectedReviewApp?.guildId || selectedGuild.id}
        onSubmitReview={handleSubmitReview}
        isReviewing={isReviewing}
        proposalContext={reviewType === "proposal" ? reviewProposalContext : undefined}
      />

      {/* View Review Modal (read-only) */}
      <ViewReviewModal
        isOpen={showViewReview}
        onClose={() => { setShowViewReview(false); setViewReviewAppId(null); }}
        applicationId={viewReviewAppId}
        applicantName={viewReviewApplicantName}
        reviewType={viewReviewType}
        walletAddress={address as string}
      />
    </div>
  );
}
