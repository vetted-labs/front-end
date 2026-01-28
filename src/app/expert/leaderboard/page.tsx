"use client";
import { ReputationLeaderboard } from "@/components/ReputationLeaderboard";
import { ExpertNavbar } from "@/components/ExpertNavbar";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { expertApi } from "@/lib/api";

export default function LeaderboardPage() {
  const { address } = useAccount();
  const [expertId, setExpertId] = useState<string | undefined>();

  useEffect(() => {
    // Fetch expert ID from profile
    const fetchExpertId = async () => {
      if (!address) return;

      try {
        const result: any = await expertApi.getProfile(address);
        setExpertId(result.data?.id);
      } catch (error) {
        console.error("Failed to fetch expert ID:", error);
      }
    };

    fetchExpertId();
  }, [address]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <ExpertNavbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <ReputationLeaderboard currentExpertId={expertId} />
      </div>
    </div>
  );
}
