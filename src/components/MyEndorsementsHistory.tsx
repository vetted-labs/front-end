"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useMyActiveEndorsements } from "@/lib/hooks/useVettedContracts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Trophy, Award, TrendingUp, Building2, User, Briefcase, RefreshCw } from "lucide-react";

export function MyEndorsementsHistory() {
  const { address, isConnected } = useAccount();
  const { endorsements, isLoading, error, refetch } = useMyActiveEndorsements();
  const [selectedGuild, setSelectedGuild] = useState<string>("all");

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
        <Card padding="md" hover>
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Active Endorsements</p>
              <p className="text-2xl font-bold text-foreground">{endorsements.length}</p>
            </div>
          </div>
        </Card>

        <Card padding="md" hover>
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">Top 3 Rankings</p>
              <p className="text-2xl font-bold text-foreground">{top3Rankings}</p>
            </div>
          </div>
        </Card>

        <Card padding="md" hover>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Staked</p>
              <p className="text-2xl font-bold text-foreground">{totalStaked.toFixed(2)} VTD</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Endorsements List */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">My Active Endorsements</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <div className="space-y-4">
          {endorsements.map((endorsement: any) => (
            <Card
              key={endorsement.endorsementId}
              padding="md"
              hover
              className="border-border"
            >
              <div className="space-y-4">
                {/* Header with Rank Badge */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">{endorsement.job?.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{endorsement.job?.companyName}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{endorsement.job?.location || 'Remote'}</span>
                    </div>
                  </div>
                  {endorsement.blockchainData?.rank > 0 && endorsement.blockchainData?.rank <= 3 && (
                    <div className="flex flex-col items-end gap-2">
                      {endorsement.blockchainData.rank === 1 && (
                        <span className="px-3 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-semibold rounded-full border border-amber-500/30">
                          🏆 Rank #1
                        </span>
                      )}
                      {endorsement.blockchainData.rank === 2 && (
                        <span className="px-3 py-1 bg-primary/20 text-primary text-sm font-semibold rounded-full border border-primary/30">
                          🥈 Rank #2
                        </span>
                      )}
                      {endorsement.blockchainData.rank === 3 && (
                        <span className="px-3 py-1 bg-primary/20 text-primary text-sm font-semibold rounded-full border border-primary/30">
                          🥉 Rank #3
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Candidate Info */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="h-4 w-4 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{endorsement.candidate?.name}</span>
                      {endorsement.candidate?.headline && (
                        <span className="text-muted-foreground"> • {endorsement.candidate.headline}</span>
                      )}
                    </p>
                  </div>
                  {endorsement.application?.coverLetter && (
                    <p className="text-sm text-muted-foreground line-clamp-2 ml-7">
                      {endorsement.application.coverLetter}
                    </p>
                  )}
                </div>

                {/* Endorsement Details */}
                <div className="border-t border-border pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Your Stake</p>
                      <p className="text-lg font-semibold text-primary">
                        {parseFloat(endorsement.stakeAmount || '0').toFixed(2)} VTD
                      </p>
                    </div>
                    {endorsement.blockchainData?.rank > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Your Rank</p>
                        <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                          #{endorsement.blockchainData.rank}
                        </p>
                      </div>
                    )}
                    {endorsement.confidenceLevel && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                        <p className="text-lg font-semibold text-primary">
                          {endorsement.confidenceLevel}/5
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Guild</p>
                      <p className="text-sm font-medium text-foreground">
                        {endorsement.guild?.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {endorsement.notes && (
                  <div className="border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground mb-1">Your Notes</p>
                    <p className="text-sm text-foreground">{endorsement.notes}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-border pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Application Status</p>
                      <p className="text-sm font-medium text-primary capitalize">
                        {endorsement.application?.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Endorsed On</p>
                      <p className="text-sm text-foreground">
                        {new Date(endorsement.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {endorsement.blockchainData?.bidAmount && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Blockchain Bid</p>
                      <p className="text-sm font-medium text-primary">
                        {parseFloat(endorsement.blockchainData.bidAmount).toFixed(2)} VTD
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Info Card */}
      <Card padding="md" className="border-primary/20 bg-primary/5">
        <p className="text-sm text-foreground">
          <strong className="text-primary">Note:</strong> These are your active endorsements with complete details.
          Top 3 endorsers earn rewards when the candidate is hired. You can increase your stake to improve your ranking.
        </p>
      </Card>
    </div>
  );
}
