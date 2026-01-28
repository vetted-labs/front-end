"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { User, Mail, Wallet, Calendar, TrendingUp, DollarSign, Shield, Copy, Check } from "lucide-react";
import { expertApi } from "@/lib/api";
import { LoadingState } from "./ui/loadingstate";
import { Alert } from "./ui/alert";
import { GuildMembershipCard } from "./GuildMembershipCard";

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
  bio?: string;
  guilds: Guild[];
  createdAt?: string;
}

export function ExpertProfileView() {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      fetchProfile();
    }
  }, [isConnected, address]);

  const fetchProfile = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const result: any = await expertApi.getProfile(address);
      const data = result.data || result;

      // Ensure guilds is an array
      const guilds = Array.isArray(data.guilds) ? data.guilds : [];

      const enhancedData = {
        ...data,
        guilds: guilds,
      };

      setProfile(enhancedData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyAddress = () => {
    if (profile?.walletAddress) {
      navigator.clipboard.writeText(profile.walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };


  if (isLoading) {
    return <LoadingState message="Loading your profile..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="error">{error}</Alert>
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

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "N/A";

  return (
    <div className="space-y-6">
      {/* Header Section with Bio */}
      <div className="bg-card rounded-xl p-8 shadow-sm border border-border">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-gradient-to-r from-primary to-accent rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <User className="w-12 h-12 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">{profile.fullName}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                {profile.email}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Member since {memberSince}
              </div>
            </div>

            {/* Bio/About */}
            {profile.bio && (
              <div className="mt-4">
                <h2 className="text-lg font-semibold text-foreground mb-2">About</h2>
                <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Wallet Address - More subtle */}
        <details className="group mt-6">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 py-2">
            <Wallet className="w-3 h-3" />
            <span>Show wallet address</span>
          </summary>
          <div className="mt-2 bg-muted/50 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <p className="font-mono text-xs text-foreground">{profile.walletAddress}</p>
            </div>
            <button
              onClick={copyAddress}
              className="px-2 py-1 rounded-md hover:bg-muted transition-all flex items-center gap-1"
            >
              {copiedAddress ? (
                <>
                  <Check className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Copy</span>
                </>
              )}
            </button>
          </div>
        </details>
      </div>

      {/* Reputation & Earnings Card */}
      <div className="bg-card rounded-xl p-8 shadow-sm border border-border">
        <h2 className="text-2xl font-bold text-foreground mb-6">Reputation & Earnings</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 dark:from-amber-800/30 dark:to-orange-800/30 rounded-xl p-6 border border-amber-700/30 dark:border-amber-600/30">
            <TrendingUp className="w-8 h-8 text-amber-600 dark:text-amber-500 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">Reputation Score</p>
            <p className="text-4xl font-bold text-foreground">{profile.reputation}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-900/20 to-green-900/20 dark:from-emerald-800/30 dark:to-green-800/30 rounded-xl p-6 border border-emerald-700/30 dark:border-emerald-600/30">
            <DollarSign className="w-8 h-8 text-emerald-600 dark:text-emerald-500 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">Total Earnings</p>
            <p className="text-4xl font-bold text-foreground">${profile.totalEarnings.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 dark:from-blue-800/30 dark:to-cyan-800/30 rounded-xl p-6 border border-blue-700/30 dark:border-blue-600/30">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-500 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">Active Guilds</p>
            <p className="text-4xl font-bold text-foreground">{profile.guilds.length}</p>
          </div>
        </div>
      </div>

      {/* Guild Memberships */}
      <div className="bg-card rounded-xl p-8 shadow-sm border border-border">
        <h2 className="text-2xl font-bold text-foreground mb-6">Guild Memberships</h2>
        {profile.guilds.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-lg text-muted-foreground">No guild memberships yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {profile.guilds.map((guild) => (
              <GuildMembershipCard key={guild.id} guild={guild} variant="default" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
