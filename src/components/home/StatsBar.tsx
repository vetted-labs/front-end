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
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [target, duration]);

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

function StatItem({ label, target, suffix = "" }: { label: string; target: number; suffix?: string }) {
  const { value, ref } = useCountUp(target);

  return (
    <div ref={ref} className="flex flex-col items-center gap-1 py-4 px-2">
      <span className="text-3xl sm:text-4xl font-display font-bold text-foreground">
        {value.toLocaleString()}{suffix}
      </span>
      <span className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
        {label}
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-up animate-delay-500">
      <div className="glass-card rounded-2xl border border-border/60 grid grid-cols-2 md:grid-cols-4 divide-x divide-border/40">
        <StatItem label="Active Guilds" target={activeGuilds || 8} />
        <StatItem label="Open Positions" target={openPositions || 24} />
        <StatItem label="Expert Reviewers" target={expertReviewers || 120} />
        <StatItem label="Candidates Vetted" target={candidatesVetted || 350} suffix="+" />
      </div>
    </div>
  );
}
