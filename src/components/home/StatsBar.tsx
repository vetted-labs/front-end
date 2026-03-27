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

function StatItem({ label, target, suffix = "" }: { label: string; target: number; suffix?: string }) {
  const { value, ref } = useCountUp(target);

  return (
    <div ref={ref} className="flex items-center gap-2 px-6 sm:px-9 py-2 sm:py-0 border-r border-border/30 last:border-r-0">
      <span className="font-display font-bold text-xl sm:text-xl tracking-tight text-foreground whitespace-nowrap">
        {value.toLocaleString()}{suffix}
      </span>
      <span className="text-xs text-muted-foreground/60 font-medium whitespace-nowrap">
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-up" style={{ animationDelay: "300ms" }}>
      <div className="bg-card border border-border/30 rounded-xl py-5 flex items-center justify-center">
        <div className="flex items-center flex-wrap justify-center gap-y-2">
          <StatItem label="Expert Reviewers" target={expertReviewers || 120} />
          <StatItem label="Candidates Vetted" target={candidatesVetted || 350} suffix="+" />
          <StatItem label="Open Positions" target={openPositions || 24} />
          <StatItem label="Active Guilds" target={activeGuilds || 8} />
        </div>
      </div>
    </div>
  );
}
