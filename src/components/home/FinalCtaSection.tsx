"use client";

import { ArrowRight, Briefcase, Users } from "lucide-react";
import { PatternBackground } from "@/components/ui/pattern-background";

interface FinalCtaSectionProps {
  onPostJob: () => void;
  onJoinAsExpert: () => void;
}

export function FinalCtaSection({ onPostJob, onJoinAsExpert }: FinalCtaSectionProps) {
  return (
    <section className="border-t border-border/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
          <PatternBackground mask="fade-diagonal" intensity="medium" />
          <div className="pointer-events-none absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-primary/[0.06] blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-40 -right-40 w-[420px] h-[420px] rounded-full bg-primary/[0.04] blur-[100px]" />

          <div className="relative z-10 grid md:grid-cols-[1.4fr_1fr] gap-10 px-8 sm:px-12 py-14">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-3">
                Ready when you are
              </p>
              <h2 className="font-display font-bold text-3xl sm:text-4xl tracking-tight text-foreground leading-[1.05] mb-4">
                Ready to ship better
                <br />
                hiring?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                Post a role and have it reviewed by domain experts who actually do the work —
                or join a guild and get paid for the calls you already make every day.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:items-end md:justify-center">
              <button
                type="button"
                onClick={onPostJob}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:shadow-md hover:-translate-y-px transition-all w-full md:w-auto"
              >
                <Briefcase className="w-4 h-4" />
                Hire on Vetted
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onJoinAsExpert}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-card border border-border text-foreground text-sm font-semibold hover:border-primary/30 transition-colors w-full md:w-auto"
              >
                <Users className="w-4 h-4" />
                Apply as expert
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
