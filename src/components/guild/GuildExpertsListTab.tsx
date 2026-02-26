"use client";

import { Star } from "lucide-react";
import { getRoleBadgeColor } from "@/lib/guildHelpers";
import type { ExpertMember } from "@/types";

interface GuildExpertsListTabProps {
  experts: ExpertMember[];
  onNavigate: (path: string) => void;
}

export function GuildExpertsListTab({ experts, onNavigate }: GuildExpertsListTabProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">Expert Members</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(experts || []).map((expert) => (
          <button
            key={expert.id}
            onClick={() => onNavigate(`/experts/${expert.walletAddress}`)}
            className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.35)] hover:border-primary/50 hover:shadow-lg transition-all text-left cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground text-lg mb-2 group-hover:text-primary transition-colors">{expert.fullName}</h3>
                <span
                  className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${getRoleBadgeColor(
                    expert.role
                  )}`}
                >
                  {expert.role.toUpperCase()}
                </span>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-primary mb-1">
                  <Star className="w-5 h-5 fill-current" />
                  <span className="font-bold text-lg">{expert.reputation}</span>
                </div>
                <p className="text-xs text-muted-foreground">reputation</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {(expert.expertise ?? []).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-muted/60 text-foreground text-xs rounded-md border border-border/60"
                >
                  {skill}
                </span>
              ))}
            </div>
            <div className="pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Reviews</p>
                  <p className="font-semibold text-foreground">{expert.totalReviews || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Success Rate</p>
                  <p className="font-semibold text-foreground">{expert.successRate || 0}%</p>
                </div>
              </div>
              {expert.joinedAt && (
                <p className="text-xs text-muted-foreground mt-3">
                  Joined {new Date(expert.joinedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
      {(experts || []).length === 0 && (
        <p className="text-center text-muted-foreground py-12">No experts in this guild yet</p>
      )}
    </div>
  );
}
