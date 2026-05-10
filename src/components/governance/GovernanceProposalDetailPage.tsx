"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { governanceApi, blockchainApi } from "@/lib/api";
import { getPersonAvatar } from "@/lib/avatars";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  Clock,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  Scale,
  FileText,
  Vote,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { GovernanceVoteForm } from "@/components/governance/GovernanceVoteForm";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { GovernanceResultsBanner } from "@/components/governance/GovernanceResultsBanner";
import { VotingPowerBar } from "@/components/governance/VotingPowerBar";
import type { GovernanceProposalDetail } from "@/types";
import { PROPOSAL_TYPE_LABELS } from "@/types";
import { formatDate as formatDateShared, truncateAddress, formatDeadline, cn } from "@/lib/utils";
import { PROPOSAL_STATUS_CONFIG, GOVERNANCE_THRESHOLDS, DEFAULT_GOVERNANCE_THRESHOLD, computeVoteWeight } from "@/config/constants";
import { STATUS_COLORS, VOTE_COLORS, getProposalTypeColors } from "@/config/colors";

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
  return PROPOSAL_STATUS_CONFIG[status]?.variant ?? "secondary";
}

function statusLabel(status: string, finalized: boolean) {
  if (finalized) return status === "passed" ? "Passed" : "Rejected";
  return PROPOSAL_STATUS_CONFIG[status]?.label ?? (status.charAt(0).toUpperCase() + status.slice(1));
}

/* ─── Component ────────────────────────────────────────────────── */

