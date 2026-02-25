"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Award, TrendingUp, CheckCircle, Star, Wallet, ChevronDown } from "lucide-react";
import { Badge, getRankBadgeVariant } from "@/components/ui/badge";
import type { ExpertMember, CandidateMember } from "@/types";

const MEMBERS_PER_SECTION = 12;

interface GuildMembersTabProps {
  experts: ExpertMember[];
  candidates: CandidateMember[];
  expertsCount?: number;
  candidatesCount?: number;
}

export function GuildMembersTab({
  experts,
  candidates,
  expertsCount = 0,
  candidatesCount = 0,
}: GuildMembersTabProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<"experts" | "candidates">("experts");
  const [expertsVisible, setExpertsVisible] = useState(MEMBERS_PER_SECTION);
  const [candidatesVisible, setCandidatesVisible] = useState(MEMBERS_PER_SECTION);

  // Sort members by reputation (highest first)
  const sortedExperts = [...experts].sort((a, b) => b.reputation - a.reputation);
  const sortedCandidates = [...candidates].sort((a, b) => b.reputation - a.reputation);
  const displayExpertsCount = sortedExperts.length > 0 ? sortedExperts.length : expertsCount;
  const displayCandidatesCount = sortedCandidates.length > 0 ? sortedCandidates.length : candidatesCount;

  // Truncate wallet address helper
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div>
      {/* Section Tabs */}
      <div className="flex items-center gap-4 mb-8 border-b border-border pb-4">
        <button
          onClick={() => setActiveSection("experts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === "experts"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Award className="w-5 h-5" />
          Experts ({displayExpertsCount})
        </button>
        <button
          onClick={() => setActiveSection("candidates")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === "candidates"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Users className="w-5 h-5" />
          Candidates ({displayCandidatesCount})
        </button>
      </div>

      {/* Experts Section */}
      {activeSection === "experts" && (
        <div>
          {sortedExperts.length > 0 ? (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedExperts.slice(0, expertsVisible).map((expert) => (
                <button
                  key={expert.id}
                  onClick={() => router.push(`/experts/${expert.walletAddress}`)}
                  className="rounded-2xl p-6 text-left cursor-pointer border border-border bg-card shadow-sm dark:shadow-lg transition-all hover:-translate-y-0.5 hover:border-primary/40 group"
                >
                  {/* Header: Name and Role */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg mb-2 group-hover:text-primary transition-colors">
                        {expert.fullName}
                      </h3>
                      <Badge variant={getRankBadgeVariant(expert.role)} className="uppercase text-xs font-bold">
                        {expert.role}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-primary mb-1">
                        <Star className="w-5 h-5 fill-current" />
                        <span className="font-bold text-lg">{expert.reputation}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">reputation</p>
                    </div>
                  </div>

                  {/* Wallet Address */}
                  <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="font-mono text-xs">{truncateAddress(expert.walletAddress)}</span>
                  </div>

                  {/* Expertise Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(expert.expertise ?? []).slice(0, 4).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-muted/50 text-foreground text-xs rounded-md border border-border"
                      >
                        {skill}
                      </span>
                    ))}
                    {(expert.expertise ?? []).length > 4 && (
                      <span className="px-2 py-1 bg-muted/50 text-muted-foreground text-xs rounded-md border border-border">
                        +{(expert.expertise ?? []).length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-muted-foreground text-xs">Reviews</p>
                          <p className="font-semibold text-foreground">{expert.totalReviews}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-muted-foreground text-xs">Success</p>
                          <p className="font-semibold text-foreground">{expert.successRate}%</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Joined {expert.joinedAt ? new Date(expert.joinedAt).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            {sortedExperts.length > expertsVisible && (
              <button
                onClick={() => setExpertsVisible((v) => v + MEMBERS_PER_SECTION)}
                className="w-full py-3 mt-4 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronDown className="w-4 h-4" />
                Show more ({sortedExperts.length - expertsVisible} remaining)
              </button>
            )}
          </>
          ) : (
            <div className="text-center py-16">
              <Award className="w-20 h-20 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg text-muted-foreground mb-2">No experts listed yet</p>
              <p className="text-sm text-muted-foreground">
                {displayExpertsCount > 0
                  ? "Member roster is syncing. Check back shortly."
                  : "Be the first to join this guild as an expert."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Candidates Section */}
      {activeSection === "candidates" && (
        <div>
          {sortedCandidates.length > 0 ? (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedCandidates.slice(0, candidatesVisible).map((candidate) => (
                <div
                  key={candidate.id}
                  className="rounded-2xl p-6 border border-border bg-card shadow-sm dark:shadow-lg transition-all hover:-translate-y-0.5 hover:border-primary/40"
                >
                  {/* Header: Name and Experience Level */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg mb-2">
                        {candidate.fullName}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {candidate.headline}
                      </p>
                      <Badge variant="outline" className="capitalize text-xs">
                        {candidate.experienceLevel}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-primary mb-1">
                        <Star className="w-5 h-5 fill-current" />
                        <span className="font-bold text-lg">{candidate.reputation}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">reputation</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-muted-foreground text-xs">Endorsements</p>
                          <p className="font-semibold text-foreground">{candidate.endorsements}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Member Since</p>
                        <p className="font-semibold text-foreground text-xs">
                          {candidate.joinedAt ? new Date(candidate.joinedAt).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {sortedCandidates.length > candidatesVisible && (
              <button
                onClick={() => setCandidatesVisible((v) => v + MEMBERS_PER_SECTION)}
                className="w-full py-3 mt-4 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronDown className="w-4 h-4" />
                Show more ({sortedCandidates.length - candidatesVisible} remaining)
              </button>
            )}
            </>
          ) : (
            <div className="text-center py-16">
              <Users className="w-20 h-20 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg text-muted-foreground mb-2">No candidates listed yet</p>
              <p className="text-sm text-muted-foreground">
                {displayCandidatesCount > 0
                  ? "Member roster is syncing. Check back shortly."
                  : "Be the first to join this guild as a candidate."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
