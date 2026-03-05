"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import { useAuthContext } from "@/hooks/useAuthContext";
import { expertApi, guildsApi, guildApplicationsApi, blockchainApi } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { useGuilds } from "@/lib/hooks/useGuilds";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { mapCandidateToReviewApplication } from "@/lib/reviewHelpers";
import { Pagination } from "@/components/ui/pagination";
import { PillTabs } from "@/components/ui/pill-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { StructuredProposalForm, StructuredProposalData } from "@/components/StructuredProposalForm";
import { ApplicationsStatsRow } from "./ApplicationsStatsRow";
import { ExpertReviewCard } from "./ExpertReviewCard";
import { CandidateReviewCard } from "./CandidateReviewCard";
import { ProposalCard } from "./ProposalCard";
import type {
  ExpertMembershipApplication,
  CandidateGuildApplication,
  GuildApplication,
  ExpertProfile,
  StakeBalance,
} from "@/types";
import type { ReviewSubmitPayload, ReviewSubmitResponse } from "@/types";

const ReviewGuildApplicationModal = dynamic(
  () => import("@/components/guild/ReviewGuildApplicationModal").then(m => ({ default: m.ReviewGuildApplicationModal })),
  { ssr: false },
);

const ALL_GUILDS = { id: "all", name: "All Guilds" } as const;

type TabType = "expert" | "candidate" | "proposals";

