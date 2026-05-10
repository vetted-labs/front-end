"use client";

import { useMemo, useState } from "react";
import { Download, TimerReset } from "lucide-react";
import type { JobAnalyticsDetail } from "@/types/analytics";
import { Button } from "@/components/ui/button";
import { GuildBadge } from "@/components/ui/guild";
import { CandidateEvidencePanel } from "./CandidateEvidencePanel";
import { CandidateRankingTable } from "./CandidateRankingTable";
import { RoleInsightsGrid } from "./RoleInsightsGrid";
import { ConsensusSpreadBar } from "./ConsensusSpreadBar";
import { sortAnalyticsCandidates } from "./job-detail-helpers";

interface JobAnalyticsWorkspaceProps {
  data: JobAnalyticsDetail;
  isFixtureMode?: boolean;
}

export function JobAnalyticsWorkspace({ data, isFixtureMode = false }: JobAnalyticsWorkspaceProps) {
  const sortedCandidates = useMemo(() => sortAnalyticsCandidates(data.candidates), [data.candidates]);
  const [selectedCandidateId, setSelectedCandidateId] = useState(sortedCandidates[0]?.id ?? null);
  const selectedCandidate = sortedCandidates.find((candidate) => candidate.id === selectedCandidateId) ?? sortedCandidates[0] ?? null;

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {isFixtureMode ? (
          <div className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <strong>Fixture preview</strong> · Local typed fixture for GET /api/companies/me/analytics/jobs/:jobId.
            </span>
            <span>No production fallback to fixture data.</span>
          </div>
        ) : null}

        <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span>Analytics</span>
              <span>/</span>
              {data.job.guild ? (
                <GuildBadge guild={data.job.guild} size="xs" />
              ) : (
                <span>Role</span>
              )}
              <span>/</span>
              <span>{data.job.title}</span>
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground">Role intelligence</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Rank candidates by aligned-expert consensus and inspect the evidence behind each signal.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground">
              {data.job.title}
            </div>
            <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground">
              <TimerReset className="h-4 w-4" />
              Last 30 days
            </div>
            <Button variant="outline" className="h-10 gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </header>

        <section className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Metric label="All candidates" value={data.summary.totalCandidates} note="pool" />
          <Metric label="Endorsed" value={data.summary.endorsedCandidates} note="selected" />
          <Metric label="Vetted only" value={data.summary.vettedOnlyCandidates} note="no bids" />
          <Metric label="Rejected" value={data.summary.rejectedCandidates} note="closed" />
          <Metric
            label="Outcomes"
            value={`${data.summary.trackedHireOutcomes}/${data.summary.requiredHireOutcomes}`}
            note="future"
          />
        </section>

        <main className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
          <CandidateRankingTable
            candidates={data.candidates}
            selectedCandidateId={selectedCandidate?.id ?? null}
            onSelectCandidate={setSelectedCandidateId}
            renderSpreadBar={(candidate) => <ConsensusSpreadBar candidate={candidate} />}
          />
          <CandidateEvidencePanel candidate={selectedCandidate} />
        </main>

        <div className="mt-4">
          <RoleInsightsGrid insights={data.insights} candidates={data.candidates} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="min-h-20 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span>{note}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
