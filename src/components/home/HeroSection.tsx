"use client";

import { Users, Star, Briefcase, ArrowRight } from "lucide-react";
import type { Guild } from "@/types";

interface HeroSectionProps {
  guilds: Guild[];
  isLoadingGuilds: boolean;
  onJoinAsCandidate: () => void;
  onJoinAsExpert: () => void;
  onPostJob: () => void;
}

/** All guild dots use brand orange — no per-guild rainbow. */
const GUILD_DOT_STYLE = "bg-primary shadow-[0_0_6px_rgba(249,115,22,0.4)]";

function getGuildDotStyle(_guildName: string): string {
  return GUILD_DOT_STYLE;
}

const cards = [
  {
    key: "candidate",
    icon: Users,
    title: "Find Work",
    desc: "Get vetted by experts. Stand out to employers.",
    featured: false,
    iconBg: "bg-primary/10 border border-primary/15",
    iconStroke: undefined,
  },
  {
    key: "expert",
    icon: Star,
    title: "Become an Expert",
    desc: "Stake your reputation. Earn by reviewing talent.",
    featured: true,
    iconBg: "bg-primary/10 border border-primary/15",
    iconStroke: undefined, // uses text-primary
  },
  {
    key: "company",
    icon: Briefcase,
    title: "Post a Job",
    desc: "Hire from a pool pre-vetted by domain experts.",
    featured: false,
    iconBg: "bg-primary/10 border border-primary/15",
    iconStroke: undefined,
  },
] as const;

export function HeroSection({
  guilds,
  isLoadingGuilds,
  onJoinAsCandidate,
  onJoinAsExpert,
  onPostJob,
}: HeroSectionProps) {
  const handlers: Record<string, () => void> = {
    candidate: onJoinAsCandidate,
    expert: onJoinAsExpert,
    company: onPostJob,
  };

  return (
    <section className="relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="hero-glow-orb hero-glow-orb-primary animate-glow-pulse" />
      <div className="hero-glow-orb hero-glow-orb-accent animate-glow-pulse" style={{ animationDelay: "2s" }} />

      <div className="relative max-w-[1120px] mx-auto px-6 pt-36 pb-10 text-center">
        {/* Badge */}
        <div className="flex justify-center mb-7 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/[0.08] border border-primary/15 rounded-full text-xs font-semibold text-primary tracking-wide">
            <span className="w-[7px] h-[7px] bg-primary rounded-full animate-pulse flex-shrink-0" />
            Private Beta Live
          </div>
        </div>

        {/* Headline */}
        <h1 className="font-display font-bold text-3xl sm:text-5xl leading-[1.1] tracking-tight text-foreground mb-4">
          The Credibility Layer<br />for Hiring
        </h1>
        <p className="text-sm sm:text-sm text-muted-foreground font-normal mb-12">
          Expert signals that separate real talent from noise.
        </p>

        {/* Value Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-9 animate-fade-up" style={{ animationDelay: "100ms" }}>
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.key}
                onClick={handlers[card.key]}
                className={`relative text-left rounded-2xl p-7 pb-6 border transition-all duration-300 cursor-pointer group overflow-hidden ${
                  card.featured
                    ? "border-primary/15 bg-primary/[0.04] hover:border-primary/25 hover:bg-primary/[0.06] hover:shadow-[0_0_40px_rgba(249,115,22,0.08)]"
                    : "bg-card/30 border-border/40 hover:border-border/80 hover:bg-card/60"
                } hover:-translate-y-0.5`}
              >
                {/* Featured radial glow */}
                {card.featured && (
                  <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.06)_0%,transparent_70%)] pointer-events-none" />
                )}

                {/* Arrow on hover */}
                <span className={`absolute top-6 right-6 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ${card.featured ? "text-primary" : "text-muted-foreground/30"}`}>
                  <ArrowRight className="w-4 h-4" />
                </span>

                <div className="relative">
                  <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center mb-4 ${card.iconBg}`}>
                    <Icon
                      className={`w-5 h-5 ${card.iconStroke ? "" : "text-primary"}`}
                      style={card.iconStroke ? { color: card.iconStroke } : undefined}
                    />
                  </div>
                  <h3 className="font-display font-bold text-xl tracking-tight text-foreground mb-1.5">
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Guild Pills */}
        {!isLoadingGuilds && guilds.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 animate-fade-up" style={{ animationDelay: "200ms" }}>
            {guilds.slice(0, 6).map((g) => {
              const name = g.name.replace(/ Guild$/i, "");
              return (
                <div
                  key={g.id}
                  className="inline-flex items-center gap-[7px] px-3.5 py-1.5 bg-card/20 border border-border/30 rounded-full text-xs font-medium text-muted-foreground hover:bg-card/40 hover:border-border/50 hover:text-foreground transition-all cursor-default"
                >
                  <span className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${getGuildDotStyle(name)}`} />
                  {name}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
