"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSwitchChain } from "wagmi";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { formatEther, parseEther } from "viem";
import { hashToBytes32 } from "@/lib/blockchain";
import { sepolia } from "wagmi/chains";
import {
  useGuildStaking,
  useMyActiveEndorsements,
} from "@/lib/hooks/useVettedContracts";
import { useEndorsementTransaction } from "@/lib/hooks/useEndorsementTransaction";
import type { EndorsableApplication } from "@/lib/hooks/useEndorsementTransaction";
import { blockchainApi, expertApi, extractApiError } from "@/lib/api";
import { usePaginatedFetch } from "@/lib/hooks/usePaginatedFetch";
import { useFetch } from "@/lib/hooks/useFetch";
import type {
  EndorsementApplication,
  EarningsBreakdownResponse,
  TokenBalance,
  StakeBalance,
} from "@/types";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Coins, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { ApplicationsGrid } from "./endorsements/ApplicationsGrid";
import { PaginationNav } from "@/components/ui/pagination-nav";

const EndorseCandidateModal = dynamic(
  () =>
    import("./endorsements/endorse/EndorseCandidateModal").then((m) => ({
      default: m.EndorseCandidateModal,
    })),
  { ssr: false },
);
import { EndorsementHeader } from "./endorsements/EndorsementHeader";
import { ActiveEndorsementsList } from "./endorsements/ActiveEndorsementsList";
import { STATUS_COLORS } from "@/config/colors";
import { SkeletonCard } from "@/components/ui/skeleton";
import { DataSection } from "@/lib/motion";
import {
  TOUR_TARGETS,
  dataTourTarget,
} from "@/components/expert/onboarding/tourTargets";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";
import {
  STORY_LAB_ENDORSEMENT_APPLICATION_ID,
  withStoryLabEndorsements,
} from "@/components/expert/story-lab/storyLabFixtures";

function isBiddingExpired(app: EndorsementApplication): boolean {
  const deadline = app.bidding_deadline
    ? new Date(app.bidding_deadline).getTime()
    : new Date(app.applied_at).getTime() + 24 * 60 * 60 * 1000;
  return Date.now() >= deadline;
}

function tokenAmountToWei(
  value?: string | number | bigint | null,
): bigint | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "bigint") return value;

  const raw = String(value).trim();
  if (!raw) return undefined;

  try {
    if (/^\d+$/.test(raw) && raw.length > 15) {
      return BigInt(raw);
    }
    return parseEther(raw);
  } catch {
    return undefined;
  }
}

interface EndorsementMarketplaceProps {
  guildId: string;
  guildName: string;
  blockchainGuildId?: `0x${string}`;
  initialApplicationId?: string;
  /** When true, show endorsement-eligible applications across every member guild. */
  allGuilds?: boolean;
  /** Number of guilds the expert belongs to (used to aggregate the all-guilds view). */
  memberGuildCount?: number;
}

