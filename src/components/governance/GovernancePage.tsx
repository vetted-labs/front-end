"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { governanceApi, blockchainApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FileText,
  Plus,
  ChevronDown,
  Loader2,
  Vote,
  Clock,
  TrendingUp,
  Scale,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { GovernanceProposalCard } from "@/components/governance/GovernanceProposalCard";
import { LiveVoteBanner } from "@/components/governance/LiveVoteBanner";
import { GovernanceStats } from "@/components/governance/GovernanceStats";
import type { GovernanceProposalDetail, GovernanceFilterStatus } from "@/types";
import { computeVoteWeight } from "@/config/constants";
import { STATUS_COLORS } from "@/config/colors";
import { Input } from "@/components/ui/input";
import { cn, formatDeadline } from "@/lib/utils";
import { TOUR_TARGETS, dataTourTarget } from "@/components/expert/onboarding/tourTargets";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";
import {
  STORY_LAB_GOVERNANCE_PROPOSAL_ID,
  withStoryLabGovernance,
} from "@/components/expert/story-lab/storyLabFixtures";

const FILTERS: { value: GovernanceFilterStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "passed", label: "Passed" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export default function GovernancePage() {
  const router = useRouter();
  const { address } = useAccount();
  const { isActive: isStoryLabPreview } = useStoryLabContext();
  const [filter, setFilter] = useState<GovernanceFilterStatus>("active");
  const [showPast, setShowPast] = useState(true);
  const [search, setSearch] = useState("");
  const filterRef = useRef(filter);
  // eslint-disable-next-line react-hooks/refs -- intentional: keep filterRef in sync so fetchProposals can read the latest filter without re-creating the callback
  filterRef.current = filter;

  const fetchProposals = useCallback(async () => {
    const params = filterRef.current !== "all" ? { status: filterRef.current } : undefined;
    const response = await governanceApi.getProposals(params);
    return Array.isArray(response) ? response : [];
  }, []);

  const { data: rawProposals, isLoading, refetch } = useFetch<GovernanceProposalDetail[]>(
    fetchProposals,
    {
      onError: () => toast.error("Failed to load proposals"),
    }
  );

  // Inject the synthetic story-lab proposal so the gated tour marker has
  // something to anchor on while story preview mode is active.
  const proposals = useMemo(
    () => (isStoryLabPreview ? withStoryLabGovernance(rawProposals ?? undefined) : rawProposals),
    [rawProposals, isStoryLabPreview]
  );

  // Fetch reputation for voting power display
  const { data: reputationData } = useFetch(
    () => blockchainApi.getReputation(address as string),
    { skip: !address },
  );

  const reputation = reputationData?.score ?? 0;
  const voteWeight = computeVoteWeight(reputation, false);

  const handleFilterChange = (value: GovernanceFilterStatus) => {
    setFilter(value);
    filterRef.current = value;
    refetch();
  };

  // Separate active/pending proposals from past (finalized) proposals
  const { activeProposals, pastProposals, liveProposal } = useMemo(() => {
    if (!proposals) return { activeProposals: [], pastProposals: [], liveProposal: null };

    const q = search.trim().toLowerCase();
    const filtered = q
      ? proposals.filter(p => p.title?.toLowerCase().includes(q))
      : proposals;

    const active: GovernanceProposalDetail[] = [];
    const past: GovernanceProposalDetail[] = [];
    let live: GovernanceProposalDetail | null = null;

    for (const p of filtered) {
      if (p.status === "active" && !p.finalized) {
        if (!live && (p.votes_for > 0 || p.votes_against > 0)) {
          live = p;
        } else {
          active.push(p);
        }
      } else if (p.finalized || p.status === "passed" || p.status === "rejected") {
        past.push(p);
      } else {
        active.push(p);
      }
    }

    return { activeProposals: active, pastProposals: past, liveProposal: live };
  }, [proposals, search]);

  // Hero summary metrics
  const totalActive = (liveProposal ? 1 : 0) + activeProposals.length;
  const myVotes = useMemo(
    () => (proposals ?? []).filter((p) => p.has_voted).length,
    [proposals],
  );
  const nextDeadline = useMemo(() => {
    const all = [liveProposal, ...activeProposals].filter(
      (p): p is GovernanceProposalDetail => !!p && !!p.voting_deadline,
    );
    if (all.length === 0) return null;
    const soonest = all.reduce((min, p) =>
      new Date(p.voting_deadline).getTime() < new Date(min.voting_deadline).getTime() ? p : min,
    );
    return soonest.voting_deadline;
  }, [liveProposal, activeProposals]);

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Eyebrow + display heading ── */}
        <section
          className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"
          {...dataTourTarget(TOUR_TARGETS.governanceHero)}
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display">
              Governance
            </h1>
          </div>
          <button
            onClick={() => router.push("/expert/governance/create")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:translate-y-[-1px] transition-all shadow-sm self-start"
            {...dataTourTarget(TOUR_TARGETS.governanceCreateCta)}
          >
            <Plus className="w-4 h-4" />
            Create Proposal
          </button>
        </section>

        {/* ── Hero KPI strip ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" {...dataTourTarget(TOUR_TARGETS.governanceVoteWeight)}>
          <KpiTile
            icon={<Vote className="w-4 h-4" />}
            label="Active Proposals"
            value={totalActive}
            tone="primary"
          />
          <KpiTile
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Your Votes"
            value={myVotes}
            tone="positive"
          />
          <KpiTile
            icon={<Scale className="w-4 h-4" />}
            label="Vote Weight"
            value={`${voteWeight.toFixed(2)}×`}
            tone="info"
          />
          <KpiTile
            icon={<Clock className="w-4 h-4" />}
            label="Next Close"
            value={
              nextDeadline ? formatDeadline(nextDeadline, "Closed") || "—" : "—"
            }
            tone="warning"
          />
        </section>

        {/* ── Live vote banner ── */}
        {liveProposal && (
          <div {...dataTourTarget(TOUR_TARGETS.governanceProposals)}>
            <div {...dataTourTarget(TOUR_TARGETS.governanceProposalCard)}>
              <LiveVoteBanner
                proposal={liveProposal}
                voteWeight={voteWeight}
                onClick={() => router.push(`/expert/governance/${liveProposal.id}`)}
              />
            </div>
          </div>
        )}

        {/* ── Filter chips + search ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                  filter === f.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Input
            placeholder="Search proposals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {/* ── Proposals list ── */}
        <div {...dataTourTarget(TOUR_TARGETS.governanceProposals)}>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !proposals || proposals.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No proposals found"
              description={
                filter === "active"
                  ? "There are no active governance proposals right now."
                  : `No ${filter} proposals to display.`
              }
              action={{
                label: "Create Proposal",
                onClick: () => router.push("/expert/governance/create"),
              }}
            />
          ) : (
            <div className="space-y-10">
              {/* Active section */}
              {activeProposals.length > 0 && (
                <Section
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                  title="Active & Pending"
                  meta={`${activeProposals.length} proposal${activeProposals.length === 1 ? "" : "s"}`}
                >
                  <div className="flex flex-col gap-3">
                    {(() => {
                      const storyIdx = isStoryLabPreview
                        ? activeProposals.findIndex(
                            (p) => p.id === STORY_LAB_GOVERNANCE_PROPOSAL_ID,
                          )
                        : -1;
                      const markedIdx = storyIdx >= 0 ? storyIdx : 0;
                      return activeProposals.map((proposal, idx) => (
                        <div
                          key={proposal.id}
                          {...(idx === markedIdx
                            ? dataTourTarget(TOUR_TARGETS.governanceProposalCard)
                            : {})}
                        >
                          <GovernanceProposalCard
                            proposal={proposal}
                            onClick={() =>
                              router.push(`/expert/governance/${proposal.id}`)
                            }
                          />
                        </div>
                      ));
                    })()}
                  </div>
                </Section>
              )}

              {/* Past section */}
              {pastProposals.length > 0 && (
                <Section
                  icon={<FileText className="w-3.5 h-3.5" />}
                  title="Past Proposals"
                  meta={`${pastProposals.length} closed`}
                  action={
                    <button
                      onClick={() => setShowPast(!showPast)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPast ? "Hide" : "Show all"}
                      <ChevronDown
                        className={cn(
                          "w-3.5 h-3.5 transition-transform duration-300",
                          showPast ? "rotate-180" : "",
                        )}
                      />
                    </button>
                  }
                  tourAttrs={dataTourTarget(TOUR_TARGETS.governancePastSection)}
                >
                  {showPast && (
                    <div className="flex flex-col gap-2">
                      {pastProposals.map((proposal) => (
                        <PastProposalRow
                          key={proposal.id}
                          proposal={proposal}
                          onClick={() =>
                            router.push(`/expert/governance/${proposal.id}`)
                          }
                        />
                      ))}
                    </div>
                  )}
                </Section>
              )}
            </div>
          )}
        </div>

        {/* ── Stats footer ── */}
        {proposals && proposals.length > 0 && (
          <GovernanceStats proposals={proposals} voteWeight={voteWeight} />
        )}
      </div>
    </div>
  );
}

