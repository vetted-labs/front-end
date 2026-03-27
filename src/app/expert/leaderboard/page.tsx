"use client";

import { Suspense } from "react";
import LeaderboardPage from "@/components/leaderboard/LeaderboardPage";

export default function LeaderboardRoute() {
  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense>
          <LeaderboardPage />
        </Suspense>
      </div>
    </div>
  );
}
