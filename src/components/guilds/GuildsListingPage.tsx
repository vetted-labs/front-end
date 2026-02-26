"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Users,
  Award,
  Briefcase,
  X,
} from "lucide-react";
import { Alert } from "@/components/ui";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { guildsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { GuildCard } from "@/components/GuildCard";
import { getGuildDetailedInfo, getGuildIcon } from "@/lib/guildHelpers";
import type { Guild } from "@/types";

export default function GlobalGuildsPage() {
  const router = useRouter();
  const [openTooltipId, setOpenTooltipId] = useState<string | null>(null);

  const { data: guilds, isLoading, error } = useFetch<Guild[]>(
    () => guildsApi.getAll(),
  );

  const { paginatedItems: currentGuilds, currentPage, totalPages, setCurrentPage } = useClientPagination(guilds ?? [], 6);

  // Restore scroll position when coming back to this page
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('guildsScrollPosition');
    if (savedScrollPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition));
        sessionStorage.removeItem('guildsScrollPosition');
      }, 100);
    }
  }, []);

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
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground animate-page-enter">
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
              {(guilds ?? []).length}
            </p>
            <p className="text-sm text-muted-foreground font-medium">Active Guilds</p>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-center shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-orange-400/70 to-amber-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-border bg-muted/50 mb-3">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <p className="text-3xl font-semibold text-foreground mb-1">
              {(guilds ?? []).reduce((sum, g) => sum + (g.expertCount || 0), 0)}
            </p>
            <p className="text-sm text-muted-foreground font-medium">Expert Reviewers</p>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-center shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-orange-400/70 to-amber-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-border bg-muted/50 mb-3">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <p className="text-3xl font-semibold text-foreground mb-1">
              {(guilds ?? []).reduce((sum, g) => sum + (g.totalMembers || 0), 0)}
            </p>
            <p className="text-sm text-muted-foreground font-medium">Total Members</p>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-center shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-orange-400/70 to-amber-500/0 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl border border-border bg-muted/50 mb-3">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <p className="text-3xl font-semibold text-foreground mb-1">
              {(guilds ?? []).reduce((sum, g) => sum + (g.openPositions || 0), 0)}
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

          {(guilds ?? []).length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentGuilds.map((guild) => (
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
                ))}
              </div>

              {/* Pagination Controls */}
              <PaginationNav
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                className="mt-8"
              />
            </>
          ) : (
            <EmptyState
              icon={Shield}
              title="No guilds available yet"
              description="Check back soon for new professional communities"
              className="py-16 rounded-2xl border border-border bg-card"
            />
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
                const guild = (guilds ?? []).find(g => g.id === openTooltipId);
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
