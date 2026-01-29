"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Award, TrendingUp, CheckCircle, Star, Wallet } from "lucide-react";
import { Badge, getRankBadgeVariant } from "@/components/ui/badge";

interface ExpertMember {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  role: "recruit" | "craftsman" | "master";
  reputation: number;
  expertise: string[];
  totalReviews: number;
  successRate: number;
  joinedAt: string;
}

interface CandidateMember {
  id: string;
  fullName: string;
  email: string;
  headline: string;
  experienceLevel: string;
  reputation: number;
  endorsements: number;
  joinedAt: string;
}

interface GuildMembersTabProps {
  experts: ExpertMember[];
  candidates: CandidateMember[];
}

export function GuildMembersTab({ experts, candidates }: GuildMembersTabProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<"experts" | "candidates">("experts");

  // Sort members by reputation (highest first)
  const sortedExperts = [...experts].sort((a, b) => b.reputation - a.reputation);
  const sortedCandidates = [...candidates].sort((a, b) => b.reputation - a.reputation);

  // Truncate wallet address helper
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div>
      {/* Section Tabs */}
      <div className="flex items-center gap-6 mb-8 border-b border-border pb-4">
        <button
          onClick={() => setActiveSection("experts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === "experts"
              ? "bg-primary/10 text-primary border border-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Award className="w-5 h-5" />
          Experts ({sortedExperts.length})
        </button>
        <button
          onClick={() => setActiveSection("candidates")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === "candidates"
              ? "bg-primary/10 text-primary border border-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Users className="w-5 h-5" />
          Candidates ({sortedCandidates.length})
        </button>
      </div>

      {/* Experts Section */}
      {activeSection === "experts" && (
        <div>
          {sortedExperts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedExperts.map((expert) => (
                <button
                  key={expert.id}
                  onClick={() => router.push(`/experts/${expert.walletAddress}`)}
                  className="bg-card rounded-xl p-6 shadow-sm border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left cursor-pointer group"
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
                    <Wallet className="w-4 h-4" />
                    <span className="font-mono text-xs">{truncateAddress(expert.walletAddress)}</span>
                  </div>

                  {/* Expertise Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {expert.expertise.slice(0, 4).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-muted text-card-foreground text-xs rounded-md"
                      >
                        {skill}
                      </span>
                    ))}
                    {expert.expertise.length > 4 && (
                      <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md">
                        +{expert.expertise.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-muted-foreground text-xs">Reviews</p>
                          <p className="font-semibold text-foreground">{expert.totalReviews}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="text-muted-foreground text-xs">Success</p>
                          <p className="font-semibold text-foreground">{expert.successRate}%</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Joined {new Date(expert.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Award className="w-20 h-20 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg text-muted-foreground mb-2">No experts yet</p>
              <p className="text-sm text-muted-foreground">
                Be the first to join this guild as an expert
              </p>
            </div>
          )}
        </div>
      )}

      {/* Candidates Section */}
      {activeSection === "candidates" && (
        <div>
          {sortedCandidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="bg-card rounded-xl p-6 shadow-sm border border-border hover:border-primary/50 hover:shadow-md transition-all"
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
                        <Award className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="text-muted-foreground text-xs">Endorsements</p>
                          <p className="font-semibold text-foreground">{candidate.endorsements}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Member Since</p>
                        <p className="font-semibold text-foreground text-xs">
                          {new Date(candidate.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Users className="w-20 h-20 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg text-muted-foreground mb-2">No candidates yet</p>
              <p className="text-sm text-muted-foreground">
                Be the first to join this guild as a candidate
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