export function GovernanceProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const proposalId = params.proposalId as string;

  const [showVoteConfirm, setShowVoteConfirm] = useState(false);
  const [pendingVote, setPendingVote] = useState<{ type: "for" | "against" | "abstain"; reason: string } | null>(null);

  const {
    data: proposal,
    isLoading,
    refetch,
  } = useFetch<GovernanceProposalDetail>(
    () => governanceApi.getProposal(proposalId) as Promise<GovernanceProposalDetail>,
  );

  const { data: reputationData } = useFetch(
    () => blockchainApi.getReputation(address as string),
    { skip: !address },
  );

  const { data: guildMasterData } = useFetch(
    () => governanceApi.getGuildMaster(proposal?.guild_id as string),
    { skip: !proposal?.guild_id || !address },
  );

  const { execute: submitVote } = useApi();

  const reputation = reputationData?.score ?? 0;
  const isGuildMaster = !!guildMasterData && guildMasterData.walletAddress?.toLowerCase() === address?.toLowerCase();
  const voteWeight = computeVoteWeight(reputation, isGuildMaster);
  const thresholdConfig = GOVERNANCE_THRESHOLDS[proposal?.proposal_type ?? ""] ?? DEFAULT_GOVERNANCE_THRESHOLD;

  const submitVoteConfirmed = async (vote: "for" | "against" | "abstain", reason: string) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }
    await submitVote(
      () => governanceApi.vote(proposalId, { vote, votingPower: voteWeight, reason }, address),
      {
        onSuccess: () => {
          toast.success("Vote submitted successfully!");
          refetch();
        },
        onError: (msg) => toast.error(msg || "Failed to submit vote"),
      },
    );
  };

  const handleVote = async (vote: "for" | "against" | "abstain", reason: string) => {
    setPendingVote({ type: vote, reason });
    setShowVoteConfirm(true);
  };

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading proposal">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ─── Not found ─── */
  if (!proposal) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Governance
        </button>
        <div className="text-center py-16">
          <p className="text-xl font-bold mb-1">Proposal not found</p>
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
  const typeColors = getProposalTypeColors(proposal.proposal_type);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: "Governance", href: "/expert/governance" },
          { label: proposal?.title ?? "Proposal" },
        ]}
      />

      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5 mt-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Governance
      </button>

      {/* Finalized: Results Banner (above two-column workspace) */}
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

      {/* ── Two-column workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — Proposal hero + sectioned content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero card */}
          <section className="rounded-xl border border-border bg-card p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/60" />
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Proposal · #{proposal.id.slice(0, 8)}
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight leading-tight mt-2">
                  {proposal.title}
                </h1>
              </div>
              <Badge
                variant={statusVariant(proposal.status)}
                className="shrink-0 text-sm px-3 py-1 capitalize"
              >
                {statusLabel(proposal.status, isFinalized)}
              </Badge>
            </div>

            {/* Author + chip row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 mb-5">
              <span className="flex items-center gap-2 text-sm">
                <img
                  src={getPersonAvatar(proposal.proposer_name || "Unknown")}
                  alt={proposal.proposer_name || "Proposer"}
                  className="w-6 h-6 rounded-full object-cover bg-muted"
                />
                <span className="font-medium text-foreground">
                  {proposal.proposer_name || truncateWallet(proposal.proposer_wallet)}
                </span>
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
                  typeColors.badge,
                )}
              >
                <FileText className="w-3 h-3" />
                {PROPOSAL_TYPE_LABELS[proposal.proposal_type] || proposal.proposal_type}
              </span>
              {proposal.guild_name && (
                <Pill>{proposal.guild_name}</Pill>
              )}
              <Pill icon={<Scale className="w-3 h-3" />}>{thresholdConfig.label}</Pill>
              {createdDate && (
                <Pill icon={<Calendar className="w-3 h-3" />}>{createdDate}</Pill>
              )}
            </div>

            {/* Active countdown / quick stats */}
            {!isFinalized && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 border-t border-border text-sm">
                {deadlineStr && (
                  <span className="inline-flex items-center gap-2 font-medium text-foreground">
                    <Clock className="w-4 h-4 text-primary" />
                    {deadlineStr}
                  </span>
                )}
                {!deadlineStr && deadlineDate && (
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Ends {deadlineDate}
                  </span>
                )}
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  {proposal.voter_count} voter{proposal.voter_count !== 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Zap className="w-4 h-4" />
                  {formatVETD(proposal.total_voting_power)} / {formatVETD(proposal.quorum_required)} weight
                </span>
              </div>
            )}
          </section>

          {/* Summary / description */}
          <Section icon={<FileText className="w-3.5 h-3.5" />} title="Summary">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {proposal.description}
            </p>
          </Section>

          {/* Type-specific sections */}
          {proposal.proposal_type === "parameter_change" && proposal.parameter_name && (
            <Section icon={<ArrowRight className="w-3.5 h-3.5" />} title="Parameter Change">
              <ParameterChangeBody
                parameterName={proposal.parameter_name}
                currentValue={proposal.current_value}
                proposedValue={proposal.proposed_value}
              />
            </Section>
          )}

          {proposal.proposal_type === "guild_master_election" && proposal.nominee_wallet && (
            <Section icon={<Users className="w-3.5 h-3.5" />} title="Nominee">
              <NomineeBody
                nomineeName={proposal.nominee_name}
                nomineeWallet={proposal.nominee_wallet}
              />
            </Section>
          )}

          {/* Vote breakdown chart (always visible when there are votes) */}
          {totalVotes > 0 && (
            <Section
              icon={<Vote className="w-3.5 h-3.5" />}
              title="Vote Breakdown"
              meta={`${proposal.voter_count} voter${proposal.voter_count !== 1 ? "s" : ""}`}
            >
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <DetailStatCard
                    label="For"
                    value={`${forPercent.toFixed(0)}%`}
                    sub={`${formatVETD(proposal.votes_for)} weight`}
                    colorClass={VOTE_COLORS.for.text}
                  />
                  <DetailStatCard
                    label="Against"
                    value={`${againstPercent.toFixed(0)}%`}
                    sub={`${formatVETD(proposal.votes_against)} weight`}
                    colorClass={VOTE_COLORS.against.text}
                  />
                  <DetailStatCard
                    label="Abstain"
                    value={`${abstainPercent.toFixed(0)}%`}
                    sub={`${formatVETD(proposal.votes_abstain)} weight`}
                    colorClass={VOTE_COLORS.abstain.text}
                  />
                </div>
                <VotingPowerBar
                  forPercent={forPercent}
                  againstPercent={againstPercent}
                  abstainPercent={abstainPercent}
                  large
                />
              </div>
            </Section>
          )}

          {/* Vote History / Comments */}
          {proposal.votes && proposal.votes.length > 0 ? (
            <Section
              icon={<Users className="w-3.5 h-3.5" />}
              title="Vote History"
              meta={`${proposal.votes.length} vote${proposal.votes.length !== 1 ? "s" : ""}`}
            >
              <VoteHistoryBody votes={proposal.votes} />
            </Section>
          ) : (
            !isFinalized && (
              <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No votes yet. Be the first to vote on this proposal.
                </p>
              </div>
            )
          )}
        </div>

        {/* RIGHT — Sticky vote rail */}
        <aside className="lg:col-span-1 lg:sticky lg:top-6 lg:self-start space-y-4">
          <SidebarCard title="Voting Status">
            <KeyValue
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Deadline"
              value={deadlineStr || deadlineDate || "Open"}
            />
            <KeyValue
              icon={<Scale className="w-3.5 h-3.5" />}
              label="Threshold"
              value={thresholdConfig.label}
            />
            <KeyValue
              icon={<Zap className="w-3.5 h-3.5" />}
              label="Quorum"
              value={
                quorumPercent >= 100
                  ? "Reached"
                  : `${Math.min(quorumPercent, 100).toFixed(0)}%`
              }
            />

            {/* Quorum bar */}
            <div className="pt-1">
              <div className="flex justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
                <span>Vote weight</span>
                <span className="tabular-nums normal-case font-mono">
                  {formatVETD(proposal.total_voting_power)} / {formatVETD(proposal.quorum_required)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    quorumPercent >= 100 ? "bg-positive" : "bg-primary",
                  )}
                  style={{ width: `${Math.min(quorumPercent, 100)}%` }}
                />
              </div>
            </div>

            {totalVotes > 0 && (
              <div className="pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                  Breakdown
                </p>
                <VotingPowerBar
                  forPercent={forPercent}
                  againstPercent={againstPercent}
                  abstainPercent={abstainPercent}
                />
              </div>
            )}

            <div className="flex justify-between text-sm pt-3 border-t border-border">
              <span className="text-muted-foreground">Voters</span>
              <span className="font-medium tabular-nums">{proposal.voter_count}</span>
            </div>
          </SidebarCard>

          {/* Vote Form */}
          {canVote && (
            <SidebarCard title="Cast Your Vote">
              <GovernanceVoteForm
                voteWeight={voteWeight}
                reputation={reputation}
                isGuildMaster={isGuildMaster}
                onSubmit={handleVote}
              />
            </SidebarCard>
          )}

          {/* Already voted */}
          {proposal.has_voted && (
            <div
              className={cn(
                "rounded-xl border p-5",
                STATUS_COLORS.positive.border,
                STATUS_COLORS.positive.bgSubtle,
              )}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className={cn("w-5 h-5 shrink-0", STATUS_COLORS.positive.text)} />
                <div>
                  <p className="text-sm font-medium">
                    You voted: <span className="capitalize">{proposal.my_vote}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Your vote has been recorded on-chain.</p>
                </div>
              </div>
            </div>
          )}

          {/* Vote weight info */}
          {!proposal.has_voted && !canVote && !isFinalized && !address && (
            <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center">
              <p className="text-xs text-muted-foreground">
                Connect your wallet to vote on this proposal.
              </p>
            </div>
          )}

          {/* Stake / proposer info */}
          <SidebarCard title="Proposer">
            <div className="flex items-center gap-3">
              <img
                src={getPersonAvatar(proposal.proposer_name || "Unknown")}
                alt={proposal.proposer_name || "Proposer"}
                className="w-9 h-9 rounded-full object-cover bg-muted"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {proposal.proposer_name || truncateWallet(proposal.proposer_wallet)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatVETD(proposal.stake_amount)} VETD staked
                </p>
              </div>
            </div>
          </SidebarCard>
        </aside>
      </div>

      {/* ─── Vote Confirmation Modal ─── */}
      <Modal
        isOpen={showVoteConfirm}
        onClose={() => setShowVoteConfirm(false)}
        title="Confirm Vote"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You are voting{" "}
            <strong className="text-foreground capitalize">{pendingVote?.type}</strong>{" "}
            on this proposal. This action cannot be undone.
          </p>
          {pendingVote?.reason && (
            <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm text-muted-foreground italic">
              &ldquo;{pendingVote.reason}&rdquo;
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowVoteConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pendingVote) submitVoteConfirmed(pendingVote.type, pendingVote.reason);
                setShowVoteConfirm(false);
              }}
            >
              Confirm Vote
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ─── Sub-bodies ─────────────────────────────────────────────── */

