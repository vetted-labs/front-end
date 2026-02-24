"use client";

import { Users, Shield, Briefcase, Star } from "lucide-react";
import type { Guild } from "@/types";

interface HeroSectionProps {
  guilds: Guild[];
  isLoadingGuilds: boolean;
  onJoinAsCandidate: () => void;
  onJoinAsExpert: () => void;
  onPostJob: () => void;
}

export function HeroSection({
  guilds,
  isLoadingGuilds,
  onJoinAsCandidate,
  onJoinAsExpert,
  onPostJob,
}: HeroSectionProps) {
  return (
    <>
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Private Beta Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6 animate-pulse">
            <div className="w-2 h-2 bg-primary rounded-full"></div>
            <span className="text-sm font-semibold text-primary">
              Private beta LIVE
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight font-display">
            Hiring Finally Built on Trust
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-muted-foreground mb-6">
            Join guilds, review candidates, earn rewards
          </p>

          {/* Active Guilds */}
          {!isLoadingGuilds && guilds.length > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">Active Guilds:</span>
              <span>
                {guilds.slice(0, 3).map((g, i) => (
                  <span key={g.id}>
                    {g.name.replace(/ Guild$/i, "")}
                    {i < Math.min(guilds.length, 3) - 1 ? " • " : ""}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Cards */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Join as Candidate */}
          <button
            onClick={onJoinAsCandidate}
            className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left group"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              Join as a Candidate
            </h3>
          </button>

          {/* Join as Expert - Featured */}
          <button
            onClick={onJoinAsExpert}
            className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 rounded-xl p-6 border-2 border-primary/30 hover:border-primary hover:shadow-xl transition-all text-left group relative overflow-hidden"
          >
            <div className="absolute top-2 right-2">
              <Star className="w-4 h-4 text-primary fill-primary" />
            </div>
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              Join as an Expert
            </h3>
          </button>

          {/* Post a Job */}
          <button
            onClick={onPostJob}
            className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 hover:shadow-lg transition-all text-left group"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              Post a Job
            </h3>
          </button>
        </div>
      </div>
    </>
  );
}
