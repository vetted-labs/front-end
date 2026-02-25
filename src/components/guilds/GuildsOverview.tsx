"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Shield, Search, ArrowRight, Zap, AlertCircle, Plus, Users, Loader2, X } from "lucide-react";
import { expertApi, guildsApi } from "@/lib/api";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Alert } from "../ui/alert";
import { GuildCard } from "../GuildCard";
import { ReputationLeaderboard } from "../ReputationLeaderboard";
import { getGuildDetailedInfo, getGuildIcon, getGuildPreviewDescription } from "@/lib/guildHelpers";
import type { ExpertProfile, Guild } from "@/types";

type TabType = "guilds" | "leaderboard";

export function GuildsOverview() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>("guilds");
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Guild picker modal state
  const [showGuildPicker, setShowGuildPicker] = useState(false);
  const [availableGuilds, setAvailableGuilds] = useState<Guild[]>([]);
  const [loadingGuilds, setLoadingGuilds] = useState(false);
  const [guildSearchQuery, setGuildSearchQuery] = useState("");
  const debouncedGuildSearch = useDebounce(guildSearchQuery, 300);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showGuildPicker) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showGuildPicker]);

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
      const data = await expertApi.getProfile(address);

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

  const openGuildPicker = async () => {
    setShowGuildPicker(true);
    setGuildSearchQuery("");
    setLoadingGuilds(true);
    try {
      const allGuilds = await guildsApi.getAll();
      if (Array.isArray(allGuilds)) {
        const memberGuildIds = new Set(profile?.guilds.map((g) => g.id) || []);
        setAvailableGuilds(allGuilds.filter((g: Guild) => !memberGuildIds.has(g.id)));
      }
    } catch {
      setAvailableGuilds([]);
    } finally {
      setLoadingGuilds(false);
    }
  };

  const filteredAvailableGuilds = availableGuilds.filter((guild) => {
    if (!debouncedGuildSearch) return true;
    const searchLower = debouncedGuildSearch.toLowerCase();
    return (
      guild.name.toLowerCase().includes(searchLower) ||
      guild.description.toLowerCase().includes(searchLower)
    );
  });

  const handleGuildClick = (guildId: string) => {
    router.push(`/expert/guild/${guildId}`);
  };

  const filteredGuilds = profile?.guilds.filter((guild) => {
    const detailedInfo = getGuildDetailedInfo(guild.name);
    const searchLower = debouncedSearch.toLowerCase();

    return (
      guild.name.toLowerCase().includes(searchLower) ||
      guild.description.toLowerCase().includes(searchLower) ||
      detailedInfo.focus.toLowerCase().includes(searchLower) ||
      detailedInfo.details.toLowerCase().includes(searchLower) ||
      detailedInfo.examples.toLowerCase().includes(searchLower)
    );
  }) || [];

  const totalPendingApplications = (profile?.guilds || []).reduce(
    (sum, g) => sum + (g.pendingProposals || 0),
    0
  );

  if (isLoading) {
    return null;
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
    <div className="space-y-8 animate-page-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">My Guilds</h1>
          <p className="text-muted-foreground">
            Manage your guild memberships, review applications, and track leaderboard rankings
          </p>
        </div>
        <button
          onClick={openGuildPicker}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-accent text-[hsl(var(--gradient-button-text))] font-medium rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Join Guild
        </button>
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
          {totalPendingApplications > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    <Zap className="w-5 h-5 inline mr-2 text-yellow-600 dark:text-yellow-400" />
                    Action Required
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {totalPendingApplications} application{totalPendingApplications !== 1 ? "s" : ""} waiting for your review
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
                          {guild.pendingProposals} pending application
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
                  <p className="text-muted-foreground mb-4">
                    Browse available guilds and apply to start reviewing candidates.
                  </p>
                  <button
                    onClick={openGuildPicker}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-accent text-[hsl(var(--gradient-button-text))] font-medium rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Browse Guilds
                  </button>
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

      {/* Guild Picker Modal */}
      {showGuildPicker && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 dark:bg-black/70 transition-opacity"
            onClick={() => setShowGuildPicker(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-border/60 dark:bg-card/50 dark:border-white/[0.08]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative glow */}
              <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-primary/8 blur-3xl" />

              {/* Modal Header */}
              <div className="relative flex items-center justify-between p-6 border-b border-border/60">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Join a Guild</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose a guild to apply for membership
                  </p>
                </div>
                <button
                  onClick={() => setShowGuildPicker(false)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="relative p-4 border-b border-border/40">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search available guilds..."
                  value={guildSearchQuery}
                  onChange={(e) => setGuildSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-muted/50 border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>

              {/* Guild List */}
              <div className="relative overflow-y-auto p-4 space-y-3" style={{ maxHeight: "calc(85vh - 180px)" }}>
                {loadingGuilds ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground">Loading guilds...</p>
                  </div>
                ) : filteredAvailableGuilds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground mb-3" />
                    <h3 className="text-base font-medium text-foreground mb-1">
                      {debouncedGuildSearch ? "No guilds match your search" : "No available guilds"}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                      {debouncedGuildSearch
                        ? "Try a different search term"
                        : "You're already a member of all available guilds!"}
                    </p>
                  </div>
                ) : (
                  filteredAvailableGuilds.map((guild) => {
                    const GuildIcon = getGuildIcon(guild.name);
                    return (
                      <button
                        key={guild.id}
                        onClick={() => {
                          setShowGuildPicker(false);
                          router.push(`/expert/apply?guild=${encodeURIComponent(guild.id)}`);
                        }}
                        className="group w-full text-left p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:shadow-md hover:bg-card/80 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/10 border border-border/60 flex items-center justify-center flex-shrink-0">
                            <GuildIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {guild.name}
                              </h3>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                                <Users className="w-3.5 h-3.5" />
                                <span>{guild.memberCount ?? guild.totalMembers ?? 0} members</span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                              {getGuildPreviewDescription(guild.name)}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