function ParameterChangeBody({
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
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex-1 rounded-xl border p-3",
            STATUS_COLORS.negative.bgSubtle,
            STATUS_COLORS.negative.border,
          )}
        >
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
            Current
          </p>
          <p className={cn("text-sm font-bold", STATUS_COLORS.negative.text)}>
            {currentValue ?? "—"}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
        <div
          className={cn(
            "flex-1 rounded-xl border p-3",
            STATUS_COLORS.positive.bgSubtle,
            STATUS_COLORS.positive.border,
          )}
        >
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
            Proposed
          </p>
          <p className={cn("text-sm font-bold", STATUS_COLORS.positive.text)}>
            {proposedValue ?? "—"}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Parameter:{" "}
        <span className="font-medium text-foreground font-mono">{parameterName}</span>
      </p>
    </div>
  );
}

function NomineeBody({
  nomineeName,
  nomineeWallet,
}: {
  nomineeName?: string;
  nomineeWallet: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{nomineeName || "Nominee"}</p>
      <p className="text-sm text-muted-foreground font-mono mt-0.5">{nomineeWallet}</p>
    </div>
  );
}

function VoteHistoryBody({ votes }: { votes: GovernanceProposalDetail["votes"] }) {
  if (!votes || votes.length === 0) return null;

  return (
    <div className="divide-y divide-border">
      {votes.map((v) => (
        <div
          key={v.id}
          className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
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
            <span
              className={cn(
                "inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                v.vote === "for"
                  ? STATUS_COLORS.positive.badge
                  : v.vote === "against"
                    ? STATUS_COLORS.negative.badge
                    : STATUS_COLORS.neutral.badge,
              )}
            >
              {v.vote}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums font-mono">
              {(v.vote_weight ?? v.voting_power).toFixed(2)}x
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Inline helpers ───────────────────────────────────────────── */

function Section({
  icon,
  title,
  meta,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        {meta && (
          <span className="text-[11px] text-muted-foreground tabular-nums">{meta}</span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function KeyValue({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-sm text-foreground font-medium leading-snug truncate">{value}</p>
      </div>
    </div>
  );
}

function Pill({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs font-medium text-foreground">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      {children}
    </span>
  );
}

function DetailStatCard({
  label,
  value,
  sub,
  colorClass,
}: {
  label: string;
  value: string;
  sub: string;
  colorClass: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-1">
        {label}
      </p>
      <p className={cn("text-2xl font-bold tabular-nums font-display", colorClass)}>{value}</p>
      <p className="text-[10.5px] text-muted-foreground tabular-nums mt-0.5">{sub}</p>
    </div>
  );
}
