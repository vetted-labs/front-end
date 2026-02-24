"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useMyActiveEndorsements } from "@/lib/hooks/useVettedContracts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Trophy,
  Award,
  TrendingUp,
  Building2,
  User,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function MyEndorsementsHistory() {
  const { address, isConnected } = useAccount();
  const { endorsements, isLoading, error } = useMyActiveEndorsements();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isConnected || !address) {
    return (
      <Card padding="lg" className="text-center">
        <p className="text-muted-foreground">Please connect your wallet to view your active endorsements</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="lg" className="text-center border-destructive/50">
        <p className="text-destructive">Error loading active endorsements: {error}</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card padding="lg" className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your active endorsements...</p>
      </Card>
    );
  }

  if (endorsements.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <Award className="h-16 w-16 mx-auto text-primary/40 mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Active Endorsements</h3>
        <p className="text-muted-foreground">
          You haven't placed any active endorsements yet. Browse available applications to start endorsing candidates!
        </p>
      </Card>
    );
  }

  // Calculate summary stats
  const totalStaked = endorsements.reduce((sum, e) => sum + parseFloat(e.stakeAmount || '0'), 0);
  const top3Rankings = endorsements.filter((e) => e.blockchainData?.rank > 0 && e.blockchainData?.rank <= 3).length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md" className="border-border bg-gradient-to-br from-card to-secondary/40">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Active</p>
              <p className="text-2xl font-bold text-foreground">{endorsements.length}</p>
            </div>
          </div>
        </Card>

        <Card padding="md" className="border-border bg-gradient-to-br from-card to-secondary/40">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Top 3</p>
              <p className="text-2xl font-bold text-foreground">{top3Rankings}</p>
            </div>
          </div>
        </Card>

        <Card padding="md" className="border-border bg-gradient-to-br from-card to-secondary/40">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Total Staked</p>
              <p className="text-2xl font-bold text-foreground">{totalStaked.toFixed(2)} VTD</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Endorsements List */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Endorsements</p>
          <h2 className="text-2xl font-semibold text-foreground">My Active Endorsements</h2>
        </div>
        <p className="text-sm text-muted-foreground">Data syncs automatically</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {endorsements.map((endorsement: any, index: number) => {
          const endorsementId =
            endorsement.endorsementId ||
            endorsement.applicationId ||
            endorsement.job?.id ||
            `${endorsement.candidate?.name || "candidate"}-${endorsement.createdAt || index}`;
          const isExpanded = expandedId === endorsementId;
          const toggle = () =>
            setExpandedId((prev) => (prev === endorsementId ? null : endorsementId));

          return (
            <Card
              key={endorsementId}
              padding="md"
              hover
              onClick={toggle}
              role="button"
              tabIndex={0}
              className="cursor-pointer border-border bg-gradient-to-br from-card to-secondary/30"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-9 w-9 rounded-lg border border-primary/30 bg-primary/15 flex items-center justify-center">
                        <Briefcase className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {endorsement.job?.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>{endorsement.job?.companyName}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>{endorsement.job?.location || "Remote"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {endorsement.blockchainData?.rank > 0 &&
                      endorsement.blockchainData?.rank <= 3 && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-amber-500/10 text-amber-200 border border-amber-500/30">
                          Rank #{endorsement.blockchainData.rank}
                        </span>
                      )}
                    <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Candidate + key metrics */}
                <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">
                        {endorsement.candidate?.name}
                      </span>
                      {endorsement.candidate?.headline && (
                        <span className="text-muted-foreground">
                          • {endorsement.candidate.headline}
                        </span>
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-primary/10 text-primary border border-primary/30">
                      {endorsement.application?.status}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Stake</p>
                      <p className="font-semibold text-primary">
                        {parseFloat(endorsement.stakeAmount || "0").toFixed(2)} VTD
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Guild</p>
                      <p className="font-medium text-foreground">
                        {endorsement.guild?.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="space-y-3">
                    {endorsement.application?.coverLetter && (
                      <div className="rounded-xl border border-border bg-card/80 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                          Candidate Summary
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {endorsement.application.coverLetter}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border bg-card/80 px-4 py-3">
                        <p className="text-xs text-muted-foreground">Endorsed On</p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(endorsement.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {endorsement.blockchainData?.bidAmount && (
                        <div className="rounded-xl border border-border bg-card/80 px-4 py-3">
                          <p className="text-xs text-muted-foreground">Blockchain Bid</p>
                          <p className="text-sm font-semibold text-primary">
                            {parseFloat(endorsement.blockchainData.bidAmount).toFixed(2)} VTD
                          </p>
                        </div>
                      )}
                    </div>

                    {endorsement.notes && (
                      <div className="rounded-xl border border-border bg-card/80 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
                          Your Notes
                        </p>
                        <p className="text-sm text-foreground">{endorsement.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card padding="md" className="border-primary/20 bg-primary/5">
        <p className="text-sm text-foreground">
          <strong className="text-primary">Note:</strong> Top 3 endorsers earn rewards when a candidate is hired. Increase your stake to improve ranking.
        </p>
      </Card>
    </div>
  );
}
