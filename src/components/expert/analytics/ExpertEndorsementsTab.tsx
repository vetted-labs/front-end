"use client";

import { cn } from "@/lib/utils";
import {
  ACTIVE_ENDORSEMENTS,
  ENDORSEMENT_SUMMARY,
} from "@/components/analytics/mock-data";

// ── Status badge config ──────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  hired: "bg-positive/10 text-positive",
  interview: "bg-muted/10 text-muted-foreground",
  review: "bg-primary/10 text-primary",
};

// ── Component ────────────────────────────────────────────────

export function ExpertEndorsementsTab() {
  return (
    <div className="space-y-5 pt-4">
      {/* ── 3-up Stat Summary ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-muted/10 border border-border rounded-md p-4">
          <div className="text-[11px] text-muted-foreground mb-1.5">
            Active Endorsements
          </div>
          <div className="font-display text-2xl font-bold text-primary">
            {ENDORSEMENT_SUMMARY.active}
          </div>
          <div className="text-xs text-muted-foreground/60 mt-1">
            {ENDORSEMENT_SUMMARY.atRisk.toLocaleString()} $VETD at risk
          </div>
        </div>

        <div className="bg-muted/10 border border-border rounded-md p-4">
          <div className="text-[11px] text-muted-foreground mb-1.5">
            Success Rate
          </div>
          <div className="font-display text-2xl font-bold text-positive">
            {ENDORSEMENT_SUMMARY.successRate}%
          </div>
          <div className="text-xs text-muted-foreground/60 mt-1">
            10 of 12 hired + retained
          </div>
        </div>

        <div className="bg-muted/10 border border-border rounded-md p-4">
          <div className="text-[11px] text-muted-foreground mb-1.5">
            Total Earned
          </div>
          <div className="font-display text-2xl font-bold text-positive">
            {ENDORSEMENT_SUMMARY.totalEarned.toLocaleString()} $VETD
          </div>
          <div className="text-xs text-muted-foreground/60 mt-1">
            From endorsement payouts
          </div>
        </div>
      </div>

      {/* ── Active Endorsements Table ── */}
      <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
        <div className="mb-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Active Endorsements
          </h3>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            Candidates you&apos;ve staked $VETD on
          </p>
        </div>

        {/* Table Header */}
        <div
          className="grid items-center text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/50 pb-3 border-b border-border"
          style={{ gridTemplateColumns: "2fr 90px 80px 90px 100px" }}
        >
          <span>Candidate / Role</span>
          <span className="text-right">Staked</span>
          <span className="text-center">Status</span>
          <span className="text-right">Payout</span>
          <span className="text-center">90-Day</span>
        </div>

        {/* Table Rows */}
        {ACTIVE_ENDORSEMENTS.map((e) => (
          <div
            key={e.candidate}
            className="grid items-center py-3.5 border-b border-border last:border-b-0"
            style={{ gridTemplateColumns: "2fr 90px 80px 90px 100px" }}
          >
            {/* Candidate / Role */}
            <div>
              <div className="text-[13px] font-medium text-foreground">
                {e.candidate} &mdash; {e.role}
              </div>
              <span className="inline-flex mt-1 text-[10px] font-medium text-muted-foreground/60 bg-muted/10 border border-border/50 rounded px-1.5 py-0.5">
                {e.guild}
              </span>
            </div>

            {/* Staked */}
            <div className="text-right font-mono text-sm font-semibold text-foreground">
              {e.staked}
            </div>

            {/* Status */}
            <div className="text-center">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                  STATUS_STYLES[e.status]
                )}
              >
                {e.status === "hired"
                  ? "Hired"
                  : e.status === "interview"
                    ? "Interview"
                    : "Review"}
              </span>
            </div>

            {/* Payout */}
            <div className="text-right">
              {e.payout ? (
                <>
                  <div className="font-mono text-sm font-semibold text-positive">
                    {e.payout}
                  </div>
                  {e.payoutNote && (
                    <div className="text-[10px] text-muted-foreground/50 mt-0.5">
                      {e.payoutNote}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-xs text-muted-foreground/50">
                  Pending
                </span>
              )}
            </div>

            {/* 90-Day Tracking */}
            <div className="text-center">
              {e.trackingDay != null && e.trackingTotal != null ? (
                <>
                  <div className="text-[10px] font-semibold font-mono text-primary">
                    {e.trackingDay}/{e.trackingTotal}d
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${(e.trackingDay / e.trackingTotal) * 100}%`,
                        boxShadow: "0 0 4px rgba(255,106,0,0.15)",
                      }}
                    />
                  </div>
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground/40">
                  Awaiting
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
