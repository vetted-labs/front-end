"use client";
import { ReputationLeaderboard } from "@/components/ReputationLeaderboard";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";

export default function LeaderboardPage() {
  const { address } = useAccount();
  const [expertId, setExpertId] = useState<string | undefined>();

  useEffect(() => {
    // Fetch expert ID from profile
    const fetchExpertId = async () => {
      if (!address) return;

      try {
        const response = await fetch(
          `http://localhost:4000/api/experts/profile?wallet=${address}`
        );

        if (response.ok) {
          const result = await response.json();
          setExpertId(result.data?.id);
        }
      } catch (error) {
        console.error("Failed to fetch expert ID:", error);
      }
    };

    fetchExpertId();
  }, [address]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ReputationLeaderboard currentExpertId={expertId} />
      </div>
    </div>
  );
}
