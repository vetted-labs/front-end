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
  role: "recruit" | "apprentice" | "craftsman" | "officer" | "master";
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
      <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveSection("experts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === "experts"
              ? "bg-orange-500/15 text-amber-200 border border-orange-400/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <Award className="w-5 h-5" />
          Experts ({displayExpertsCount})
        </button>
        <button
          onClick={() => setActiveSection("candidates")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === "candidates"
              ? "bg-orange-500/15 text-amber-200 border border-orange-400/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedExperts.map((expert) => (
                <button
                  key={expert.id}
                  onClick={() => router.push(`/experts/${expert.walletAddress}`)}
                  className="rounded-2xl p-6 text-left cursor-pointer border border-white/10 bg-gradient-to-b from-[#151824]/90 via-[#101420]/95 to-[#0b0f1b]/95 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_30px_80px_rgba(0,0,0,0.6)] transition-all hover:-translate-y-0.5 hover:border-orange-400/40 group"
                >
                  {/* Header: Name and Role */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-100 text-lg mb-2 group-hover:text-amber-200 transition-colors">
                        {expert.fullName}
                      </h3>
                      <Badge variant={getRankBadgeVariant(expert.role)} className="uppercase text-xs font-bold">
                        {expert.role}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-200 mb-1">
                        <Star className="w-5 h-5 fill-current" />
                        <span className="font-bold text-lg">{expert.reputation}</span>
                      </div>
                      <p className="text-xs text-slate-400">reputation</p>
                    </div>
                  </div>

                  {/* Wallet Address */}
                  <div className="flex items-center gap-2 mb-3 text-sm text-slate-400">
                    <Wallet className="w-4 h-4 text-amber-200" />
                    <span className="font-mono text-xs">{truncateAddress(expert.walletAddress)}</span>
                  </div>

                  {/* Expertise Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {expert.expertise.slice(0, 4).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-white/5 text-slate-200 text-xs rounded-md border border-white/10"
                      >
                        {skill}
                      </span>
                    ))}
                    {expert.expertise.length > 4 && (
                      <span className="px-2 py-1 bg-white/5 text-slate-400 text-xs rounded-md border border-white/10">
                        +{expert.expertise.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-amber-200" />
                        <div>
                          <p className="text-slate-400 text-xs">Reviews</p>
                          <p className="font-semibold text-slate-100">{expert.totalReviews}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-amber-200" />
                        <div>
                          <p className="text-slate-400 text-xs">Success</p>
                          <p className="font-semibold text-slate-100">{expert.successRate}%</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                      Joined {new Date(expert.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Award className="w-20 h-20 text-slate-500 mx-auto mb-4 opacity-50" />
              <p className="text-lg text-slate-300 mb-2">No experts listed yet</p>
              <p className="text-sm text-slate-400">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="rounded-2xl p-6 border border-white/10 bg-gradient-to-b from-[#151824]/90 via-[#101420]/95 to-[#0b0f1b]/95 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_30px_80px_rgba(0,0,0,0.6)] transition-all hover:-translate-y-0.5 hover:border-orange-400/40"
                >
                  {/* Header: Name and Experience Level */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-100 text-lg mb-2">
                        {candidate.fullName}
                      </h3>
                      <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                        {candidate.headline}
                      </p>
                      <Badge variant="outline" className="capitalize text-xs">
                        {candidate.experienceLevel}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-200 mb-1">
                        <Star className="w-5 h-5 fill-current" />
                        <span className="font-bold text-lg">{candidate.reputation}</span>
                      </div>
                      <p className="text-xs text-slate-400">reputation</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-200" />
                        <div>
                          <p className="text-slate-400 text-xs">Endorsements</p>
                          <p className="font-semibold text-slate-100">{candidate.endorsements}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs">Member Since</p>
                        <p className="font-semibold text-slate-100 text-xs">
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
              <Users className="w-20 h-20 text-slate-500 mx-auto mb-4 opacity-50" />
              <p className="text-lg text-slate-300 mb-2">No candidates listed yet</p>
              <p className="text-sm text-slate-400">
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