export default function ApplicationsPage() {
  const { address: wagmiAddress } = useAccount();
  const auth = useAuthContext();
  const address = wagmiAddress || auth.walletAddress;
  const { guilds: guildRecords } = useGuilds();

  const [selectedGuild, setSelectedGuild] = useState<{ id: string; name: string }>(ALL_GUILDS);
  const [filterMode, setFilterMode] = useState<"assigned" | "all">("assigned");
  const [activeTab, setActiveTab] = useState<TabType>("expert");
  const [voting, setVoting] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewApp, setSelectedReviewApp] = useState<ExpertMembershipApplication | null>(null);
  const [reviewType, setReviewType] = useState<"expert" | "candidate">("expert");
  const [isReviewing, setIsReviewing] = useState(false);

  const isAllGuilds = selectedGuild.id === "all";

  // Expert profile
  const { data: expertData } = useFetch<ExpertProfile>(
    () => expertApi.getProfile(address as string),
    { skip: !address, onError: (err) => toast.error(err) },
  );

  // Staking status
  const { data: stakingStatus } = useFetch<StakeBalance>(
    () => blockchainApi.getStakeBalance(address as string),
    { skip: !address },
  );

  // Expert membership applications (across all guilds)
  const { data: expertAppsRaw, isLoading: expertAppsLoading, refetch: refetchExpertApps } = useFetch<ExpertMembershipApplication[]>(
    async () => {
      if (!address || guildRecords.length === 0) return [];
      const targetGuilds = isAllGuilds ? guildRecords : [selectedGuild];
      const results = await Promise.all(
        targetGuilds.map(async (g) => {
          try {
            const data = await expertApi.getGuildDetails(g.id, address) as Record<string, unknown>;
            const apps = Array.isArray(data.guildApplications) ? data.guildApplications as ExpertMembershipApplication[] : [];
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
            const apps = await guildsApi.getCandidateApplications(g.id, address) as unknown as CandidateGuildApplication[];
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

  const voteApi = useApi();
  const createApi = useApi();

  // Filter expert apps — "assigned" shows all unreviewed (no explicit assigned field for membership apps)
  const expertApps = useMemo(() => {
    const apps = expertAppsRaw ?? [];
    if (filterMode === "assigned") return apps;
    return apps;
  }, [expertAppsRaw, filterMode]);

  // Filter candidate apps
  const candidateApps = useMemo(() => {
    const apps = candidateAppsRaw ?? [];
    if (filterMode === "assigned") return apps.filter((a) => !a.expertHasReviewed);
    return apps;
  }, [candidateAppsRaw, filterMode]);

  const proposals = proposalsRaw ?? [];

  // Pagination for the active tab
  const activeItems = activeTab === "expert" ? expertApps : activeTab === "candidate" ? candidateApps : proposals;
  const {
    paginatedItems,
    currentPage,
    totalPages,
    setCurrentPage,
    resetPage,
  } = useClientPagination(activeItems, 10);

  // Refetch on filter/guild change
  useEffect(() => {
    resetPage();
    refetchExpertApps();
    refetchCandidateApps();
    refetchProposals();
  }, [selectedGuild, filterMode, expertData, guildRecords]);

  // Stats
  const pendingReviews = (expertApps?.length ?? 0) + (candidateApps?.filter((a) => !a.expertHasReviewed)?.length ?? 0);
  const proposalsToVote = proposals.filter((p) => p.is_assigned_reviewer && !p.has_voted).length;
  const completedThisMonth = (candidateApps?.filter((a) => a.expertHasReviewed)?.length ?? 0)
    + proposals.filter((p) => p.has_voted).length;
  const guildsActive = guildRecords.length;

  // Handlers
  const handleReviewExpert = (application: ExpertMembershipApplication) => {
    if (!stakingStatus?.meetsMinimum) {
      toast.info("You need to stake VETD tokens first to unlock reviewing.");
      return;
    }
    setSelectedReviewApp(application);
    setReviewType("expert");
    setShowReviewModal(true);
  };

  const handleReviewCandidate = (candidateApp: CandidateGuildApplication) => {
    if (!stakingStatus?.meetsMinimum) {
      toast.info("You need to stake VETD tokens first to unlock reviewing.");
      return;
    }
    const mapped = mapCandidateToReviewApplication(candidateApp);
    setSelectedReviewApp(mapped);
    setReviewType("candidate");
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (payload: ReviewSubmitPayload): Promise<ReviewSubmitResponse | void> => {
    if (!selectedReviewApp || !address) return;

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

  const handleVote = async (proposalId: string, score: number, stakeAmount: number, comment: string) => {
    if (!expertData) {
      toast.error("Expert data not loaded");
      return;
    }
    if (!stakingStatus?.meetsMinimum) {
      toast.error("You must stake the minimum VETD amount to vote");
      return;
    }

    await voteApi.execute(
      () => guildApplicationsApi.vote(proposalId, {
        expertId: expertData.id,
        score,
        stakeAmount,
        comment,
      }),
      {
        onSuccess: () => {
          toast.success("Score submitted successfully!");
          setVoting(null);
          refetchProposals();
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  const handleCreateProposal = async (data: StructuredProposalData) => {
    if (isAllGuilds) return;

    await createApi.execute(
      () => guildApplicationsApi.create({
        guildId: selectedGuild.id,
        candidateName: data.candidateName,
        candidateEmail: data.candidateEmail,
        yearsOfExperience: data.yearsOfExperience,
        skillsSummary: data.skillsSummary,
        experienceSummary: data.experienceSummary,
        motivationStatement: data.motivationStatement,
        credibilityEvidence: data.credibilityEvidence,
        achievements: data.achievements,
        requiredStake: data.requiredStake,
        votingDurationDays: data.votingDurationDays,
      }),
      {
        onSuccess: () => {
          toast.success("Application created successfully!");
          setShowCreateForm(false);
          refetchProposals();
        },
        onError: (err) => toast.error(err),
      },
    );
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
    : proposalsLoading;

  const tabs: { value: TabType; label: React.ReactNode }[] = [
    {
      value: "expert",
      label: (
        <>
          Expert Reviews
          {expertApps.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/30 text-xs font-semibold rounded-full">
              {expertApps.length}
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
          completedThisMonth={completedThisMonth}
          guildsActive={guildsActive}
        />

        {/* Staking Warning */}
        {stakingStatus && !stakingStatus.meetsMinimum && (
          <Card className="border-amber-500/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Staking Required to Review</p>
                  <p className="text-sm text-muted-foreground">
                    You must stake VETD tokens to participate in reviews and voting.
                    Current stake: {stakingStatus.stakedAmount || "0"} VETD.
                  </p>
                </div>
                <Button variant="default" size="sm">
                  Stake VETD
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
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
            <SelectTrigger className="w-[200px]">
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

          <div className="flex items-center gap-2">
            <Button
              variant={filterMode === "assigned" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode("assigned")}
            >
              Assigned to Me
            </Button>
            <Button
              variant={filterMode === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterMode("all")}
            >
              All
            </Button>

            {activeTab === "proposals" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateForm(!showCreateForm)}
                disabled={isAllGuilds}
                title={isAllGuilds ? "Select a specific guild to create a proposal" : undefined}
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Proposal
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <PillTabs tabs={tabs} activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); resetPage(); }} />

        {/* Create Proposal Form */}
        {showCreateForm && !isAllGuilds && activeTab === "proposals" && (
          <StructuredProposalForm
            guildId={selectedGuild.id}
            guildName={selectedGuild.name}
            onSubmit={handleCreateProposal}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-border bg-card p-5 space-y-3 animate-pulse">
                <div className="h-5 w-2/3 rounded bg-muted/60" />
                <div className="h-3 w-1/2 rounded bg-muted/60" />
                <div className="flex gap-2">
                  <div className="h-6 w-20 rounded bg-muted/60" />
                  <div className="h-6 w-16 rounded bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        ) : activeItems.length === 0 ? (
          <EmptyState
            title={
              activeTab === "expert" ? "No expert applications"
                : activeTab === "candidate" ? "No candidate applications"
                : "No proposals"
            }
            description={
              filterMode === "assigned"
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
                  showGuildBadge={isAllGuilds}
                />
              ))
            )}

            {activeTab === "proposals" && (
              (paginatedItems as GuildApplication[]).map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  isVoting={voting === proposal.id}
                  onStartVote={() => setVoting(proposal.id)}
                  onCancelVote={() => setVoting(null)}
                  onSubmitVote={(score, stakeAmount, comment) =>
                    handleVote(proposal.id, score, stakeAmount, comment)
                  }
                  isSubmittingVote={voteApi.isLoading}
                  meetsStakingRequirement={!!stakingStatus?.meetsMinimum}
                  showGuildBadge={isAllGuilds}
                />
              ))
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
        onClose={() => { setShowReviewModal(false); setSelectedReviewApp(null); }}
        application={selectedReviewApp}
        guildId={selectedReviewApp?.guildId || selectedGuild.id}
        onSubmitReview={handleSubmitReview}
        isReviewing={isReviewing}
      />
    </div>
  );
}
