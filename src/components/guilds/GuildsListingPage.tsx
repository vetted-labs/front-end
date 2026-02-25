"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  Shield,
  Users,
  Award,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Alert } from "@/components/ui";
import { guildsApi } from "@/lib/api";
import { GuildCard } from "@/components/GuildCard";
import { getGuildDetailedInfo, getGuildIcon } from "@/lib/guildHelpers";
import type { Guild } from "@/types";

export default function GlobalGuildsPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);
  const guildsPerPage = 6;

  useEffect(() => {
    // Restore scroll position when coming back to this page
    const savedScrollPosition = sessionStorage.getItem('guildsScrollPosition');
    if (savedScrollPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition));
        sessionStorage.removeItem('guildsScrollPosition');
      }, 100);
    }

    fetchGuilds();
  }, [isConnected]);

  const fetchGuilds = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const guildsData: any = await guildsApi.getAll();
      setGuilds(guildsData);
    } catch (err) {
      console.error("[Guilds Page] Error:", err);
      setError("Unable to load guilds. Please check that the backend is running and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInfoClick = (guildId: string) => {
    setOpenTooltipId(openTooltipId === guildId ? null : guildId);
  };

  const closeTooltip = () => {
    setOpenTooltipId(null);
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="relative overflow-x-hidden bg-background text-foreground animate-page-enter">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.08),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_55%)]" />
        <div className="absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-orange-500/8 dark:bg-orange-500/15 blur-3xl" />
        <div className="absolute top-1/3 left-[-15%] h-96 w-96 rounded-full bg-amber-500/6 dark:bg-amber-500/12 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative z-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.10),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.22),transparent_60%)]" />
        <div className="absolute -bottom-20 left-1/2 h-40 w-96 -translate-x-1/2 bg-amber-500/5 dark:bg-amber-500/10 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 text-[11px] uppercase tracking-[0.3em] text-primary mb-6">
              Noble Protocol Guilds
            </div>
            <h1 className="text-5xl md:text-6xl font-semibold mb-4 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 dark:from-amber-200 dark:via-orange-200 dark:to-amber-100 bg-clip-text text-transparent">
              Guilds
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Elite communities where vetted experts stake reputation, curate talent, and steer the frontier of crypto work.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Global Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-center shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-orange-400/70 to-amber-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-border bg-muted/50 mb-3">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <p className="text-3xl font-semibold text-foreground mb-1">
              {guilds.length}
            </p>
            <p className="text-sm text-muted-foreground font-medium">Active Guilds</p>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-center shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-orange-400/70 to-amber-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-border bg-muted/50 mb-3">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <p className="text-3xl font-semibold text-foreground mb-1">
              {guilds.reduce((sum, g) => sum + (g.expertCount || 0), 0)}
            </p>
            <p className="text-sm text-muted-foreground font-medium">Expert Reviewers</p>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-center shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-orange-400/70 to-amber-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-border bg-muted/50 mb-3">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <p className="text-3xl font-semibold text-foreground mb-1">
              {guilds.reduce((sum, g) => sum + (g.totalMembers || 0), 0)}
            </p>
            <p className="text-sm text-muted-foreground font-medium">Total Members</p>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-center shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-orange-400/70 to-amber-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-border bg-muted/50 mb-3">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <p className="text-3xl font-semibold text-foreground mb-1">
              {guilds.reduce((sum, g) => sum + (g.openPositions || 0), 0)}
            </p>
            <p className="text-sm text-muted-foreground font-medium">Open Positions</p>
          </div>
        </div>

        {/* All Guilds */}
        <div>
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-8 font-serif">
            All Guilds
          </h2>

          {error && (
            <Alert variant="error" className="mb-6">{error}</Alert>
          )}

          {guilds.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(() => {
                  const indexOfLastGuild = currentPage * guildsPerPage;
                  const indexOfFirstGuild = indexOfLastGuild - guildsPerPage;
                  const currentGuilds = guilds.slice(indexOfFirstGuild, indexOfLastGuild);

                  return currentGuilds.map((guild) => {
                    return (
                      <GuildCard
                        key={guild.id}
                        guild={{
                          id: guild.id,
                          name: guild.name,
                          description: guild.description,
                          memberCount: guild.totalMembers || guild.candidateCount || 0,
                          expertCount: guild.expertCount,
                          jobCount: guild.openPositions,
                          totalProposalsReviewed: guild.totalProposalsReviewed,
                        }}
                        variant="browse"
                        onViewDetails={(guildId) => {
                          sessionStorage.setItem('guildsScrollPosition', window.scrollY.toString());
                          router.push(`/guilds/${guildId}`);
                        }}
                        showDescription={true}
                      />
                    );
                  });
                })()}
              </div>

              {/* Pagination Controls */}
              {guilds.length > guildsPerPage && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted/50 text-foreground hover:border-primary/40 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.ceil(guilds.length / guildsPerPage) }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-amber-300 via-orange-300 to-amber-200 text-slate-900 shadow-sm dark:shadow-[0_12px_30px_rgba(251,146,60,0.25)]'
                            : 'border border-border bg-muted/50 text-foreground hover:border-primary/40 hover:bg-muted'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(guilds.length / guildsPerPage)))}
                    disabled={currentPage === Math.ceil(guilds.length / guildsPerPage)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted/50 text-foreground hover:border-primary/40 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 rounded-2xl border border-border bg-card">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-60" />
              <p className="text-lg text-muted-foreground mb-2">No guilds available yet</p>
              <p className="text-sm text-muted-foreground">Check back soon for new professional communities</p>
            </div>
          )}
        </div>

        {/* Mobile tooltip modal */}
        {openTooltipId && (
          <div className="md:hidden fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/50" onClick={closeTooltip} />
            <div className="relative rounded-t-2xl p-6 w-full max-h-[80vh] overflow-y-auto border border-border bg-card">
              <button onClick={closeTooltip} className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              {(() => {
                const guild = guilds.find(g => g.id === openTooltipId);
                if (!guild) return null;
                const GuildIcon = getGuildIcon(guild.name);
                const detailedInfo = getGuildDetailedInfo(guild.name);
                return (
                  <>
                    <div className="flex items-start gap-3 mb-4 pr-8">
                      <div className="w-12 h-12 rounded-xl border border-border bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <GuildIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground mb-1">{guild.name}</h3>
                        <p className="text-sm text-primary font-medium">{detailedInfo.focus}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {detailedInfo.details}
                      </p>
                    </div>

                    <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
                      <p className="text-xs font-semibold text-foreground mb-2">Common Roles:</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {detailedInfo.examples}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-foreground mb-1">{guild.expertCount}</p>
                        <p className="text-xs text-muted-foreground">Expert Reviewers</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-foreground mb-1">{guild.totalMembers}</p>
                        <p className="text-xs text-muted-foreground">Total Members</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-foreground mb-1">{guild.openPositions}</p>
                        <p className="text-xs text-muted-foreground">Open Positions</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
