"use client";

import type { ReactNode } from "react";
import type { AnalyticsCandidate } from "@/types/analytics";
import { formatBidAmount, getScoreLabel, sortAnalyticsCandidates } from "./job-detail-helpers";

interface CandidateRankingTableProps {
  candidates: AnalyticsCandidate[];
  selectedCandidateId: string | null;
  onSelectCandidate: (candidateId: string) => void;
  /**
   * Optional render-prop slot. When provided, the returned node is shown
   * directly under the score in the Vetting cell. Used by Phase 4 (VET-85)
   * to inject a per-candidate consensus-spread bar without the orchestrator
   * having to reach into row internals.
   */
  renderSpreadBar?: (candidate: AnalyticsCandidate) => ReactNode;
}

const STATUS_LABELS: Record<AnalyticsCandidate["analyticsStatus"], string> = {
  endorsed: "Endorsed",
  vetted_only: "Vetted only",
  reviewing: "Reviewing",
  rejected: "Rejected",
  accepted: "Accepted",
  needs_tiebreaker: "Tiebreaker",
  not_started: "Not started",
};

export function CandidateRankingTable({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  renderSpreadBar,
}: CandidateRankingTableProps) {
  const sortedCandidates = sortAnalyticsCandidates(candidates);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground">Candidate ranking</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Sorted by aligned consensus, selected endorsers, endorsement amount.
          </p>
        </div>
        <div className="hidden gap-2 md:flex">
          <span className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">All {candidates.length}</span>
          <span className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Endorsed {candidates.filter((candidate) => candidate.analyticsStatus === "endorsed").length}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] table-fixed border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="w-[36%] px-3 py-3 font-semibold">Candidate</th>
              <th className="w-[18%] px-3 py-3 text-right font-semibold">Vetting</th>
              <th className="w-[14%] px-3 py-3 text-right font-semibold">Endorsers</th>
              <th className="w-[18%] px-3 py-3 text-right font-semibold">Selected amount</th>
              <th className="w-[14%] px-3 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedCandidates.map((candidate, index) => {
              const selected = candidate.id === selectedCandidateId;
              return (
                <tr
                  key={candidate.id}
                  className={selected ? "border-b border-border bg-primary/10" : "border-b border-border/70"}
                >
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onSelectCandidate(candidate.id)}
                      className="flex w-full min-w-0 items-center gap-3 text-left"
                    >
                      <span className="grid h-7 w-7 flex-none place-items-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                        {candidate.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{candidate.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{candidate.headline ?? "No headline"}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-semibold text-foreground">
                    <div className="flex flex-col items-end gap-1">
                      <span>{getScoreLabel(candidate)}</span>
                      {renderSpreadBar ? (
                        <span className="w-full max-w-[140px]">{renderSpreadBar(candidate)}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-muted-foreground">
                    {candidate.selectedEndorserCount}/{Math.max(candidate.selectedEndorserCount, candidate.bids.length || 3)}
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-muted-foreground">
                    {candidate.selectedEndorserCount > 0 ? formatBidAmount(candidate.selectedEndorsementAmount) : "-"}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex h-6 items-center rounded-full border border-border px-2 text-xs font-medium text-muted-foreground">
                      {STATUS_LABELS[candidate.analyticsStatus]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
