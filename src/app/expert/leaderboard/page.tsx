"use client";
import Image from "next/image";
import { ReputationLeaderboard } from "@/components/ReputationLeaderboard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { expertApi } from "@/lib/api";

export default function LeaderboardPage() {
  const router = useRouter();
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
      {/* Navigation */}
      <nav className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push("/expert/dashboard")}
              className="flex items-center space-x-2"
            >
              <Image src="/Vetted.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground">Vetted</span>
            </button>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={() => router.push("/expert/dashboard")}
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <ReputationLeaderboard currentExpertId={expertId} />
      </div>
    </div>
  );
}