/* ─── Past Proposal Row (compact) ─── */

function PastProposalRow({
  proposal,
  onClick,
}: {
  proposal: GovernanceProposalDetail;
  onClick: () => void;
}) {
  const isPassed = proposal.outcome === "passed" || proposal.status === "passed";
  const totalVotes = proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
  const forPct = totalVotes > 0 ? Math.round((proposal.votes_for / totalVotes) * 100) : 0;
  const againstPct = totalVotes > 0 ? Math.round((proposal.votes_against / totalVotes) * 100) : 0;
  const abstainPct = totalVotes > 0 ? Math.round((proposal.votes_abstain / totalVotes) * 100) : 0;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="grid grid-cols-1 sm:grid-cols-[120px_1fr_180px] items-center gap-3 sm:gap-4 p-5 sm:px-6 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/30 hover:bg-muted/20 transition-colors"
    >
      <div className="flex sm:flex-col items-center sm:items-start gap-2">
        <span className="font-mono text-sm font-medium text-primary">
          #{proposal.id.slice(0, 6)}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold w-fit",
            isPassed ? STATUS_COLORS.positive.badge : STATUS_COLORS.negative.badge,
          )}
        >
          {isPassed ? "Passed" : "Failed"}
        </span>
      </div>

      <div>
        <p className="font-display text-sm font-semibold tracking-tight leading-snug">
          {proposal.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ended{" "}
          {new Date(proposal.voting_deadline).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      <div>
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          {forPct}% For / {againstPct}% Against / {abstainPct}% Abstain
        </p>
        {proposal.has_voted ? (
          <p className={cn("text-xs font-medium mt-0.5", STATUS_COLORS.positive.text)}>
            You voted{" "}
            {proposal.my_vote
              ? proposal.my_vote.charAt(0).toUpperCase() + proposal.my_vote.slice(1)
              : ""}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic mt-0.5">
            Did not participate
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Inline helpers ──────────────────────────────────────────── */

function Section({
  icon,
  title,
  meta,
  action,
  tourAttrs,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  action?: React.ReactNode;
  tourAttrs?: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden" {...tourAttrs}>
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {meta && (
            <span className="text-[11px] text-muted-foreground tabular-nums">{meta}</span>
          )}
          {action}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "primary" | "positive" | "info" | "warning";
}

const KPI_TONE: Record<KpiTileProps["tone"], { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  positive: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  info: { bg: "bg-sky-500/10", text: "text-sky-500" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-500" },
};

function KpiTile({ icon, label, value, tone }: KpiTileProps) {
  const t = KPI_TONE[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
      <span
        className={cn(
          "w-9 h-9 rounded-lg grid place-items-center flex-shrink-0",
          t.bg,
          t.text,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-lg sm:text-xl font-bold text-foreground tabular-nums leading-tight mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}
