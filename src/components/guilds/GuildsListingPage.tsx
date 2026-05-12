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
  Search,
} from "lucide-react";

import { GuildCard } from "@/components/guild/card";

import { Alert } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { PatternBackground } from "@/components/ui/pattern-background";

import { guildsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { useMountEffect } from "@/lib/hooks/useMountEffect";
import { useClientPagination } from "@/lib/hooks/useClientPagination";

import type { Guild } from "@/types";

const PER_PAGE = 12;

export default function GuildsListingPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data: guilds, isLoading, error } = useFetch<Guild[]>(() =>
    guildsApi.getAll(),
  );

  const filteredGuilds = useMemo(() => {
    const list = guilds ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (g) =>
        g.name?.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q),
    );
  }, [guilds, search]);

  const {
    paginatedItems: pageGuilds,
    currentPage,
    totalPages,
    setCurrentPage,
  } = useClientPagination(filteredGuilds, PER_PAGE);

  useMountEffect(() => {
    const saved = sessionStorage.getItem("guildsScrollPosition");
    if (saved) {
      window.requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(saved, 10));
        sessionStorage.removeItem("guildsScrollPosition");
      });
    }
  });

  const navigateToGuild = (guildId: string) => {
    sessionStorage.setItem("guildsScrollPosition", window.scrollY.toString());
    router.push(`/guilds/${guildId}`);
  };

  const allGuilds = guilds ?? [];
  const totalGuilds = allGuilds.length;
  const totalExperts = allGuilds.reduce(
    (s, g) => s + (g.expertCount ?? g.totalMembers ?? 0),
    0,
  );
  const totalOpenJobs = allGuilds.reduce((s, g) => s + (g.openPositions ?? 0), 0);
  const totalReviews = allGuilds.reduce(
    (s, g) => s + (g.totalProposalsReviewed ?? 0),
    0,
  );

  return (
    <div className="relative min-h-screen bg-background text-foreground animate-page-enter">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <PatternBackground mask="radial-top" intensity="strong" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-primary/[0.04] dark:bg-primary/[0.07] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Hero ── */}
        <header className="pt-16 pb-10 md:pt-20 md:pb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">
            <Sparkles className="inline w-3 h-3 -mt-0.5 mr-1 opacity-70" />
            Explore
          </p>

          <h1 className="font-display font-bold text-[clamp(2.25rem,5.5vw,3.75rem)] leading-[1.05] tracking-tight text-foreground mb-4">
            Guilds.
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
            Curated communities of peer-reviewed domain experts who define what{" "}
            <span className="text-foreground/80">qualified</span> means, vet
            with skin in the game, and earn from being right.
          </p>
        </header>

        {/* ── KPI strip ── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <KpiTile
            label="Guilds"
            value={isLoading ? null : totalGuilds.toLocaleString()}
            icon={Shield}
          />
          <KpiTile
            label="Experts"
            value={isLoading ? null : totalExperts.toLocaleString()}
            icon={Users}
          />
          <KpiTile
            label="Open roles"
            value={isLoading ? null : totalOpenJobs.toLocaleString()}
            icon={Briefcase}
          />
          <KpiTile
            label="Reviews completed"
            value={isLoading ? null : totalReviews.toLocaleString()}
            icon={FileCheck}
          />
        </section>

        {/* ── Search ── */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
            <Input
              placeholder="Search guilds..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {!isLoading && filteredGuilds.length !== totalGuilds && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {filteredGuilds.length} of {totalGuilds}
            </span>
          )}
        </div>

        {/* ── Guild cards ── */}
        <section className="pb-16">
          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-6 space-y-4"
                >
                  <Skeleton className="w-14 h-14 rounded-2xl" />
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : totalGuilds === 0 ? (
            <EmptyState
              icon={Shield}
              title="No guilds available yet"
              description="Check back soon for new professional communities."
              className="py-16 rounded-2xl border border-border bg-card"
            />
          ) : filteredGuilds.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No guilds match your search"
              description="Try a different keyword."
              className="py-16 rounded-2xl border border-border bg-card"
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pageGuilds.map((guild, i) => (
                  <GuildCard
                    key={guild.id}
                    variant="marketplace"
                    guild={guild}
                    catalogueIndex={(currentPage - 1) * PER_PAGE + i + 1}
                    onClick={() => navigateToGuild(guild.id)}
                  />
                ))}
              </div>
              <PaginationNav
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                className="mt-8"
              />
            </>
          )}
        </section>

        {/* ── CTA strip ── */}
        <section className="pb-24">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-border bg-card px-8 py-7">
            <div>
              <p className="font-display font-bold text-xl text-foreground tracking-tight">
                Ready to join a guild?
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Apply as an expert and start earning from reviews.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/expert/apply")}
              className="shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-all duration-200 hover:bg-primary/90 hover:shadow-lg"
            >
              Apply as expert
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

interface KpiTileProps {
  label: string;
  value: string | null;
  icon: typeof Shield;
}

function KpiTile({ label, value, icon: Icon }: KpiTileProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
          {label}
        </p>
        {value === null ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <p className="font-display text-2xl sm:text-[26px] font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        )}
      </div>
      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary grid place-items-center flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
}

