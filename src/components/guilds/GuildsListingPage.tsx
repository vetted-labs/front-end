"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  ArrowUpRight,
  Users,
  FileCheck,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { Alert } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { guildsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { ListSkeleton } from "@/components/ui/page-skeleton";
import { Divider } from "@/components/ui/divider";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { getGuildIcon, getGuildPreviewDescription } from "@/lib/guildHelpers";
import { PatternBackground } from "@/components/ui/pattern-background";
import type { Guild } from "@/types";

export default function GlobalGuildsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data: guilds, isLoading, error } = useFetch<Guild[]>(
    () => guildsApi.getAll(),
  );

  const filteredGuilds = useMemo(() => {
    if (!search.trim()) return guilds ?? [];
    const q = search.toLowerCase();
    return (guilds ?? []).filter(guild =>
      guild.name?.toLowerCase().includes(q) ||
      guild.description?.toLowerCase().includes(q)
    );
  }, [guilds, search]);

  const {
    paginatedItems: currentGuilds,
    currentPage,
    totalPages,
    setCurrentPage,
  } = useClientPagination(filteredGuilds, 12);

  useMountEffect(() => {
    const saved = sessionStorage.getItem("guildsScrollPosition");
    if (saved) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(saved));
        sessionStorage.removeItem("guildsScrollPosition");
      }, 100);
    }
  });

  const navigateToGuild = (guildId: string) => {
    sessionStorage.setItem("guildsScrollPosition", window.scrollY.toString());
    router.push(`/guilds/${guildId}`);
  };

  const allGuilds = guilds ?? [];
  const totalExperts = allGuilds.reduce(
    (s, g) => s + (g.expertCount || 0),
    0,
  );
  const totalOpenJobs = allGuilds.reduce(
    (s, g) => s + (g.openPositions || 0),
    0,
  );

  if (isLoading) return null;

  return (
    <div className="relative min-h-screen bg-background text-foreground animate-page-enter">
      {/* ── Brand pattern + ambient glow ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <PatternBackground mask="radial-top" intensity="strong" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-primary/[0.04] dark:bg-primary/[0.07] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Hero ── */}
        <header className="pt-16 pb-14 md:pt-20 md:pb-16">
          {/* Overline */}
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">
            <Sparkles className="inline w-3 h-3 -mt-0.5 mr-1 opacity-70" />
            Noble Protocol Guilds
          </p>

          <h1 className="font-display font-bold text-[clamp(2.5rem,6vw,4rem)] leading-[1.05] tracking-tight text-foreground mb-4">
            Where Experts
            <br />
            Shape Hiring
          </h1>

          <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-8">
            Verified communities stake reputation to vet talent.
            Join the guild that matches your craft.
          </p>

          {/* Stats — understated, horizontal */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="tabular-nums">
              <span className="font-medium text-foreground">
                {allGuilds.length}
              </span>{" "}
              guilds
            </span>
            <span className="tabular-nums">
              <span className="font-medium text-foreground">
                {totalExperts.toLocaleString()}
              </span>{" "}
              experts
            </span>
            <span className="tabular-nums">
              <span className="font-medium text-foreground">
                {totalOpenJobs.toLocaleString()}
              </span>{" "}
              open roles
            </span>
          </div>
        </header>

        {/* ── Divider ── */}
        <Divider className="mb-10" />

        {/* ── Guild cards ── */}
        <section className="pb-16">
          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <div className="mb-6">
            <Input
              placeholder="Search guilds..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {allGuilds.length > 0 ? (
            <>
              {filteredGuilds.length === 0 ? (
                <EmptyState
                  icon={Shield}
                  title="No guilds match your search"
                  description="Try a different keyword"
                  className="py-16 rounded-xl border border-border bg-card"
                />
              ) : (
                <div className="grid gap-4">
                {currentGuilds.map((guild) => {
                  const GuildIcon = getGuildIcon(guild.name);
                  const description =
                    guild.description || getGuildPreviewDescription(guild.name);
                  const members =
                    guild.totalMembers || guild.candidateCount || 0;
                  const reviews = guild.totalProposalsReviewed || 0;
                  const jobs = guild.openPositions || 0;

                  return (
                    <article
                      key={guild.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigateToGuild(guild.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigateToGuild(guild.id);
                        }
                      }}
                      className="guild-card group relative grid grid-cols-[auto_1fr_auto] items-center gap-6 md:gap-8 rounded-xl border border-border bg-card px-7 py-6 md:px-9 md:py-7 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {/* Left: Icon with subtle container */}
                      <div className="relative flex items-center justify-center w-[52px] h-[52px] md:w-[60px] md:h-[60px] rounded-xl bg-muted/40 dark:bg-muted/30 border border-border">
                        <GuildIcon
                          className="w-[22px] h-[22px] md:w-6 md:h-6 text-foreground/70"
                          strokeWidth={1.8}
                        />
                        {/* Hover glow — single orange, not per-guild */}
                        <div className="absolute inset-0 rounded-xl bg-primary/0 transition-colors duration-300 group-hover:bg-primary/[0.06]" />
                      </div>

                      {/* Center: Text content */}
                      <div className="min-w-0 py-0.5">
                        <div className="flex items-baseline gap-3 mb-1">
                          <h2 className="font-display font-bold text-xl md:text-xl tracking-tight text-foreground truncate">
                            {guild.name}
                          </h2>
                          {jobs > 0 && (
                            <span className="hidden sm:inline-flex shrink-0 text-xs font-semibold text-primary/80 bg-primary/[0.07] px-2 py-0.5 rounded-md">
                              {jobs} {jobs === 1 ? "role" : "roles"} open
                            </span>
                          )}
                        </div>

                        <p className="text-sm md:text-sm text-muted-foreground leading-relaxed line-clamp-1 mb-2">
                          {description}
                        </p>

                        {/* Metrics — compact, icon-led */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground/80">
                          <span className="inline-flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            <span className="font-medium tabular-nums text-foreground/70">
                              {members}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <FileCheck className="w-3 h-3" />
                            <span className="font-medium tabular-nums text-foreground/70">
                              {reviews}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Briefcase className="w-3 h-3" />
                            <span className="font-medium tabular-nums text-foreground/70">
                              {jobs}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Right: Arrow */}
                      <div className="shrink-0 hidden sm:flex items-center justify-center w-9 h-9 rounded-full border border-border bg-transparent transition-all duration-300 group-hover:border-primary/30 group-hover:bg-primary/[0.06]">
                        <ArrowUpRight className="w-[14px] h-[14px] text-muted-foreground/50 transition-all duration-300 group-hover:text-primary group-hover:translate-x-[1px] group-hover:-translate-y-[1px]" />
                      </div>

                      {/* Hover overlay — very subtle border brightening + lift */}
                      <div className="absolute inset-0 rounded-xl border border-transparent transition-all duration-300 pointer-events-none group-hover:border-primary/[0.12] group-hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:group-hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)]" />
                    </article>
                  );
                })}
                </div>
              )}

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
              className="py-16 rounded-xl border border-border bg-card"
            />
          )}
        </section>

        {/* ── CTA ── */}
        <section className="pb-24">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-border bg-card px-8 py-7">
            <div>
              <p className="font-display font-bold text-xl text-foreground tracking-tight">
                Ready to join a guild?
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Apply as an expert and start earning from reviews.
              </p>
            </div>
            <button
              onClick={() => router.push("/expert/apply")}
              className="shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium transition-all duration-200 hover:bg-primary/90 hover:shadow-lg"
            >
              Apply as Expert
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
