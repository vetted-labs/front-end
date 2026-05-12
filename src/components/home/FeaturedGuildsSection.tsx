"use client";

import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { getGuildIconName } from "@/lib/guildHelpers";
import type { Guild } from "@/types";

interface FeaturedGuildsSectionProps {
  guilds: Guild[];
}

export function FeaturedGuildsSection({ guilds }: FeaturedGuildsSectionProps) {
  return (
    <section className="border-t border-border/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-end justify-between mb-10 gap-6 flex-wrap">
          <div className="max-w-xl">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-3">
              <Layers className="inline w-3 h-3 -mt-0.5 mr-1 opacity-70" />
              Active guilds
            </p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-foreground leading-[1.1]">
              Domains, with their own
              <br />
              standards.
            </h2>
          </div>
          <Link
            href="/guilds"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all"
          >
            Browse all guilds
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {guilds.map((g) => (
            <Link
              key={g.id}
              href={`/guilds/${g.id}`}
              className="group flex flex-col items-center gap-3 p-5 rounded-xl border border-border bg-card hover:border-border/60 transition-colors text-center"
            >
              <span
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/[0.08] border border-primary/20 text-primary transition-colors"
                aria-label={`${g.name} guild`}
              >
                <VettedIcon name={getGuildIconName(g.name)} className="w-7 h-7" />
              </span>
              <span className="font-display font-bold text-sm tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {g.name}
              </span>
              {typeof g.expertCount === "number" && (
                <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                  {g.expertCount} expert{g.expertCount === 1 ? "" : "s"}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
