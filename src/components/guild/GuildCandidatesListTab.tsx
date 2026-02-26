"use client";

import { Star } from "lucide-react";
import type { CandidateMember } from "@/types";

interface GuildCandidatesListTabProps {
  candidates: CandidateMember[];
}

export function GuildCandidatesListTab({ candidates }: GuildCandidatesListTabProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">Candidate Members</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates && candidates.map((candidate) => (
          <div
            key={candidate.id}
            className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.35)] hover:border-primary/50 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg mb-1">{candidate.fullName}</h3>
                <p className="text-sm text-muted-foreground mb-2">{candidate.headline}</p>
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full capitalize">
                  {candidate.experienceLevel}
                </span>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-primary mb-1">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold">{candidate.reputation || 0}</span>
                </div>
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Endorsements</p>
                  <p className="font-semibold text-foreground">{candidate.endorsements || 0}</p>
                </div>
                {candidate.joinedAt && (
                  <div>
                    <p className="text-muted-foreground">Member Since</p>
                    <p className="font-semibold text-foreground text-xs">
                      {new Date(candidate.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {(!candidates || candidates.length === 0) && (
        <p className="text-center text-muted-foreground py-12">No candidates in this guild yet</p>
      )}
    </div>
  );
}
