"use client";
import { GuildRanksProgression } from "@/components/GuildRanksProgression";

export default function GuildRanksPage() {
  // TODO: Fetch current user's rank data from API
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <GuildRanksProgression
        currentRank="recruit"
        reputation={25}
        reviewCount={5}
        consensusRate={80}
      />
    </div>
  );
}
