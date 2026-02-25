"use client";

import { Users, Shield, Briefcase, Star, ArrowRight, Sparkles } from "lucide-react";
import type { Guild } from "@/types";

interface HeroSectionProps {
  guilds: Guild[];
  isLoadingGuilds: boolean;
  onJoinAsCandidate: () => void;
  onJoinAsExpert: () => void;
  onPostJob: () => void;
}

const cards = [
  {
    key: "candidate",
    icon: Users,
    title: "Find Work",
    description: "Get vetted by guild experts and land roles at top companies.",
    cta: "Get started",
    featured: false,
  },
  {
    key: "expert",
    icon: Shield,
    title: "Become an Expert",
    description: "Stake reputation, review candidates, and earn rewards in your guild.",
    cta: "Get started",
    featured: true,
  },
  {
    key: "company",
    icon: Briefcase,
    title: "Post a Job",
    description: "Receive expert-reviewed shortlists. Hire confidently, every time.",
    cta: "Get started",
    featured: false,
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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-10">
        {/* Badge */}
        <div className="flex justify-center mb-8 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 glass-card rounded-full border border-border/60 animate-float">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-semibold text-primary">
              Private Beta Live
            </span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-center text-5xl sm:text-6xl md:text-7xl font-display font-bold leading-[1.08] mb-6 animate-fade-up animate-delay-100">
          <span className="text-foreground">Hiring Finally </span>
          <span className="bg-gradient-to-r from-primary via-accent to-orange-light bg-clip-text text-transparent">
            Built on Trust
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-center text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-up animate-delay-200 leading-relaxed">
          Vetted connects companies with expert-reviewed talent through
          reputation-staked guilds. Transparent, accountable, and fully on-chain.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8 animate-fade-up animate-delay-300">
          <button
            onClick={onJoinAsExpert}
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 transition-all"
          >
            Start Vetting
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onJoinAsCandidate}
            className="inline-flex items-center gap-2 px-7 py-3.5 glass-card rounded-xl border border-border/60 font-semibold text-foreground hover:border-primary/40 transition-all"
          >
            Find Work
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Active guild pills */}
        {!isLoadingGuilds && guilds.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12 animate-fade-up animate-delay-300">
            <span className="text-sm text-muted-foreground mr-1">Active Guilds:</span>
            {guilds.slice(0, 4).map((g) => (
              <span
                key={g.id}
                className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
              >
                {g.name.replace(/ Guild$/i, "")}
              </span>
            ))}
          </div>
        )}

        {/* Value Cards */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5 animate-fade-up animate-delay-400">
          {cards.map((card) => (
            <button
              key={card.key}
              onClick={handlers[card.key]}
              className={`relative text-left rounded-2xl p-6 border transition-all group ${
                card.featured
                  ? "glass-card-glow border-2 border-primary/20 hover:border-primary/40"
                  : "glass-card glass-border-shimmer border-border/60 hover:border-primary/30"
              }`}
            >
              {card.featured && (
                <div className="absolute top-3 right-3">
                  <Star className="w-4 h-4 text-primary fill-primary" />
                </div>
              )}

              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <card.icon className="w-6 h-6 text-primary" />
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {card.title}
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {card.description}
              </p>

              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                {card.cta}
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
