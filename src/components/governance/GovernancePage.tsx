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
  BarChart3,
  Star,
  Loader2,
  Vote,
} from "lucide-react";
import { toast } from "sonner";
import { GovernanceProposalCard } from "@/components/governance/GovernanceProposalCard";
import { LiveVoteBanner } from "@/components/governance/LiveVoteBanner";
import { GovernanceStats } from "@/components/governance/GovernanceStats";
import type { GovernanceProposalDetail, GovernanceFilterStatus } from "@/types";
import { computeVoteWeight } from "@/config/constants";
import { STATUS_COLORS } from "@/config/colors";
import { Divider } from "@/components/ui/divider";

const FILTERS: { value: GovernanceFilterStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "passed", label: "Passed" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export default function GovernancePage() {
  const router = useRouter();
  const { address } = useAccount();
  const [filter, setFilter] = useState<GovernanceFilterStatus>("active");
  const [showPast, setShowPast] = useState(true);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const fetchProposals = useCallback(async () => {
    const params = filterRef.current !== "all" ? { status: filterRef.current } : undefined;
    const response = await governanceApi.getProposals(params);
    return Array.isArray(response) ? response : [];
  }, []);

  const { data: proposals, isLoading, refetch } = useFetch<GovernanceProposalDetail[]>(
    fetchProposals,
    {
      onError: () => toast.error("Failed to load proposals"),
    }
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

    const active: GovernanceProposalDetail[] = [];
    const past: GovernanceProposalDetail[] = [];
    let live: GovernanceProposalDetail | null = null;

    for (const p of proposals) {
      if (p.status === "active" && !p.finalized) {
        // The first active proposal with votes is the "live" featured one
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
  }, [proposals]);

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── Hero Section ─── */}
        <section className="pt-14 pb-10 relative">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            {/* Left: Title area */}
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-xs font-medium text-primary uppercase tracking-wider mb-5">
                <Vote className="w-3.5 h-3.5" />
                Protocol Governance
              </div>

              <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight leading-[1.05] mb-4 text-foreground">
                Shape the<br />Protocol
              </h1>

              <p className="text-base text-muted-foreground max-w-lg leading-relaxed mb-7">
                Your voice carries weight. Propose changes, vote on the future of Vetted,
                and hold the protocol accountable. Every vote is permanent, on-chain, and consequential.
              </p>

              {/* Voting Power + Tier badges */}
              <div className="flex items-center gap-8 flex-wrap">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Your Voting Power
                  </span>
                  <span className="font-mono text-3xl font-bold text-primary relative">
                    {voteWeight.toFixed(1)}x
                    <span className="absolute inset-0 -m-1.5 rounded-xl bg-primary/10 animate-pulse pointer-events-none" />
                  </span>
                </div>

                <Divider orientation="vertical" className="h-10" />

                <div className="flex flex-col gap-2">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/8 border border-warning/20 text-xs font-medium text-warning">
                    <Star className="w-3.5 h-3.5" />
                    Expert
                  </span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-xs font-medium text-primary">
                    <BarChart3 className="w-3.5 h-3.5" />
                    {reputation.toLocaleString()} Reputation
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Create button */}
            <div className="flex flex-col items-end gap-4 pt-3 lg:pt-8">
              <button
                onClick={() => router.push("/expert/governance/create")}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-sm font-bold text-white bg-primary hover:translate-y-[-2px] transition-all"
              >
                <Plus className="w-[18px] h-[18px]" />
                Create Proposal
              </button>
            </div>
          </div>
        </section>

        {/* ─── Live Vote Banner ─── */}
        {liveProposal && (
          <LiveVoteBanner
            proposal={liveProposal}
            voteWeight={voteWeight}
            onClick={() => router.push(`/expert/governance/${liveProposal.id}`)}
          />
        )}

        {/* ─── Filter Tabs ─── */}
        <div className="flex items-center gap-2 mb-5 mt-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === f.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ─── Active & Pending Proposals ─── */}
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
          <>
            {/* Active section */}
            {activeProposals.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-5 pt-2">
                  <div className="flex items-center gap-3 font-display text-xl font-bold tracking-tight">
                    Active & Pending
                    <span className="font-mono text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {activeProposals.length}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {activeProposals.map((proposal) => (
                    <GovernanceProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onClick={() => router.push(`/expert/governance/${proposal.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past Proposals section */}
            {pastProposals.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-5 pt-2">
                  <div className="flex items-center gap-3 font-display text-xl font-bold tracking-tight">
                    Past Proposals
                    <span className="font-mono text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {pastProposals.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPast(!showPast)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-muted/50 border border-border text-xs font-medium text-muted-foreground hover:border-border hover:text-foreground transition-all"
                  >
                    {showPast ? "Hide" : "Show all"}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-300 ${showPast ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                {showPast && (
                  <div className="flex flex-col gap-2">
                    {pastProposals.map((proposal) => (
                      <PastProposalRow
                        key={proposal.id}
                        proposal={proposal}
                        onClick={() => router.push(`/expert/governance/${proposal.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ─── Governance Stats ─── */}
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
      className="grid grid-cols-1 sm:grid-cols-[120px_1fr_180px] items-center gap-3 sm:gap-4 p-6 sm:px-7 rounded-xl border border-border bg-card cursor-pointer hover:border-border transition-colors"
    >
      {/* Meta */}
      <div className="flex sm:flex-col items-center sm:items-start gap-2 sm:gap-2">
        <span className="font-mono text-sm font-medium text-primary">
          #{proposal.id.slice(0, 6)}
        </span>
        <span
          className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-bold w-fit ${
            isPassed
              ? STATUS_COLORS.positive.badge
              : STATUS_COLORS.negative.badge
          }`}
        >
          {isPassed ? "Passed" : "Failed"}
        </span>
      </div>

      {/* Content */}
      <div>
        <p className="font-display text-sm font-medium tracking-tight leading-snug">
          {proposal.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ended {new Date(proposal.voting_deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Votes */}
      <div>
        <p className="font-mono text-xs text-muted-foreground">
          {forPct}% For / {againstPct}% Against / {abstainPct}% Abstain
        </p>
        {proposal.has_voted ? (
          <p className={`text-xs font-medium mt-0.5 ${STATUS_COLORS.positive.text}`}>
            You voted {proposal.my_vote ? proposal.my_vote.charAt(0).toUpperCase() + proposal.my_vote.slice(1) : ""}
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
