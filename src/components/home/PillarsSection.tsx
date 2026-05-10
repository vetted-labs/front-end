"use client";

import { ArrowRight, Briefcase, Compass, ShieldCheck } from "lucide-react";

interface PillarsSectionProps {
  onJoinAsCandidate: () => void;
  onPostJob: () => void;
  onJoinAsExpert: () => void;
}

interface Pillar {
  key: "candidate" | "company" | "expert";
  eyebrow: string;
  title: string;
  blurb: string;
  cta: string;
  icon: typeof Briefcase;
  onClick: () => void;
}

export function PillarsSection({
  onJoinAsCandidate,
  onPostJob,
  onJoinAsExpert,
}: PillarsSectionProps) {
  const pillars: Pillar[] = [
    {
      key: "candidate",
      eyebrow: "For candidates",
      title: "Stand out, by being\nactually vetted",
      blurb:
        "Submit your profile once. Reviewed by real practitioners — not keyword scanners. Carry your reputation between roles.",
      cta: "Find roles",
      icon: Compass,
      onClick: onJoinAsCandidate,
    },
    {
      key: "company",
      eyebrow: "For companies",
      title: "Hire with conviction,\nnot lottery tickets",
      blurb:
        "Get a curated shortlist of pre-vetted candidates. Every approval is backed by an expert who staked reputation on the call.",
      cta: "Hire on Vetted",
      icon: Briefcase,
      onClick: onPostJob,
    },
    {
      key: "expert",
      eyebrow: "For experts",
      title: "Monetize your\njudgment",
      blurb:
        "Define standards in your field. Vote on candidates. Earn for accuracy and build authority that compounds on-chain.",
      cta: "Apply as expert",
      icon: ShieldCheck,
      onClick: onJoinAsExpert,
    },
  ];

  return (
    <section className="border-t border-border/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="mb-12 max-w-2xl">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-3">
            Three sides, one network
          </p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-foreground leading-[1.1]">
            Built for everyone who actually
            <br />
            cares about the call.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.key}
                onClick={p.onClick}
                className="group text-left rounded-xl border border-border bg-card p-7 transition-colors hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <span className="inline-grid place-items-center w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 mb-5">
                  <Icon className="w-5 h-5 text-primary" />
                </span>

                <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                  {p.eyebrow}
                </p>
                <h3 className="font-display font-bold text-xl tracking-tight text-foreground leading-snug mb-3 whitespace-pre-line">
                  {p.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {p.blurb}
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
                  {p.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
