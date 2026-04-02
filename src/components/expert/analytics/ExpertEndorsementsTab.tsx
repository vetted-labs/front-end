"use client";

import { cn } from "@/lib/utils";
import { useFetch } from "@/lib/hooks/useFetch";
import { analyticsApi } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────

interface ActiveEndorsement {
  candidate: string;
  role: string;
  guild: string;
  staked: number;
  status: "hired" | "interview" | "review";
  payout?: string;
  payoutNote?: string;
  trackingDay?: number;
  trackingTotal?: number;
}

interface EndorsementStatsData {
  active?: number;
  atRisk?: number;
  successRate?: number;
  totalEarned?: number;
  successRateNote?: string;
  endorsements?: ActiveEndorsement[];
}

// ── Status badge config ──────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  hired: "bg-positive/10 text-positive",
  interview: "bg-muted/10 text-muted-foreground",
  review: "bg-primary/10 text-primary",
};

// ── Component ────────────────────────────────────────────────

interface Props {
  walletAddress?: string;
}

export function ExpertEndorsementsTab({ walletAddress }: Props) {
  const { data: rawData, isLoading, error } = useFetch(
    () => analyticsApi.getExpertEndorsementStats(walletAddress!),
    { skip: !walletAddress }
  );

  const data = rawData as EndorsementStatsData | null;
  const endorsements = data?.endorsements ?? [];

  if (isLoading) {
    return (
      <div className="space-y-5 pt-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-[14px] border border-border bg-card/60 h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Analytics coming soon"
        description="Real-time analytics will be available once the backend API is deployed."
      />
    );
  }

  return (
    <div className="space-y-5 pt-4">
      {/* ── 3-up Stat Summary ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-muted/10 border border-border rounded-md p-4">
          <div className="text-[11px] text-muted-foreground mb-1.5">
            Active Endorsements
          </div>
          <div className="font-display text-2xl font-bold text-primary">
            {data?.active ?? 0}
          </div>
          <div className="text-xs text-muted-foreground/60 mt-1">
            {(data?.atRisk ?? 0).toLocaleString()} $VETD at risk
          </div>
        </div>

        <div className="bg-muted/10 border border-border rounded-md p-4">
          <div className="text-[11px] text-muted-foreground mb-1.5">
            Success Rate
          </div>
          <div className="font-display text-2xl font-bold text-positive">
            {data?.successRate ?? 0}%
          </div>
          {data?.successRateNote && (
            <div className="text-xs text-muted-foreground/60 mt-1">
              {data.successRateNote}
            </div>
          )}
        </div>

        <div className="bg-muted/10 border border-border rounded-md p-4">
          <div className="text-[11px] text-muted-foreground mb-1.5">
            Total Earned
          </div>
          <div className="font-display text-2xl font-bold text-positive">
            {(data?.totalEarned ?? 0).toLocaleString()} $VETD
          </div>
          <div className="text-xs text-muted-foreground/60 mt-1">
            From endorsement payouts
          </div>
        </div>
      </div>

      {/* ── Active Endorsements Table ── */}
      {endorsements.length > 0 ? (
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
          {endorsements.map((e) => (
            <div
              key={`${e.candidate}-${e.role}`}
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
      ) : (
        <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
          <p className="text-sm text-muted-foreground text-center">
            No active endorsements yet.
          </p>
        </div>
      )}
    </div>
  );
}
