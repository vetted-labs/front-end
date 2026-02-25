"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useMyActiveEndorsements } from "@/lib/hooks/useVettedContracts";
import { Badge } from "@/components/ui/badge";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";

import {
  Award,
  Trophy,
  TrendingUp,
  Building2,
  User,
  Briefcase,
  MapPin,
  ChevronDown,
  Clock,
  Coins,
  Shield,
  Wallet,
} from "lucide-react";

export function MyEndorsementsHistory() {
  const { address, isConnected } = useAccount();
  const { endorsements, isLoading, error } = useMyActiveEndorsements();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isConnected || !address) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md p-12 text-center">
        <Wallet className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">
          Please connect your wallet to view your active endorsements
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 backdrop-blur-md p-12 text-center">
        <p className="text-destructive">
          Error loading active endorsements: {error}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return null;
  }

  if (endorsements.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md p-16 text-center">
        <Award className="h-14 w-14 mx-auto text-primary/30 mb-5" />
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No Active Endorsements
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          You haven't placed any active endorsements yet. Browse available
          applications to start endorsing candidates.
        </p>
      </div>
    );
  }

  const totalStaked = endorsements.reduce(
    (sum, e) => sum + parseFloat(e.stakeAmount || "0"),
    0
  );
  const top3Rankings = endorsements.filter(
    (e) => e.blockchainData?.rank > 0 && e.blockchainData?.rank <= 3
  ).length;

  return (
    <div className="space-y-8 animate-page-enter">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Active",
            value: endorsements.length.toString(),
            icon: Award,
            accent: "primary",
          },
          {
            label: "Top 3 Rankings",
            value: top3Rankings.toString(),
            icon: Trophy,
            accent: "amber",
          },
          {
            label: "Total Staked",
            value: `${totalStaked.toFixed(2)}`,
            suffix: "VTD",
            icon: TrendingUp,
            accent: "emerald",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md p-5"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  stat.accent === "primary"
                    ? "bg-primary/10"
                    : stat.accent === "amber"
                    ? "bg-amber-500/10"
                    : "bg-emerald-500/10"
                }`}
              >
                <stat.icon
                  className={`w-5 h-5 ${
                    stat.accent === "primary"
                      ? "text-primary"
                      : stat.accent === "amber"
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {stat.value}
                  {stat.suffix && (
                    <span className="text-sm font-medium text-muted-foreground ml-1.5">
                      {stat.suffix}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Section Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
            Endorsements
          </p>
          <h2 className="text-2xl font-semibold text-foreground">
            My Active Endorsements
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Data syncs automatically
        </p>
      </div>

      {/* ── Endorsement List ── */}
      <div className="space-y-3">
        {endorsements.map((endorsement: any, index: number) => {
          const endorsementId =
            endorsement.endorsementId ||
            endorsement.applicationId ||
            endorsement.job?.id ||
            `${endorsement.candidate?.name || "candidate"}-${endorsement.createdAt || index}`;
          const isExpanded = expandedId === endorsementId;
          const toggle = () =>
            setExpandedId((prev) =>
              prev === endorsementId ? null : endorsementId
            );

          const statusKey = (
            endorsement.application?.status || "pending"
          ).toLowerCase();
          const statusConfig = APPLICATION_STATUS_CONFIG[statusKey] ||
            APPLICATION_STATUS_CONFIG.pending;

          return (
            <div
              key={endorsementId}
              className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden transition-all hover:border-primary/40"
            >
              {/* Collapsed Row */}
              <div
                onClick={toggle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle();
                  }
                }}
                role="button"
                tabIndex={0}
                className="group flex items-center gap-4 p-5 cursor-pointer"
              >
                {/* Job icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Briefcase className="w-4 h-4 text-primary" />
                </div>

                {/* Job + Candidate */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                    {endorsement.job?.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                    <span className="truncate">{endorsement.job?.companyName}</span>
                    <span className="text-border">·</span>
                    <span className="truncate">{endorsement.job?.location || "Remote"}</span>
                  </div>
                </div>

                {/* Candidate name */}
                <div className="hidden sm:flex items-center gap-2 min-w-0 max-w-[200px]">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm text-foreground truncate">
                    {endorsement.candidate?.name}
                  </span>
                </div>

                {/* Stake */}
                <div className="hidden md:block text-right min-w-[90px]">
                  <p className="text-sm font-semibold text-primary tabular-nums">
                    {parseFloat(endorsement.stakeAmount || "0").toFixed(2)} VTD
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Stake
                  </p>
                </div>

                {/* Status + Rank */}
                <div className="flex items-center gap-2 shrink-0">
                  {endorsement.blockchainData?.rank > 0 &&
                    endorsement.blockchainData?.rank <= 3 && (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] px-2"
                      >
                        <Trophy className="w-3 h-3 mr-1" />#{endorsement.blockchainData.rank}
                      </Badge>
                    )}
                  <Badge className={`text-[10px] ${statusConfig.className}`}>
                    {statusConfig.label}
                  </Badge>
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-white/[0.03] transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* ── Expanded Details ── */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-0 animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="border-t border-border/40 pt-5">
                    {/* Flat metrics row — no boxes, just columns with dividers */}
                    <div className="flex flex-wrap gap-y-4">
                      <div className="flex-1 min-w-[120px] pr-6">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          Candidate
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {endorsement.candidate?.name}
                        </p>
                        {endorsement.candidate?.headline && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {endorsement.candidate.headline}
                          </p>
                        )}
                      </div>
                      <div className="flex-1 min-w-[120px] pr-6 border-l border-border/30 pl-6">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          Guild
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {endorsement.guild?.name}
                        </p>
                      </div>
                      <div className="flex-1 min-w-[100px] pr-6 border-l border-border/30 pl-6">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          Endorsed
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(endorsement.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex-1 min-w-[100px] border-l border-border/30 pl-6">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          {endorsement.blockchainData?.bidAmount ? "On-Chain Bid" : "Stake"}
                        </p>
                        <p className="text-sm font-semibold text-primary tabular-nums">
                          {parseFloat(
                            endorsement.blockchainData?.bidAmount || endorsement.stakeAmount || "0"
                          ).toFixed(2)}{" "}
                          <span className="text-xs font-medium text-muted-foreground">VTD</span>
                        </p>
                      </div>
                    </div>

                    {/* Cover letter */}
                    {endorsement.application?.coverLetter && (
                      <div className="mt-5 pt-5 border-t border-border/30">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                          Candidate Summary
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {endorsement.application.coverLetter}
                        </p>
                      </div>
                    )}

                    {/* Notes */}
                    {endorsement.notes && (
                      <div className="mt-5 pt-5 border-t border-border/30">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                          Your Notes
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {endorsement.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Info Banner ── */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-md p-5 flex items-start gap-3">
        <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          <span className="font-semibold text-primary">Tip:</span> Top 3
          endorsers earn rewards when a candidate is hired. Increase your stake
          to improve your ranking.
        </p>
      </div>
    </div>
  );
}
