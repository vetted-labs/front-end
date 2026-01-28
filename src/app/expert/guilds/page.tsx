"use client";
import { ExpertNavbar } from "@/components/ExpertNavbar";
import { GuildsOverview } from "@/components/guilds/GuildsOverview";

export default function GuildsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <ExpertNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GuildsOverview />
      </div>
    </div>
  );
}
