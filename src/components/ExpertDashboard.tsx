"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
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

export function ExpertDashboard() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
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
      const response = await fetch(`http://localhost:4000/api/experts/profile?wallet=${address}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Expert profile not found. Please apply first.");
        }
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setError((err as Error).message);
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
        <Alert type="warning">
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
          <Alert type="error" className="mb-4">
            {error}
          </Alert>
          <button
            onClick={() => router.push("/expert/apply")}
            className="w-full px-6 py-3 text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all"
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
        <Alert type="error">No profile data available</Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg"></div>
              <span className="text-xl font-bold text-slate-900">Vetted</span>
              <span className="text-sm font-medium text-violet-600 bg-violet-50 px-2 py-1 rounded-md">
                Expert
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {mounted && address && (
                <>
                  <div className="flex items-center px-3 py-2 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg border border-violet-200">
                    <Wallet className="w-4 h-4 text-violet-600 mr-2" />
                    <span className="text-xs font-mono text-violet-700">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center text-sm text-slate-600 hover:text-slate-900 transition-all"
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back, {profile.fullName}!
          </h1>
          <p className="text-slate-600">
            Manage your guild memberships and track your earnings
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-violet-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Reputation Score</p>
            <p className="text-3xl font-bold text-slate-900">{profile.reputation}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-lg flex items-center justify-center">
                <Coins className="w-6 h-6 text-violet-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm text-slate-600 mb-1">Total Earnings</p>
            <p className="text-3xl font-bold text-slate-900">
              ${profile.totalEarnings.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-violet-600" />
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-1">Guild Memberships</p>
            <p className="text-3xl font-bold text-slate-900">{profile.guilds.length}</p>
          </div>
        </div>

        {/* Guilds Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Your Guilds</h2>
          </div>

          {profile.guilds.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-slate-200">
              <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No Guild Memberships Yet
              </h3>
              <p className="text-slate-600 mb-6">
                Your application is under review. You'll be added to a guild once approved.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {profile.guilds.map((guild) => (
                <div
                  key={guild.id}
                  onClick={() => handleGuildClick(guild.id)}
                  className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-violet-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-1 group-hover:text-violet-600 transition-colors">
                        {guild.name}
                      </h3>
                      <p className="text-sm text-slate-600">{guild.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Guild Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Your Role</p>
                      <p className="text-sm font-semibold text-slate-900 capitalize">
                        {guild.expertRole}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Members</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {guild.memberCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Reputation</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {guild.reputation}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Earnings</p>
                      <p className="text-sm font-semibold text-slate-900">
                        ${guild.totalEarnings.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Proposal Stats */}
                  <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center text-xs">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                      <span className="text-slate-600">
                        {guild.pendingProposals} Pending
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                      <span className="text-slate-600">
                        {guild.ongoingProposals} Ongoing
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-slate-600">
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
