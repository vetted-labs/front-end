"use client";

import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { governanceApi, blockchainApi } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Clock,
  Users,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { GovernanceVoteForm } from "@/components/governance/GovernanceVoteForm";
import { GovernanceResultsBanner } from "@/components/governance/GovernanceResultsBanner";
import { VotingPowerBar } from "@/components/governance/VotingPowerBar";
import type { GovernanceProposalDetail } from "@/types";
import { PROPOSAL_TYPE_LABELS } from "@/types";
import { formatDate as formatDateShared, truncateAddress, formatDeadline } from "@/lib/utils";

/* ─── Helpers ──────────────────────────────────────────────────── */

function getTimeRemaining(deadline: string | null | undefined) {
  if (!deadline) return null;
  return formatDeadline(deadline, "Voting ended");
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return formatDateShared(dateStr);
}

function formatVETD(amount: number | string | null | undefined): string {
  if (amount == null) return "0";
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(n)) return "0";
  return n % 1 === 0 ? n.toLocaleString() : n.toFixed(2);
}

function truncateWallet(wallet: string) {
  return truncateAddress(wallet) || "Unknown";
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "active") return "default";
  if (status === "passed") return "default";
  if (status === "rejected") return "destructive";
  return "secondary";
}

function statusLabel(status: string, finalized: boolean) {
  if (finalized) return status === "passed" ? "Passed" : "Rejected";
  if (status === "active") return "Active";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/* ─── Component ────────────────────────────────────────────────── */

export function GovernanceProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const proposalId = params.proposalId as string;

  const {
    data: proposal,
    isLoading,
    refetch,
  } = useFetch<GovernanceProposalDetail>(
    () => governanceApi.getProposal(proposalId) as Promise<GovernanceProposalDetail>,
  );

  const { data: stakeData } = useFetch(
    () => blockchainApi.getStakeBalance(address as string),
    { skip: !address },
  );

  const { execute: submitVote } = useApi();

  const votingPower = parseFloat(stakeData?.stakedAmount || "0");

  const handleVote = async (vote: "for" | "against" | "abstain", reason: string) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }
    await submitVote(
      () => governanceApi.vote(proposalId, { vote, reason }, address),
      {
        onSuccess: () => {
          toast.success("Vote submitted successfully!");
          refetch();
        },
        onError: (msg) => toast.error(msg || "Failed to submit vote"),
      },
    );
  };

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ─── Not found ─── */
  if (!proposal) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Governance
        </button>
        <div className="text-center py-16">
          <p className="text-lg font-semibold mb-1">Proposal not found</p>
          <p className="text-sm text-muted-foreground">
            This proposal may have been removed or the ID is invalid.
          </p>
        </div>
      </div>
    );
  }

  /* ─── Derived state ─── */
  const totalVotes = proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
  const forPercent = totalVotes > 0 ? (proposal.votes_for / totalVotes) * 100 : 0;
  const againstPercent = totalVotes > 0 ? (proposal.votes_against / totalVotes) * 100 : 0;
  const abstainPercent = totalVotes > 0 ? (proposal.votes_abstain / totalVotes) * 100 : 0;
  const quorumPercent = proposal.quorum_required > 0
    ? (proposal.total_voting_power / proposal.quorum_required) * 100
    : 0;
  const canVote = proposal.status === "active" && !proposal.has_voted && !!address;
  const isFinalized = proposal.finalized;
  const deadlineStr = getTimeRemaining(proposal.voting_deadline);
  const createdDate = formatDate(proposal.created_at);
  const deadlineDate = formatDate(proposal.voting_deadline);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ─── Back link ─── */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Governance
      </button>

      {/* ─── Hero header card ─── */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
            {proposal.title}
          </h1>
          <Badge
            variant={statusVariant(proposal.status)}
            className="shrink-0 text-sm px-3 py-1"
          >
            {statusLabel(proposal.status, isFinalized)}
          </Badge>
        </div>

        {/* Description directly in header — it&apos;s the proposal identity */}
        <p className="text-base text-muted-foreground leading-relaxed mb-5 whitespace-pre-wrap">
          {proposal.description}
        </p>

        {/* Metadata chips row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="font-normal">
            {PROPOSAL_TYPE_LABELS[proposal.proposal_type] || proposal.proposal_type}
          </Badge>
          {proposal.guild_name && (
            <Badge variant="secondary" className="font-normal">
              {proposal.guild_name}
            </Badge>
          )}
          <span>
            by {proposal.proposer_name || truncateWallet(proposal.proposer_wallet)}
          </span>
          <span className="tabular-nums">{formatVETD(proposal.stake_amount)} VETD staked</span>
          {createdDate && <span>{createdDate}</span>}
        </div>

        {/* Active: countdown + quick stats row */}
        {!isFinalized && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 pt-4 border-t border-border text-sm">
            {deadlineStr && (
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Clock className="w-4 h-4 text-primary" />
                {deadlineStr}
              </span>
            )}
            {!deadlineStr && deadlineDate && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-4 h-4" />
                Ends {deadlineDate}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-4 h-4" />
              {proposal.voter_count} voter{proposal.voter_count !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Zap className="w-4 h-4" />
              {formatVETD(proposal.total_voting_power)} / {formatVETD(proposal.quorum_required)} VETD quorum
            </span>
          </div>
        )}
      </div>

      {/* ─── Finalized: Results Banner ─── */}
      {isFinalized && proposal.outcome && (
        <div className="mb-6">
          <GovernanceResultsBanner
            outcome={proposal.outcome}
            approvalPercent={proposal.approval_percent || forPercent}
            quorumReached={proposal.quorum_reached ?? quorumPercent >= 100}
            voterCount={proposal.voter_count}
          />
        </div>
      )}

      {/* ─── Layout ─── */}
      {isFinalized ? (
        /* ══════ FINALIZED: full-width sections ══════ */
        <div className="space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="For" value={`${forPercent.toFixed(0)}%`} sub={`${formatVETD(proposal.votes_for)} VETD`} color="text-green-500" />
            <StatCard label="Against" value={`${againstPercent.toFixed(0)}%`} sub={`${formatVETD(proposal.votes_against)} VETD`} color="text-red-500" />
            <StatCard label="Abstain" value={`${abstainPercent.toFixed(0)}%`} sub={`${formatVETD(proposal.votes_abstain)} VETD`} color="text-muted-foreground" />
            <StatCard
              label="Quorum"
              value={quorumPercent >= 100 ? "Reached" : `${Math.min(quorumPercent, 100).toFixed(0)}%`}
              sub={`${formatVETD(proposal.total_voting_power)} / ${formatVETD(proposal.quorum_required)}`}
              color={quorumPercent >= 100 ? "text-green-500" : "text-amber-500"}
            />
          </div>

          {/* Vote bar */}
          <div className="rounded-xl border border-border bg-card p-5">
            <VotingPowerBar
              forPercent={forPercent}
              againstPercent={againstPercent}
              abstainPercent={abstainPercent}
            />
          </div>

          {/* Your vote + Type-specific details side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Your Vote */}
            {proposal.has_voted && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Your Vote
                </h3>
                <div className="flex items-center gap-3">
                  {proposal.my_vote === "for" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : proposal.my_vote === "against" ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-muted-foreground/20 inline-block" />
                  )}
                  <span className="text-lg font-semibold capitalize">{proposal.my_vote}</span>
                </div>
              </div>
            )}

            {/* Type-specific */}
            {proposal.proposal_type === "parameter_change" && proposal.parameter_name && (
              <div className="rounded-xl border border-border bg-card p-5">
                <ParameterChangeSection
                  parameterName={proposal.parameter_name}
                  currentValue={proposal.current_value}
                  proposedValue={proposal.proposed_value}
                />
              </div>
            )}
            {proposal.proposal_type === "guild_master_election" && proposal.nominee_wallet && (
              <div className="rounded-xl border border-border bg-card p-5">
                <NomineeSection
                  nomineeName={proposal.nominee_name}
                  nomineeWallet={proposal.nominee_wallet}
                />
              </div>
            )}
          </div>

          {/* Vote History */}
          {proposal.votes && proposal.votes.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <VoteHistorySection votes={proposal.votes} />
            </div>
          )}
        </div>
      ) : (
        /* ══════ ACTIVE: 2-column layout ══════ */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main content */}
          <div className="lg:col-span-7 space-y-6">
            {/* Type-specific details */}
            {proposal.proposal_type === "parameter_change" && proposal.parameter_name && (
              <div className="rounded-xl border border-border bg-card p-5">
                <ParameterChangeSection
                  parameterName={proposal.parameter_name}
                  currentValue={proposal.current_value}
                  proposedValue={proposal.proposed_value}
                />
              </div>
            )}

            {proposal.proposal_type === "guild_master_election" && proposal.nominee_wallet && (
              <div className="rounded-xl border border-border bg-card p-5">
                <NomineeSection
                  nomineeName={proposal.nominee_name}
                  nomineeWallet={proposal.nominee_wallet}
                />
              </div>
            )}

            {/* Vote History */}
            {proposal.votes && proposal.votes.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <VoteHistorySection votes={proposal.votes} />
              </div>
            )}

            {/* Empty state when nothing extra to show */}
            {(!proposal.votes || proposal.votes.length === 0) &&
              proposal.proposal_type !== "parameter_change" &&
              proposal.proposal_type !== "guild_master_election" && (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No votes yet. Be the first to vote on this proposal.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="order-first lg:order-none lg:col-span-5 lg:sticky lg:top-24 lg:self-start space-y-4">
            {/* Voting Status */}
            <div className="rounded-xl border border-border border-t-2 border-t-primary bg-card p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Voting Status
              </h3>

              {/* Deadline */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Deadline</span>
                <span className="text-sm font-semibold">
                  {deadlineStr || deadlineDate || "Open"}
                </span>
              </div>

              {/* Quorum */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Quorum</span>
                  <span className="tabular-nums font-medium">
                    {formatVETD(proposal.total_voting_power)} / {formatVETD(proposal.quorum_required)} VETD
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${quorumPercent >= 100 ? "bg-green-500" : "bg-primary"}`}
                    style={{ width: `${Math.min(quorumPercent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Vote Breakdown */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Vote Breakdown</p>
                <VotingPowerBar
                  forPercent={forPercent}
                  againstPercent={againstPercent}
                  abstainPercent={abstainPercent}
                />
              </div>

              {/* Voter count */}
              <div className="flex justify-between text-sm pt-3 border-t border-border">
                <span className="text-muted-foreground">Voters</span>
                <span className="font-semibold tabular-nums">{proposal.voter_count}</span>
              </div>
            </div>

            {/* Vote Form */}
            {canVote && (
              <div className="rounded-xl border border-border bg-card p-5">
                <GovernanceVoteForm
                  votingPower={votingPower}
                  onSubmit={handleVote}
                />
              </div>
            )}

            {/* Already Voted */}
            {proposal.has_voted && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">
                      You voted: <span className="capitalize">{proposal.my_vote}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Your vote has been recorded.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stat Card ────────────────────────────────────────────────── */

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground tabular-nums mt-0.5">{sub}</p>
    </div>
  );
}

/* ─── Sub-sections ─────────────────────────────────────────────── */

function ParameterChangeSection({
  parameterName,
  currentValue,
  proposedValue,
}: {
  parameterName: string;
  currentValue?: string;
  proposedValue?: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Parameter Change
      </h3>
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-lg bg-red-500/5 border border-red-500/20 p-3">
          <p className="text-xs text-muted-foreground mb-0.5">Current</p>
          <p className="text-sm font-bold text-red-500">{currentValue ?? "\u2014"}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 rounded-lg bg-green-500/5 border border-green-500/20 p-3">
          <p className="text-xs text-muted-foreground mb-0.5">Proposed</p>
          <p className="text-sm font-bold text-green-500">{proposedValue ?? "\u2014"}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Parameter: <span className="font-medium text-foreground">{parameterName}</span></p>
    </div>
  );
}

function NomineeSection({
  nomineeName,
  nomineeWallet,
}: {
  nomineeName?: string;
  nomineeWallet: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Nominee
      </h3>
      <p className="text-base font-semibold">
        {nomineeName || "Nominee"}
      </p>
      <p className="text-sm text-muted-foreground font-mono mt-0.5">
        {nomineeWallet}
      </p>
    </div>
  );
}

function VoteHistorySection({ votes }: { votes: GovernanceProposalDetail["votes"] }) {
  if (!votes || votes.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Vote History
        </h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {votes.length} vote{votes.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="divide-y divide-border">
        {votes.map((v) => (
          <div key={v.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {v.voter_name || truncateWallet(v.voter_wallet)}
              </p>
              {v.reason && (
                <p className="text-sm text-muted-foreground mt-0.5 italic line-clamp-2">
                  &quot;{v.reason}&quot;
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant={
                  v.vote === "for" ? "default"
                    : v.vote === "against" ? "destructive"
                    : "secondary"
                }
                className="capitalize"
              >
                {v.vote}
              </Badge>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatVETD(v.voting_power)} VETD
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
