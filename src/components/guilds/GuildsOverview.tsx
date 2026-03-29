"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { Shield, Search, ArrowRight, Zap, AlertCircle, Plus, Users, Loader2 } from "lucide-react";
import { expertApi, guildsApi } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { SkeletonCard } from "@/components/ui/skeleton";
import { DataSection } from "@/lib/motion";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Alert } from "../ui/alert";
import { Modal } from "../ui/modal";
import { GuildCard } from "../GuildCard";
import LeaderboardPage from "../leaderboard/LeaderboardPage";
import { getGuildDetailedInfo, getGuildIcon, getGuildPreviewDescription } from "@/lib/guildHelpers";
import type { ExpertProfile, Guild } from "@/types";

type TabType = "guilds" | "leaderboard";

export function GuildsOverview() {
  const router = useRouter();
  const { address, isConnected } = useExpertAccount();
  const [activeTab, setActiveTab] = useState<TabType>("guilds");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [showGuildPicker, setShowGuildPicker] = useState(false);
  const [availableGuilds, setAvailableGuilds] = useState<Guild[]>([]);
  const { execute: executeLoadGuilds, isLoading: loadingGuilds } = useApi();
  const [guildSearchQuery, setGuildSearchQuery] = useState("");
  const debouncedGuildSearch = useDebounce(guildSearchQuery, 300);

  const { data: profile, isLoading, error } = useFetch<ExpertProfile>(
    () => expertApi.getProfile(address!),
    { skip: !isConnected || !address },
  );

  const profileGuilds = Array.isArray(profile?.guilds) ? profile.guilds : [];

  const openGuildPicker = async () => {
    setShowGuildPicker(true);
    setGuildSearchQuery("");
    await executeLoadGuilds(
      () => guildsApi.getAll(),
      {
        onSuccess: (allGuilds) => {
          if (Array.isArray(allGuilds)) {
            const memberGuildIds = new Set(profileGuilds.map((g) => g.id));
            setAvailableGuilds(allGuilds.filter((g: Guild) => !memberGuildIds.has(g.id)));
          }
        },
        onError: () => { setAvailableGuilds([]); },
      }
    );
  };

  const filteredAvailableGuilds = availableGuilds.filter((guild) => {
    if (!debouncedGuildSearch) return true;
    const searchLower = debouncedGuildSearch.toLowerCase();
    return guild.name.toLowerCase().includes(searchLower) || guild.description.toLowerCase().includes(searchLower);
  });

  const handleGuildClick = (guildId: string) => {
    router.push(`/expert/guild/${guildId}`);
  };

  const filteredGuilds = profileGuilds.filter((guild) => {
    const detailedInfo = getGuildDetailedInfo(guild.name);
    const searchLower = debouncedSearch.toLowerCase();
    return (
      guild.name.toLowerCase().includes(searchLower) ||
      guild.description.toLowerCase().includes(searchLower) ||
      detailedInfo.focus.toLowerCase().includes(searchLower) ||
      detailedInfo.details.toLowerCase().includes(searchLower) ||
      detailedInfo.examples.toLowerCase().includes(searchLower)
    );
  });

  // Sort: urgent (pending) first, then alphabetical
  const sortedGuilds = [...filteredGuilds].sort((a, b) => {
    const aPending = (a.pendingProposals || 0) + (a.pendingApplications || 0);
    const bPending = (b.pendingProposals || 0) + (b.pendingApplications || 0);
    if (aPending > 0 && bPending === 0) return -1;
    if (bPending > 0 && aPending === 0) return 1;
    return a.name.localeCompare(b.name);
  });

  const totalPendingApplications = profileGuilds.reduce(
    (sum, g) => sum + (g.pendingProposals || 0),
    0
  );

  return (
    <div className="min-h-screen space-y-6 animate-page-enter">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground mb-1">
            My Guilds
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your guild memberships, review applications, and track rankings
          </p>
        </div>
        <button
          onClick={openGuildPicker}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-display font-bold rounded-xl hover:shadow-[0_6px_24px_hsl(var(--primary)/0.35)] hover:scale-[1.02] transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Join Guild
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab("guilds")}
            className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${
              activeTab === "guilds"
                ? "text-primary font-bold border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            My Guilds
            {profileGuilds.length > 0 && (
              <span className="ml-2 px-2 py-0.5 font-mono text-xs font-semibold rounded-full bg-primary/[0.08] text-primary border border-primary/20">
                {profileGuilds.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${
              activeTab === "leaderboard"
                ? "text-primary font-bold border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            Leaderboard
          </button>
        </div>
      </div>

      {/* My Guilds Tab */}
      {activeTab === "guilds" && (
        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search guilds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-0 focus:border-primary/30 focus: text-foreground placeholder:text-muted-foreground transition-all text-sm"
            />
          </div>

          {/* Error / No Profile */}
          {error && <Alert variant="error">{error}</Alert>}
          {!isLoading && !error && !profile && (
            <Alert variant="error">No profile data available</Alert>
          )}

          {/* Action Required */}
          {!isLoading && !error && totalPendingApplications > 0 && (
            <div className="rounded-xl p-6 bg-warning/[0.04] border border-warning/15 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-border opacity-80" />
              <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="w-[38px] h-[38px] rounded-[11px] bg-warning/[0.06] border border-warning/15 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-[18px] h-[18px] text-warning" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-display text-foreground mb-0.5">Action Required</h3>
                    <p className="text-sm text-muted-foreground">
                      {totalPendingApplications} application{totalPendingApplications !== 1 ? "s" : ""} waiting for your review
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/expert/voting")}
                  className="px-4 py-2 rounded-lg bg-warning/[0.12] border border-warning/25 text-warning font-display text-xs font-bold transition-all hover:bg-warning/[0.2] whitespace-nowrap"
                >
                  Review All
                </button>
              </div>
              <div className="space-y-2">
                {profileGuilds
                  .filter((g) => g.pendingProposals > 0)
                  .map((guild) => {
                    const GIcon = getGuildIcon(guild.name);
                    return (
                      <button
                        key={guild.id}
                        onClick={() => router.push(`/expert/voting?guild=${guild.id}`)}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border hover:border-warning/15 hover:bg-warning/[0.03] transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-[30px] h-[30px] rounded-lg bg-primary/[0.08] border border-primary/15 flex items-center justify-center">
                            <GIcon className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">{guild.name}</p>
                            <p className="text-xs font-medium text-warning">
                              {guild.pendingProposals} pending application{guild.pendingProposals !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Guild Cards Grid */}
          <DataSection
            isLoading={isLoading}
            skeleton={
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            }
          >
            {sortedGuilds.length === 0 ? (
              <div className="rounded-xl p-12 text-center border border-border">
                {searchQuery ? (
                  <>
                    <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-60" />
                    <h3 className="text-xl font-bold font-display text-foreground mb-2">No guilds found</h3>
                    <p className="text-muted-foreground">Try adjusting your search terms</p>
                  </>
                ) : (
                  <>
                    <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-60" />
                    <h3 className="text-xl font-bold font-display text-foreground mb-2">No Guild Memberships Yet</h3>
                    <p className="text-muted-foreground mb-4">Browse available guilds and apply to start reviewing candidates.</p>
                    <button
                      onClick={openGuildPicker}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-display font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Browse Guilds
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedGuilds.map((guild) => (
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
          </DataSection>
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === "leaderboard" && (
        <LeaderboardPage />
      )}

      {/* Guild Picker Modal */}
      <Modal isOpen={showGuildPicker} onClose={() => setShowGuildPicker(false)} title="Join a Guild">
        <p className="text-sm text-muted-foreground -mt-4 mb-4">
          Choose a guild to apply for membership
        </p>
        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search available guilds..."
            value={guildSearchQuery}
            onChange={(e) => setGuildSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border border-border rounded-xl text-sm focus:outline-none focus:ring-0 focus:border-primary/30 text-foreground placeholder:text-muted-foreground transition-all"
            autoFocus
          />
        </div>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {loadingGuilds ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Loading guilds...</p>
            </div>
          ) : filteredAvailableGuilds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-3 opacity-60" />
              <h3 className="text-base font-medium text-foreground mb-1">
                {debouncedGuildSearch ? "No guilds match your search" : "No available guilds"}
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {debouncedGuildSearch ? "Try a different search term" : "You're already a member of all available guilds!"}
              </p>
            </div>
          ) : (
            filteredAvailableGuilds.map((guild) => {
              const GIcon = getGuildIcon(guild.name);
              return (
                <button
                  key={guild.id}
                  onClick={() => {
                    setShowGuildPicker(false);
                    router.push(`/expert/apply?guild=${encodeURIComponent(guild.id)}`);
                  }}
                  className="group w-full text-left flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/[0.03] transition-all"
                >
                  <div className="w-[38px] h-[38px] rounded-lg bg-primary/[0.08] border border-primary/15 flex items-center justify-center flex-shrink-0">
                    <GIcon className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {guild.name}
                    </h3>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Users className="w-3 h-3 opacity-50" />
                      {guild.memberCount ?? guild.totalMembers ?? 0} members
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
}
