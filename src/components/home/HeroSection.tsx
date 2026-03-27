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

const cards = [
  {
    key: "candidate",
    icon: Users,
    title: "Find Work",
    desc: "Get vetted by experts. Stand out to employers.",
  },
  {
    key: "expert",
    icon: Star,
    title: "Become an Expert",
    desc: "Stake your reputation. Earn by reviewing talent.",
    featured: true,
  },
  {
    key: "company",
    icon: Briefcase,
    title: "Post a Job",
    desc: "Hire from a pool pre-vetted by domain experts.",
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
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-10">
      {/* Badge */}
      <div className="mb-7">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/[0.08] border border-primary/15 rounded-full text-xs font-semibold text-primary tracking-wide">
          <span className="w-[7px] h-[7px] bg-primary rounded-full flex-shrink-0" />
          Private Beta Live
        </div>
      </div>

      {/* Headline */}
      <h1 className="font-display font-bold text-3xl sm:text-5xl leading-[1.1] tracking-tight text-foreground mb-4">
        The Credibility Layer<br />for Hiring
      </h1>
      <p className="text-sm text-muted-foreground font-normal leading-relaxed max-w-xl mb-12">
        Expert signals that separate real talent from noise.
      </p>

      {/* Value Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-9">
        {cards.map((card) => {
          const Icon = card.icon;
          const featured = "featured" in card && card.featured;
          return (
            <button
              key={card.key}
              onClick={handlers[card.key]}
              className={`relative text-left rounded-xl p-7 pb-6 border transition-colors cursor-pointer group ${
                featured
                  ? "border-primary/15 bg-primary/[0.04] hover:border-primary/25"
                  : "bg-card border-border hover:border-border"
              }`}
            >
              {/* Arrow on hover */}
              <span className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/30">
                <ArrowRight className="w-4 h-4" />
              </span>

              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-primary/10 border border-primary/15">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-bold text-xl tracking-tight text-foreground mb-1.5">
                {card.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {card.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Guild Pills */}
      {!isLoadingGuilds && guilds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5">
          {guilds.slice(0, 6).map((g) => {
            const name = g.name.replace(/ Guild$/i, "");
            return (
              <div
                key={g.id}
                className="inline-flex items-center gap-[7px] px-3.5 py-1.5 bg-card border border-border/30 rounded-full text-xs font-medium text-muted-foreground hover:border-border hover:text-foreground transition-colors cursor-default"
              >
                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0 bg-primary" />
                {name}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