export function EndorsementMarketplace({
  guildId,
  guildName,
  blockchainGuildId: blockchainGuildIdProp,
  initialApplicationId,
  allGuilds = false,
  memberGuildCount = 0,
}: EndorsementMarketplaceProps) {
  const { address, isConnected, chain } = useExpertAccount();
  const { switchChain } = useSwitchChain();
  const { isActive: isStoryLabPreview, activeSubStopId } = useStoryLabContext();
  const STORY_LAB_OPEN_MODAL_SUBSTOPS = useMemo(
    () => new Set(["bid-mechanic", "consequences"]),
    [],
  );
  const shouldStoryLabOpenModal =
    isStoryLabPreview &&
    activeSubStopId !== null &&
    STORY_LAB_OPEN_MODAL_SUBSTOPS.has(activeSubStopId);
  const [selectedApp, setSelectedApp] = useState<EndorsementApplication | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"endorse" | "view">("endorse");
  const [modalInitialStep, setModalInitialStep] = useState<1 | 2 | 3 | 4>(1);
  const [search, setSearch] = useState("");

  // Track whether we've already auto-opened the modal for initialApplicationId
  const hasAutoOpened = useRef(false);

  // Use backend API to get user's endorsements (more reliable than blockchain)
  const {
    endorsements: allUserEndorsements,
    isLoading: endorsementsLoading,
    refetch: refetchEndorsements,
  } = useMyActiveEndorsements();

  // Fetch real earnings data for the stats cards
  const { data: earningsData } = useFetch<EarningsBreakdownResponse>(
    () =>
      expertApi.getEarningsBreakdown(address!, {
        limit: 100,
      }) as Promise<EarningsBreakdownResponse>,
    {
      skip: !address,
      onError: (err) =>
        toast.error(extractApiError(err, "Couldn't load earnings")),
    },
  );

  // Load applications with server-side pagination. In all-guilds mode we hit
  // the cross-guild endpoint, which returns eligible applications across every
  // guild the expert belongs to.
  const APPS_PER_PAGE = 12;
  const fetchApplications = useCallback(
    async (page: number, limit: number) => {
      if (!address) return { data: [] as EndorsementApplication[], total: 0 };
      if (allGuilds) {
        const response = await blockchainApi.getApplicationsForAllGuilds(
          address,
          page,
          limit,
        );
        return { data: response.data ?? [], total: response.total ?? 0 };
      }
      if (!guildId) return { data: [] as EndorsementApplication[], total: 0 };
      const response = await blockchainApi.getApplicationsForEndorsement(
        guildId,
        address,
        page,
        limit,
      );
      return { data: response.data ?? [], total: response.total ?? 0 };
    },
    [guildId, address, allGuilds],
  );
  const {
    data: rawApplications,
    isLoading: loading,
    refetch: reloadApplications,
    page: applicationsPage,
    totalPages: applicationsTotalPages,
    totalItems: applicationsTotalItems,
    setPage: setApplicationsPage,
  } = usePaginatedFetch<EndorsementApplication>(fetchApplications, {
    limit: APPS_PER_PAGE,
    skip: !address || (!allGuilds && !guildId),
    onError: (error) => {
      toast.error(error || "Failed to load applications");
    },
  });

  // Inject the synthetic story-lab endorsement application so the gated
  // tour marker has something to anchor on in story preview mode.
  const applications = useMemo(
    () =>
      isStoryLabPreview
        ? withStoryLabEndorsements(rawApplications ?? [])
        : rawApplications,
    [rawApplications, isStoryLabPreview],
  );

  // Transaction hook -- encapsulates approval + bid flow, tx tracking, error handling
  const {
    txStep,
    txError,
    approvalTxHash,
    bidTxHash,
    balance,
    minimumBidFormatted,
    submitEndorsement,
    resetTransaction,
    refetchTokenData,
  } = useEndorsementTransaction({
    reloadApplications,
    refetchEndorsements,
  });

  // Use the on-chain guild ID from the API if available; fall back to local hash
  const blockchainGuildId =
    blockchainGuildIdProp ?? (guildId ? hashToBytes32(guildId) : undefined);
  const { stakeInfo, minimumStake } = useGuildStaking(blockchainGuildId);

  // DB-cached balances. Renders instantly on mount and survives RPC outages
  // (rate-limited Infura, dead public RPC, etc.) — the chain reads above are
  // authoritative when they resolve, but until then we show the indexer's
  // last-known value instead of falsely rendering "0".
  const { data: tokenBalanceDb } = useFetch<TokenBalance>(
    () => blockchainApi.getTokenBalance(address!),
    { skip: !address },
  );
  const { data: stakeBalanceDb } = useFetch<StakeBalance>(
    () => blockchainApi.getStakeBalance(address!, blockchainGuildId),
    { skip: !address || !blockchainGuildId },
  );

  // Endorsements scoped to the selected guild — or all of them in all-guilds mode.
  const userEndorsements = allGuilds
    ? allUserEndorsements
    : allUserEndorsements.filter((e) => e.guild?.id === guildId);

  // Only open (non-expired) applications are shown — the Closed tab was removed
  // (VET-98). A deep-link to a now-closed application simply degrades to empty.
  const activeApps = (applications ?? []).filter(
    (app) => !isBiddingExpired(app),
  );

  const filteredApplications = useMemo(() => {
    if (!search.trim()) return activeApps;
    const q = search.toLowerCase();
    return activeApps.filter(
      (app) =>
        app.candidate_name?.toLowerCase().includes(q) ||
        app.job_title?.toLowerCase().includes(q) ||
        app.company_name?.toLowerCase().includes(q),
    );
  }, [activeApps, search]);

  // eslint-disable-next-line no-restricted-syntax -- runtime deps: auto-open modal once applications finish loading with a matching applicationId
  useEffect(() => {
    if (
      initialApplicationId &&
      !hasAutoOpened.current &&
      (applications ?? []).length > 0 &&
      !loading
    ) {
      const targetApp = (applications ?? []).find(
        (app) => app.application_id === initialApplicationId,
      );
      if (targetApp) {
        hasAutoOpened.current = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: open the matching application's modal once it finishes loading
        setSelectedApp(targetApp);
        setModalMode("endorse");
        setModalInitialStep(4);
        setModalOpen(true);
      }
    }
  }, [initialApplicationId, applications, loading]);

  // Sync modal open/closed state to the active story-lab sub-stop so the
  // walkthrough's popovers can anchor inside the modal during bid-mechanic +
  // consequences and the page returns to the marketplace for accountability.
  // eslint-disable-next-line no-restricted-syntax -- driven by URL-derived activeSubStopId
  useEffect(() => {
    if (!isStoryLabPreview) return;
    if ((applications ?? []).length === 0) return;
    const storyApp = (applications ?? []).find(
      (app) => app.application_id === STORY_LAB_ENDORSEMENT_APPLICATION_ID,
    );
    if (!storyApp) return;
    if (shouldStoryLabOpenModal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs story-lab modal open state from URL params
      setSelectedApp(storyApp);
      setModalMode("endorse");
      setModalInitialStep(4);
      setModalOpen(true);
    } else {
      setModalOpen(false);
    }
  }, [isStoryLabPreview, shouldStoryLabOpenModal, applications]);

  // ── Modal handlers ──

  const handleViewDetails = (application: EndorsementApplication) => {
    setSelectedApp(application);
    setModalMode("endorse");
    setModalInitialStep(1);
    setModalOpen(true);
  };

  const handleViewEndorsement = (application: EndorsementApplication) => {
    setSelectedApp(application);
    setModalMode("view");
    setModalInitialStep(1);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (
      txStep !== "signing" &&
      txStep !== "approving" &&
      txStep !== "bidding"
    ) {
      setModalOpen(false);
      setSelectedApp(null);
      resetTransaction();
    }
  };

  const handlePlaceEndorsement = async (
    app: EndorsableApplication,
    amount: string,
  ) => {
    await submitEndorsement(app, amount, effectiveBalanceWei);
  };

  // eslint-disable-next-line no-restricted-syntax -- DOM visibilitychange subscription with runtime callback deps
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refetchEndorsements();
        refetchTokenData();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refetchEndorsements, refetchTokenData]);

  // eslint-disable-next-line no-restricted-syntax -- subscribing to custom DOM event for cross-component state refresh
  useEffect(() => {
    const handler = () => refetchEndorsements();
    window.addEventListener("vetted:endorsement-refresh", handler);
    return () =>
      window.removeEventListener("vetted:endorsement-refresh", handler);
  }, [refetchEndorsements]);

  // ── Early returns ──

  if (!isConnected) {
    return (
      <Card className="rounded-xl border border-border bg-card">
        <CardContent className="p-12 text-center">
          <Coins className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">
            Please connect your wallet to view and endorse applications
          </p>
        </CardContent>
      </Card>
    );
  }

  // Hybrid resolution: prefer the chain read (authoritative), fall back to
  // the DB-cached value when the chain hasn't responded yet — survives RPC
  // outages instead of rendering "0" when reads silently return undefined.
  const effectiveStakeWei: bigint | undefined = stakeInfo
    ? stakeInfo[0]
    : tokenAmountToWei(stakeBalanceDb?.stakedAmount);
  const effectiveBalanceWei: bigint | undefined =
    balance !== undefined ? balance : tokenAmountToWei(tokenBalanceDb?.balance);

  const userStake =
    effectiveStakeWei !== undefined ? formatEther(effectiveStakeWei) : "0";
  const requiredStake = minimumStake ? formatEther(minimumStake) : "0";
  const meetsMinimumStake = parseFloat(userStake) >= parseFloat(requiredStake);
  const shortAddress = address
    ? `${address.substring(0, 6)}...${address.substring(38)}`
    : "";
  const formattedBalance =
    effectiveBalanceWei !== undefined
      ? parseFloat(formatEther(effectiveBalanceWei)).toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })
      : null;

  const isOnSepolia = chain?.id === sepolia.id;

  return (
    <div
      className="min-h-screen space-y-6 min-w-0 overflow-x-hidden"
      {...dataTourTarget(TOUR_TARGETS.endorsementMarketplace)}
    >
      <EndorsementHeader
        address={address!}
        shortAddress={shortAddress}
        formattedBalance={formattedBalance}
        isOnSepolia={isOnSepolia}
        chainName={chain?.name}
        onSwitchToSepolia={() => switchChain({ chainId: sepolia.id })}
        guildEndorsements={userEndorsements}
        allEndorsements={allUserEndorsements}
        earningsData={earningsData}
        applications={applications ?? []}
        allGuilds={allGuilds}
        memberGuildCount={memberGuildCount}
      />

      {!meetsMinimumStake && (
        <Card
          className={`rounded-xl border ${STATUS_COLORS.warning.border} ${STATUS_COLORS.warning.bgSubtle}`}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle
              className={`w-5 h-5 ${STATUS_COLORS.warning.icon} shrink-0`}
            />
            <p className="text-sm text-muted-foreground">
              You need to stake at least{" "}
              <strong className="text-foreground">{requiredStake} VETD</strong>{" "}
              in this guild to endorse applications. Current stake:{" "}
              {parseFloat(userStake).toFixed(2)} VETD
            </p>
          </CardContent>
        </Card>
      )}

      <DataSection
        isLoading={endorsementsLoading}
        skeleton={
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-xl tracking-tight flex items-center gap-3">
                Active Endorsements
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard className="hidden lg:block" />
              <SkeletonCard className="hidden xl:block" />
            </div>
          </div>
        }
      >
        <ActiveEndorsementsList
          endorsements={userEndorsements}
          walletAddress={address}
          guildId={allGuilds ? undefined : guildId}
          guildName={allGuilds ? "any guild" : guildName}
          onSelectEndorsement={handleViewEndorsement}
        />
      </DataSection>

      {/* Job applications */}
      <div
        className="mt-8"
        {...dataTourTarget(TOUR_TARGETS.endorsementApplicationsList)}
      >
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2 className="font-display font-bold text-xl tracking-tight">
            Job applications
          </h2>
          {!loading && (
            <div
              className="flex items-center gap-3"
              {...dataTourTarget(TOUR_TARGETS.endorsementFilters)}
            >
              <Input
                placeholder="Search applications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs h-8 text-xs"
              />
              <span className="font-mono text-xs text-muted-foreground">
                {applicationsTotalItems} total
              </span>
            </div>
          )}
        </div>
        <ApplicationsGrid
          applications={filteredApplications}
          loading={loading}
          onSelectApplication={handleViewDetails}
          onViewExistingBid={handleViewEndorsement}
          emptyTitle="No Active Applications"
          emptyDescription="There are no open applications to endorse right now."
          markedApplicationId={
            isStoryLabPreview ? STORY_LAB_ENDORSEMENT_APPLICATION_ID : undefined
          }
          markedCardProps={dataTourTarget(
            TOUR_TARGETS.endorsementCandidateCard,
          )}
          markedCtaProps={dataTourTarget(
            TOUR_TARGETS.endorsementCandidateBidCta,
          )}
        />
        {!loading && (
          <PaginationNav
            page={applicationsPage}
            totalPages={applicationsTotalPages}
            onPageChange={setApplicationsPage}
            className="mt-6"
          />
        )}
      </div>

      {/* Unified Endorse Candidate Modal — single 4-step wizard for both
          "endorse" (place a new bid) and "view" (review an existing
          endorsement from MyActiveEndorsements). */}
      <EndorseCandidateModal
        application={selectedApp}
        isOpen={modalOpen}
        onClose={handleCloseModal}
        mode={modalMode}
        initialStep={modalInitialStep}
        userBalance={
          effectiveBalanceWei !== undefined
            ? formatEther(effectiveBalanceWei)
            : "0"
        }
        userStake={userStake}
        minimumBid={minimumBidFormatted}
        onPlaceEndorsement={
          modalMode === "endorse" && meetsMinimumStake
            ? handlePlaceEndorsement
            : undefined
        }
        txStep={txStep}
        txError={txError}
        approvalTxHash={approvalTxHash}
        bidTxHash={bidTxHash}
        existingBid={selectedApp?.current_bid}
      />
    </div>
  );
}
