"use client";
import { ReputationLeaderboard } from "@/components/ReputationLeaderboard";
import { useAccount } from "wagmi";
import { expertApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";

export default function LeaderboardPage() {
  const { address } = useAccount();

  const { data: expertProfile } = useFetch(
    () => expertApi.getProfile(address!),
    { skip: !address }
  );
  const expertId = expertProfile?.id;

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ReputationLeaderboard currentExpertId={expertId} />
      </div>
    </div>
  );
}
