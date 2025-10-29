"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect, useChainId } from "wagmi";
import {
  Shield,
  Users,
  TrendingUp,
  Award,
  Loader2,
  ArrowRight,
  Star,
  Coins,
  LogOut,
  Wallet,
} from "lucide-react";
import { Alert } from "./ui/Alert";
import { LoadingState } from "./ui/LoadingState";
import { expertApi } from "@/lib/api";

interface Guild {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  expertRole: "recruit" | "craftsman" | "master";
  reputation: number;
  totalEarnings: number;
  pendingProposals: number;
  ongoingProposals: number;
  closedProposals: number;
}

interface ExpertProfile {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  reputation: number;
  totalEarnings: number;
  guilds: Guild[];
}

const getNetworkName = (chainId: number | undefined) => {
  if (!chainId) return "Unknown";
  const networks: Record<number, string> = {
    1: "Ethereum",
    11155111: "Sepolia",
    137: "Polygon",
    42161: "Arbitrum",
  };
  return networks[chainId] || `Chain ${chainId}`;
};

export function ExpertDashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      fetchExpertProfile();
    } else {
      router.push("/expert");
    }
  }, [isConnected, address]);

  const fetchExpertProfile = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const data: any = await expertApi.getProfile(address);
      setProfile(data);
    } catch (err: any) {
      if (err.status === 404) {
        setError("Expert profile not found. Please apply first.");
      } else {
        setError(err.message || "Failed to fetch profile");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuildClick = (guildId: string) => {
    router.push(`/expert/guild/${guildId}`);
  };

  const handleDisconnect = () => {
    disconnect();
    router.push("/expert");
  };

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="warning">
          Please connect your wallet to access the expert dashboard.
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading your expert profile..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
          <button
            onClick={() => router.push("/expert/apply")}
            className="w-full px-6 py-3 text-white bg-gradient-to-r from-primary to-indigo-600 rounded-lg hover:opacity-90  transition-all"
          >
            Apply as Expert
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="error">No profile data available</Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <nav className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Image src="/Vetted.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground">Vetted</span>
              <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                Expert
              </span>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {mounted && address && (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-xl border border-border">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-indigo-600 rounded-lg flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-mono text-foreground font-medium">
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {getNetworkName(chainId)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-all"
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile.fullName}!
          </h1>
          <p className="text-muted-foreground">
            Manage your guild memberships and track your earnings
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Reputation Score</p>
            <p className="text-3xl font-bold text-foreground">{profile.reputation}</p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-lg flex items-center justify-center">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
            <p className="text-3xl font-bold text-foreground">
              ${profile.totalEarnings.toLocaleString()}
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Guild Memberships</p>
            <p className="text-3xl font-bold text-foreground">{profile.guilds.length}</p>
          </div>
        </div>

        {/* Guilds Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Your Guilds</h2>
          </div>

          {profile.guilds.length === 0 ? (
            <div className="bg-card rounded-xl p-12 text-center shadow-sm border border-border">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Guild Memberships Yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Your application is under review. You&apos;ll be added to a guild once approved.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {profile.guilds.map((guild) => (
                <div
                  key={guild.id}
                  onClick={() => handleGuildClick(guild.id)}
                  className="bg-card/50 backdrop-blur-sm rounded-xl p-6 shadow-sm border-2 border-border hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {guild.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{guild.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Guild Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Your Role</p>
                      <p className="text-sm font-semibold text-foreground capitalize">
                        {guild.expertRole}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Members</p>
                      <p className="text-sm font-semibold text-foreground">
                        {guild.memberCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Reputation</p>
                      <p className="text-sm font-semibold text-foreground">
                        {guild.reputation}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Earnings</p>
                      <p className="text-sm font-semibold text-foreground">
                        ${guild.totalEarnings.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Proposal Stats */}
                  <div className="flex items-center gap-4 pt-4 border-t border-border">
                    <div className="flex items-center text-xs">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                      <span className="text-muted-foreground">
                        {guild.pendingProposals} Pending
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                      <span className="text-muted-foreground">
                        {guild.ongoingProposals} Ongoing
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-muted-foreground">
                        {guild.closedProposals} Closed
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
