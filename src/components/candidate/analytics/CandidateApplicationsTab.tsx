"use client";

import { cn } from "@/lib/utils";
import { CANDIDATE_APPLICATIONS } from "@/components/analytics/mock-data";

// ── Status badge styles ─────────────────────────────────────────

const STATUS_BADGE: Record<
  string,
  string
> = {
  offer: "bg-positive/10 text-positive shadow-[0_0_8px_rgba(74,222,128,0.12)]",
  interview: "bg-muted text-muted-foreground",
  review: "bg-primary/10 text-primary",
};

export function CandidateApplicationsTab() {
  return (
    <div className="rounded-[14px] border border-border bg-card/60 backdrop-blur-sm p-7">
      <div className="mb-6">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          All Applications
        </h3>
      </div>

      {/* Table Header */}
      <div
        className="grid items-center gap-4 pb-3 border-b border-border mb-1"
        style={{ gridTemplateColumns: "2fr 90px 80px 1fr 80px" }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
          Role / Company
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 text-center">
          Score
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
          Guild
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
          Endorsements
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 text-center">
          Status
        </span>
      </div>

      {/* Table Rows */}
      {CANDIDATE_APPLICATIONS.map((app) => (
        <div
          key={`${app.role}-${app.company}`}
          className="grid items-center gap-4 py-3 border-b border-border/50 last:border-b-0"
          style={{ gridTemplateColumns: "2fr 90px 80px 1fr 80px" }}
        >
          {/* Role / Company */}
          <div>
            <div className="text-[13px] font-medium text-foreground">
              {app.role}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {app.company}
            </div>
          </div>

          {/* Score */}
          <div className="text-center">
            {app.score != null ? (
              <span
                className={cn(
                  "font-mono text-sm font-semibold",
                  app.score >= 80 ? "text-positive" : "text-foreground"
                )}
              >
                {app.score}
              </span>
            ) : (
              <span className="font-mono text-sm text-muted-foreground">
                &mdash;
              </span>
            )}
          </div>

          {/* Guild */}
          <div>
            <span className="inline-flex items-center rounded-full bg-primary/8 border border-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {app.guild}
            </span>
          </div>

          {/* Endorsements */}
          <div className="text-xs text-muted-foreground">
            {app.endorsements}
          </div>

          {/* Status */}
          <div className="text-center">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize",
                STATUS_BADGE[app.status]
              )}
            >
              {app.status === "review" ? "Review" : app.status === "interview" ? "Interview" : "Offer"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
