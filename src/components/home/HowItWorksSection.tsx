"use client";

import { ArrowRight, Briefcase, Coins, Sparkles, Vote } from "lucide-react";
import { PatternBackground } from "@/components/ui/pattern-background";

interface Step {
  eyebrow: string;
  title: string;
  blurb: string;
  icon: typeof Briefcase;
}

const STEPS: Step[] = [
  {
    eyebrow: "Step 01",
    title: "Companies post and assign a guild",
    blurb:
      "Roles are routed to the relevant guild — Engineering, Design, Product. Each guild has its own standards and review pool.",
    icon: Briefcase,
  },
  {
    eyebrow: "Step 02",
    title: "Experts review via commit-reveal",
    blurb:
      "Domain experts cast sealed votes on every applicant, then reveal together. No one sees the room before the call is locked.",
    icon: Vote,
  },
  {
    eyebrow: "Step 03",
    title: "Reputation is staked on-chain",
    blurb:
      "Experts who back accurate calls earn reputation and rewards. Those who don't, pay. Skin in the game, every decision.",
    icon: Coins,
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative border-t border-border/40 overflow-hidden">
      <PatternBackground mask="fade-bottom" intensity="strong" />
      <div className="pointer-events-none absolute -top-40 right-1/4 w-[480px] h-[300px] rounded-full bg-primary/[0.04] blur-[120px]" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="mb-12 max-w-2xl">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-3">
            <Sparkles className="inline w-3 h-3 -mt-0.5 mr-1 opacity-70" />
            How it works
          </p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-foreground leading-[1.1]">
            Hiring decisions, with
            <br />
            <span className="text-primary">proof attached</span>.
          </h2>
        </div>

        <ol className="grid md:grid-cols-3 gap-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === STEPS.length - 1;
            return (
              <li
                key={step.eyebrow}
                className="relative rounded-xl border border-border bg-card p-7 overflow-hidden"
              >
                <span className="absolute top-0 left-0 right-0 h-[2px] bg-primary/40" />
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                    {step.eyebrow}
                  </p>
                  <span className="inline-grid place-items-center w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 text-primary">
                    <Icon className="w-4 h-4" />
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg tracking-tight text-foreground leading-snug mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.blurb}
                </p>
                {!isLast && (
                  <span
                    aria-hidden
                    className="hidden md:grid absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-card border border-border place-items-center"
                  >
                    <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
