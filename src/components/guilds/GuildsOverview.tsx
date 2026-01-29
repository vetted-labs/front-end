"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Shield, Search, ArrowRight, Zap, AlertCircle } from "lucide-react";
import { expertApi } from "@/lib/api";
import { LoadingState } from "../ui/loadingstate";
import { Alert } from "../ui/alert";
import { GuildCard } from "../GuildCard";
import { ReputationLeaderboard } from "../ReputationLeaderboard";
import { getGuildDetailedInfo } from "@/lib/guildHelpers";

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

type TabType = "guilds" | "leaderboard";

export function GuildsOverview() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>("guilds");
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

      setProfile({
        ...data,
        guilds: guilds,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuildClick = (guildId: string) => {
    router.push(`/expert/guild/${guildId}`);
  };

  const filteredGuilds = profile?.guilds.filter((guild) => {
    const detailedInfo = getGuildDetailedInfo(guild.name);
    const searchLower = searchQuery.toLowerCase();

    return (
      guild.name.toLowerCase().includes(searchLower) ||
      guild.description.toLowerCase().includes(searchLower) ||
      detailedInfo.focus.toLowerCase().includes(searchLower) ||
      detailedInfo.details.toLowerCase().includes(searchLower) ||
      detailedInfo.examples.toLowerCase().includes(searchLower)
    );
  }) || [];

  const totalPendingProposals = (profile?.guilds || []).reduce(
    (sum, g) => sum + (g.pendingProposals || 0),
    0
  );

  if (isLoading) {
    return <LoadingState message="Loading guilds..." />;
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">My Guilds</h1>
        <p className="text-muted-foreground">
          Manage your guild memberships, review proposals, and track leaderboard rankings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab("guilds")}
          className={`px-4 py-3 font-medium transition-all ${
            activeTab === "guilds"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Guilds
          {profile.guilds.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 text-xs font-semibold rounded-full">
              {profile.guilds.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`px-4 py-3 font-medium transition-all ${
            activeTab === "leaderboard"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Leaderboard
        </button>
      </div>

      {/* My Guilds Tab */}
      {activeTab === "guilds" && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search guilds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Pending Actions Panel */}
          {totalPendingProposals > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    <Zap className="w-5 h-5 inline mr-2 text-yellow-600 dark:text-yellow-400" />
                    Action Required
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {totalPendingProposals} proposal{totalPendingProposals !== 1 ? "s" : ""} waiting for your review
                  </p>
                </div>
                <button
                  onClick={() => router.push("/expert/voting")}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-all"
                >
                  Review All
                </button>
              </div>
              <div className="space-y-2">
                {profile.guilds
                  .filter((g) => g.pendingProposals > 0)
                  .map((guild) => (
                    <button
                      key={guild.id}
                      onClick={() => handleGuildClick(guild.id)}
                      className="w-full flex items-center justify-between p-3 bg-card rounded-lg border border-border hover:border-primary/50 transition-all"
                    >
                      <div className="text-left">
                        <p className="font-medium text-foreground">{guild.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {guild.pendingProposals} pending proposal
                          {guild.pendingProposals !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Guild Cards Grid */}
          {filteredGuilds.length === 0 ? (
            <div className="bg-card rounded-2xl p-12 text-center border border-border">
              {searchQuery ? (
                <>
                  <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No guilds found
                  </h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms
                  </p>
                </>
              ) : (
                <>
                  <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No Guild Memberships Yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Your application is under review. You&apos;ll be added to a guild once approved.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGuilds.map((guild) => (
                <GuildCard
                  key={guild.id}
                  guild={guild}
                  variant="browse"
                  showDescription={true}
                  onViewDetails={handleGuildClick}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === "leaderboard" && (
        <div>
          <ReputationLeaderboard currentExpertId={profile.id} />
        </div>
      )}
    </div>
  );
}
