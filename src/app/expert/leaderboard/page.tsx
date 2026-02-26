"use client";
import { ReputationLeaderboard } from "@/components/ReputationLeaderboard";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { expertApi } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function LeaderboardPage() {
  const { address } = useAccount();
  const [expertId, setExpertId] = useState<string | undefined>();

  useEffect(() => {
    // Fetch expert ID from profile
    const fetchExpertId = async () => {
      if (!address) return;

      try {
        const result = await expertApi.getProfile(address);
        setExpertId(result.id);
      } catch (error) {
        logger.error("Failed to fetch expert ID", error);
      }
    };

    fetchExpertId();
  }, [address]);

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ReputationLeaderboard currentExpertId={expertId} />
      </div>
    </div>
  );
}
