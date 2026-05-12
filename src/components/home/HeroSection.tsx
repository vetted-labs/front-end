"use client";

import { ArrowRight } from "lucide-react";
import { VettedIcon, type VettedIconName } from "@/components/ui/vetted-icon";
import { PatternBackground } from "@/components/ui/pattern-background";

interface HeroSectionProps {
  onJoinAsCandidate: () => void;
  onJoinAsExpert: () => void;
  onPostJob: () => void;
}

interface RoleCard {
  key: string;
  icon: VettedIconName;
  tag: string;
  title: string;
  desc: string;
  cta: string;
  featured?: boolean;
}

const cards: RoleCard[] = [
  {
    key: "candidate",
    icon: "vet-talent",
    tag: "Candidate",
    title: "Get Vetted",
    desc: "Prove your skills once. Let domain experts make you visible to the right opportunities.",
    cta: "Get vetted",
  },
  {
    key: "expert",
    icon: "vetting",
    tag: "Expert",
    title: "Monetize Your Judgment",
    desc: "Define standards. Vet candidates. Build on-chain authority — and earn for accuracy.",
    cta: "Stake your judgment",
    featured: true,
  },
  {
    key: "company",
    icon: "job",
    tag: "Company",
    title: "Start Hiring",
    desc: "Hire with conviction. Get a shortlist of pre-vetted candidates that experts bet on.",
    cta: "Post a role",
  },
];

export function HeroSection({
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
      {/* Brand pattern */}
      <PatternBackground mask="fade-bottom" intensity="medium" />
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/[0.04] blur-[100px]" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-10">
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
          The first hiring signal built on expert judgment with real skin in the game.
        </p>

        {/* Value Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-9">
          {cards.map((card, idx) => {
            return (
              <button
                key={card.key}
                onClick={handlers[card.key]}
                className="relative text-left rounded-2xl border transition-colors cursor-pointer group overflow-hidden flex flex-col bg-card border-border hover:border-primary/20"
              >
                {/* Top accent strip */}
                <span
                  aria-hidden
                  className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-primary/30 via-primary/10 to-transparent"
                />

                {/* Header strip — mirrors StatsBar: mono label left, status right */}
                <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-border/40">
                  <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/70 uppercase">
                    {card.tag}
                  </span>
                  {card.featured ? (
                    <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-primary uppercase inline-flex items-center gap-1.5">
                      <span className="relative flex w-1.5 h-1.5">
                        <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
                        <span className="relative rounded-full w-1.5 h-1.5 bg-primary" />
                      </span>
                      Featured
                    </span>
                  ) : (
                    <span aria-hidden className="font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/40 uppercase tabular-nums">
                      0{idx + 1} / 03
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="px-5 sm:px-6 pt-6 pb-5 flex flex-col flex-1">
                  {/* Icon + title composition — icon-left anchor */}
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      aria-hidden
                      className="shrink-0 w-[60px] h-[60px] rounded-xl flex items-center justify-center transition-transform group-hover:scale-[1.04] bg-primary/[0.09] border border-primary/20 shadow-[0_0_28px_-10px_hsl(var(--primary)/0.4)] group-hover:bg-primary/[0.14] group-hover:border-primary/30"
                    >
                      <VettedIcon name={card.icon} className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-display font-bold text-[22px] leading-[1.1] tracking-tight text-foreground">
                      {card.title}
                    </h3>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
                    {card.desc}
                  </p>

                  {/* CTA */}
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:gap-2.5 transition-all">
                    {card.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
