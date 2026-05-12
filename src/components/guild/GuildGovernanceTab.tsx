"use client";

import Link from "next/link";
import { CheckCircle2, X, ListChecks } from "lucide-react";
import { GuildQueueRow } from "./GuildQueueRow";
import { useCountdown } from "@/lib/hooks/useCountdown";
import type { GuildQueueItem, GuildWorkspaceProposal } from "@/types";

interface GuildGovernanceTabProps {
  guildId: string;
  /**
   * Proposals scoped to this guild. Provided by the workspace container
   * (which merges `governanceApi.getActiveProposals` with a finalized-status
   * query and filters client-side by guildId).
   */
  proposals?: GuildWorkspaceProposal[];
}

function proposalToQueueItem(p: GuildWorkspaceProposal): GuildQueueItem {
  return {
    id: p.id,
    bucket: "due_soon",
    type: "governance",
    phase: "vote",
    title: p.title,
    subjectName: p.proposerName,
    deadline: p.deadline,
    commitsCompleted: p.votesCast,
    commitsRequired: p.totalVoters,
    supportPercent: p.supportPercent,
    actionLabel: p.hasVoted ? "View vote" : "Cast vote",
    actionPrimary: !p.hasVoted,
    actionHref: `/expert/governance/${encodeURIComponent(p.id)}`,
  };
}

/**
 * Governance tab inside the private workspace. Shows open proposals (with
 * urgency-based row borders) and a recently-passed/rejected list below.
 *
 * Right sidebar surfaces the viewer's governance record + a CTA to author
 * a new proposal. When the Phase 5 endpoint is missing, we empty-state.
 */
export function GuildGovernanceTab({ guildId: _guildId, proposals }: GuildGovernanceTabProps) {
  void _guildId;
  const list = proposals ?? [];
  const open = list.filter((p) => p.status === "open");
  const past = list.filter((p) => p.status !== "open");
  const unvotedCount = open.filter((p) => !p.hasVoted).length;
  const matchedMajority = past.filter((p) => p.myVote && p.status === "passed" && p.myVote === "for").length
    + past.filter((p) => p.myVote && p.status === "rejected" && p.myVote === "against").length;
  const votesCast = past.filter((p) => p.hasVoted).length;
  const participation = past.length > 0 ? Math.round((votesCast / past.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div>
          <SectionHead
            title="Open proposals"
            countLabel={unvotedCount > 0 ? `${unvotedCount} unvoted` : undefined}
            tone="urgent"
          />
          {open.length === 0 ? (
            <Empty text="No open proposals right now." />
          ) : (
            <div className="space-y-2">
              {open.map((p) => (
                <ProposalRow key={p.id} proposal={p} />
              ))}
            </div>
          )}
        </div>

        {past.length > 0 && (
          <div>
            <SectionHead title="Recently decided" />
            <div className="space-y-2">
              {past.map((p) => (
                <PastProposalRow key={p.id} proposal={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-3.5">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Your governance record
          </div>
          <Stat label="Votes cast" value={`${votesCast} of ${past.length || 0}`} />
          <Stat
            label="Participation rate"
            value={`${participation}%`}
            tone={participation >= 70 ? "positive" : "warning"}
          />
          <Stat label="Matched majority" value={`${matchedMajority} of ${votesCast}`} />
          <Stat label="Proposals authored" value="—" last />
        </div>

        {participation < 70 && past.length > 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning/[0.05] p-4">
            <div className="mb-1 text-sm font-semibold text-foreground">
              Participation below 70%
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Members below 70% participation lose proposal authoring rights.
              Cast a vote on the open proposals above.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Propose change
          </div>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            Senior+ members can author proposals. Requires 5 co-sponsors before
            going to vote.
          </p>
          <Link
            href="/expert/governance/create"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ListChecks className="h-3.5 w-3.5" />
            New proposal
          </Link>
        </div>
      </aside>
    </div>
  );
}

function ProposalRow({ proposal }: { proposal: GuildWorkspaceProposal }) {
  const countdown = useCountdown(proposal.deadline ?? null);
  const isUrgent =
    proposal.deadline != null && countdown.remaining > 0 && countdown.remaining < 24 * 60 * 60 * 1000;
  const variant = isUrgent ? "hot" : countdown.remaining < 3 * 24 * 60 * 60 * 1000 ? "warm" : "default";
  return <GuildQueueRow item={proposalToQueueItem(proposal)} variant={variant} />;
}

function PastProposalRow({ proposal }: { proposal: GuildWorkspaceProposal }) {
  const passed = proposal.status === "passed";
  const Icon = passed ? CheckCircle2 : X;
  const tone = passed
    ? "bg-positive/10 border-positive/25 text-positive"
    : "bg-negative/10 border-negative/25 text-negative";

  const tagTone = passed
    ? "bg-positive/10 text-positive border-positive/25"
    : "bg-negative/10 text-negative border-negative/25";

  return (
    <div className="grid grid-cols-[44px_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 opacity-90 sm:gap-3.5">
      <div className={`flex h-11 w-11 items-center justify-center rounded-lg border ${tone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
          <span className="truncate">{proposal.title}</span>
          <span
            className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] ${tagTone}`}
          >
            {passed ? "Passed" : "Rejected"}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {proposal.supportPercent}% in favor ({proposal.votesCast} of {proposal.totalVoters})
          {proposal.myVote && (
            <>
              {" · "}You voted:{" "}
              <strong
                className={
                  (passed && proposal.myVote === "for") ||
                  (!passed && proposal.myVote === "against")
                    ? "text-positive"
                    : "text-negative"
                }
              >
                {proposal.myVote === "for" ? "Yes" : proposal.myVote === "against" ? "No" : "Abstain"}
              </strong>
            </>
          )}
        </div>
      </div>
      <div className="font-display text-sm text-foreground">
        {proposal.deadline ? new Date(proposal.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
      </div>
      <Link
        href={`/expert/governance/${encodeURIComponent(proposal.id)}`}
        className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
      >
        View record
      </Link>
    </div>
  );
}

function SectionHead({
  title,
  countLabel,
  tone,
}: {
  title: string;
  countLabel?: string;
  tone?: "urgent";
}) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </span>
        {countLabel && (
          <span
            className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] ${
              tone === "urgent"
                ? "bg-negative/10 text-negative border-negative/30"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {countLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
  last,
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning";
  last?: boolean;
}) {
  const valueClass =
    tone === "positive"
      ? "text-positive"
      : tone === "warning"
        ? "text-warning"
        : "text-foreground";
  return (
    <div
      className={`flex items-center justify-between py-2 ${
        last ? "" : "border-b border-border"
      }`}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-display text-base ${valueClass}`}>{value}</span>
    </div>
  );
}
