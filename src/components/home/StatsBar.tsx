"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Guild, Job } from "@/types";

interface StatsBarProps {
  guilds: Guild[];
  jobs: Job[];
}

function useCountUp(target: number, duration = 1800) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  const animate = useCallback(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  // eslint-disable-next-line no-restricted-syntax -- IntersectionObserver subscription with changing animate callback
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animate]);

  return { value, ref };
}

interface StatItemProps {
  label: string;
  target: number;
  suffix?: string;
  last?: boolean;
}

function StatItem({ label, target, suffix = "", last = false }: StatItemProps) {
  const { value, ref } = useCountUp(target);

  return (
    <div
      ref={ref}
      className={`px-5 sm:px-6 py-5 flex flex-col gap-1.5 ${
        last ? "" : "sm:border-r border-border/40"
      }`}
    >
      <span className="font-mono text-[9.5px] font-semibold tracking-[0.18em] text-muted-foreground/60 uppercase">
        {label}
      </span>
      <span className="font-display font-bold text-[28px] sm:text-[32px] leading-none tracking-tight text-foreground tabular-nums">
        {value.toLocaleString()}
        {suffix}
      </span>
    </div>
  );
}

export function StatsBar({ guilds, jobs }: StatsBarProps) {
  const activeGuilds = guilds.length;
  const openPositions = jobs.length;
  const expertReviewers = guilds.reduce((sum, g) => sum + (g.expertCount ?? 0), 0);
  const candidatesVetted = guilds.reduce((sum, g) => sum + (g.candidateCount ?? 0), 0);

  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 animate-fade-up"
      style={{ animationDelay: "300ms" }}
    >
      <div className="relative rounded-2xl border border-border bg-card overflow-hidden">
        {/* Top accent strip — matches hero cards */}
        <span
          aria-hidden
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-primary/40 via-primary/15 to-transparent"
        />

        {/* Header row */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-border/40">
          <span className="font-mono text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/70 uppercase">
            Network Activity
          </span>
          <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-positive uppercase inline-flex items-center gap-1.5">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-positive animate-ping opacity-60" />
              <span className="relative rounded-full w-1.5 h-1.5 bg-positive" />
            </span>
            Live
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4">
          <StatItem label="Expert Reviewers" target={expertReviewers} />
          <StatItem label="Candidates Vetted" target={candidatesVetted} suffix="+" />
          <StatItem label="Open Positions" target={openPositions} />
          <StatItem label="Active Guilds" target={activeGuilds} last />
        </div>
      </div>
    </div>
  );
}
