import type { AnalyticsBidOutcome, AnalyticsCandidate } from "@/types/analytics";
import { formatBidAmount } from "./job-detail-helpers";

interface CandidateEvidencePanelProps {
  candidate: AnalyticsCandidate | null;
}

const ALIGNMENT_LABELS: Record<string, string> = {
  included: "Included",
  dissenting: "Dissenting",
  neutral: "Neutral",
  tiebreaker_required: "Tiebreaker",
  unknown: "Unknown",
};

const BID_OUTCOME_LABELS: Record<AnalyticsBidOutcome, string> = {
  selected: "Selected",
  returned: "Returned",
  active: "Active",
  unknown: "Unknown",
};

export function CandidateEvidencePanel({ candidate }: CandidateEvidencePanelProps) {
  if (!candidate) {
    return (
      <aside className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Candidate evidence</h2>
        <p className="mt-2 text-sm text-muted-foreground">Select a candidate to inspect their score evidence.</p>
      </aside>
    );
  }

  const hasFixtureCriteria = candidate.criteriaScores.some((criterion) => criterion.source === "fixture");

  return (
    <aside className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground">Candidate evidence</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Selected: {candidate.name} · consensus from aligned experts
        </p>
      </div>

      <div className="grid gap-5 p-4">
        <section className="grid grid-cols-[1fr_auto] gap-4 rounded-lg border border-border bg-muted/20 p-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">{candidate.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The ranking score is the backend consensus from aligned expert reviews. Dissenting scores stay visible below.
            </p>
          </div>
          <div className="grid h-20 w-20 place-items-center rounded-lg border border-border bg-background">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{candidate.vettingScore ?? "-"}</div>
              <div className="text-[10px] font-semibold uppercase text-muted-foreground">Consensus</div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">Evaluation criteria</h3>
            <span className="text-xs text-muted-foreground">
              {hasFixtureCriteria ? "Fixture until persisted" : "Company configured"}
            </span>
          </div>

          {candidate.criteriaScores.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {candidate.criteriaScores.map((criterion) => {
                const pct = criterion.averageScore == null ? 0 : Math.min(100, (criterion.averageScore / criterion.maxScore) * 100);
                return (
                  <div key={criterion.criterionId} className="grid grid-cols-[minmax(120px,1fr)_minmax(90px,160px)_48px] items-center gap-3 text-sm">
                    <span className="truncate text-muted-foreground">{criterion.label}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="text-right font-semibold text-foreground">
                      {criterion.averageScore ?? "-"}/{criterion.maxScore}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              Criteria evidence unavailable until proposal votes persist structured criteria.
            </p>
          )}

          {hasFixtureCriteria ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Production shows criteria only after proposal votes persist structured criteria; until then it shows score/comment evidence.
            </p>
          ) : null}
        </section>

        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">Expert scores</h3>
            <span className="text-xs text-muted-foreground">Public names shown</span>
          </div>
          <div className="mt-3 grid gap-2">
            {candidate.reviews.map((review) => (
              <div key={review.reviewId} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground">{review.publicName}</span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {review.score ?? "-"} · {ALIGNMENT_LABELS[review.alignmentState]}
                  </span>
                </div>
                {review.feedback ? <p className="mt-2 text-sm text-muted-foreground">{review.feedback}</p> : null}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Included/dissenting comes from backend consensus contribution, not frontend threshold math.
          </p>
        </section>

        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">Endorsement economics</h3>
            <span className="text-xs text-muted-foreground">Selected vs all bids</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-xs text-muted-foreground">Selected endorser amount</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{formatBidAmount(candidate.selectedEndorsementAmount)}</div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-xs text-muted-foreground">Total bid amount</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{formatBidAmount(candidate.totalBidAmount)}</div>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[48px_1fr_80px_86px] gap-2 bg-muted/30 px-3 py-2 text-[11px] font-semibold uppercase text-muted-foreground">
              <span>Rank</span>
              <span>Expert</span>
              <span className="text-right">Bid</span>
              <span className="text-right">Outcome</span>
            </div>
            {candidate.bids.map((bid) => (
              <div key={bid.bidId} className="grid grid-cols-[48px_1fr_80px_86px] gap-2 border-t border-border px-3 py-2 text-sm">
                <span className="text-muted-foreground">{bid.rank ?? "-"}</span>
                <span className="truncate text-foreground">{bid.publicName}</span>
                <span className="text-right text-muted-foreground">{formatBidAmount(bid.amount)}</span>
                <span className="text-right text-muted-foreground">{BID_OUTCOME_LABELS[bid.outcome]}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Selected and returned outcomes are backend-derived from locked selection and refund state; unknown is allowed while bidding is open.
          </p>
        </section>
      </div>
    </aside>
  );
}
