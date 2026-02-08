"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { endorsementAccountabilityApi, expertApi } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Coins,
  Lock,
  CheckCircle2,
  XCircle,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { ExpertNavbar } from "@/components/ExpertNavbar";
import { EndorsementRewardCard } from "@/components/endorsements/EndorsementRewardCard";

interface RewardSummary {
  totalRewards: number;
  immediatePaid: number;
  lockedPending: number;
  forfeited: number;
}

interface RewardItem {
  id: string;
  applicationId: string;
  candidateName: string;
  jobTitle?: string;
  guildName?: string;
  immediateAmount: number;
  lockedAmount: number;
  totalAmount: number;
  status: "paid" | "locked" | "forfeited" | "released";
  hireDate?: string;
  retentionStartDate?: string;
}

export default function EndorsementRewardsPage() {
  const router = useRouter();
  const { address } = useAccount();
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [summary, setSummary] = useState<RewardSummary>({
    totalRewards: 0,
    immediatePaid: 0,
    lockedPending: 0,
    forfeited: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (address) {
      loadRewards();
    }
  }, [address]);

  const loadRewards = async () => {
    try {
      setLoading(true);

      // Get expert ID from wallet
      const profileResponse: any = await expertApi.getExpertByWallet(address as string);
      if (!profileResponse.success) return;

      const expertId = profileResponse.data.id;
      const response: any = await endorsementAccountabilityApi.getExpertRewards(expertId);

      if (response.success) {
        const data = response.data;
        setRewards(data.rewards || []);
        setSummary(
          data.summary || {
            totalRewards: 0,
            immediatePaid: 0,
            lockedPending: 0,
            forfeited: 0,
          }
        );
      }
    } catch (error: any) {
      console.error("Error loading rewards:", error);
      toast.error("Failed to load rewards data");
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: "Total Rewards",
      value: summary.totalRewards,
      icon: Award,
      color: "text-primary",
    },
    {
      label: "Immediate Paid",
      value: summary.immediatePaid,
      icon: CheckCircle2,
      color: "text-green-500",
    },
    {
      label: "Locked Pending",
      value: summary.lockedPending,
      icon: Lock,
      color: "text-amber-500",
    },
    {
      label: "Forfeited",
      value: summary.forfeited,
      icon: XCircle,
      color: "text-red-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <ExpertNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Endorsements
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Endorsement Rewards</h1>
          <p className="text-muted-foreground">
            Track your endorsement rewards, locked amounts, and retention progress.
          </p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading rewards...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label}>
                    <CardContent className="p-4 text-center">
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                      <p className="text-xs text-muted-foreground mb-1">
                        {stat.label}
                      </p>
                      <p className="text-xl font-bold">
                        {stat.value.toFixed(2)}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          VETD
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Rewards List */}
            {rewards.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Coins className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">No rewards yet</p>
                  <p className="text-muted-foreground mb-6">
                    Endorsement rewards will appear here when your endorsed candidates are hired.
                  </p>
                  <Button onClick={() => router.push("/expert/endorsements")}>
                    Browse Endorsements
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {rewards.map((reward) => (
                  <EndorsementRewardCard key={reward.id} reward={reward} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
