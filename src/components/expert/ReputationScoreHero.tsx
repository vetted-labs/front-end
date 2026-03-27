"use client";

import { useRef, useCallback } from "react";
import { Star, TrendingUp, ChevronDown } from "lucide-react";
import { getRewardTierProgress } from "@/types";
import { REWARD_TIER_COLORS, STATUS_COLORS } from "@/config/colors";
import { useMountEffect } from "@/lib/hooks/useMountEffect";

interface ReputationScoreHeroProps {
  reputation: number;
  totalGains: number;
  alignedCount: number;
  deviationCount: number;
  reviewCount: number;
}

export function ReputationScoreHero({
  reputation,
  totalGains,
  alignedCount,
  deviationCount,
  reviewCount,
}: ReputationScoreHeroProps) {
  const scoreRef = useRef<HTMLSpanElement>(null);
  const { tier } = getRewardTierProgress(reputation);
  const tierColors = REWARD_TIER_COLORS[tier.name] ?? REWARD_TIER_COLORS.Foundation;

  // Animated counter on mount
  const animateScore = useCallback(() => {
    const el = scoreRef.current;
    if (!el || reputation === 0) return;

    const duration = 2200;
    const start = performance.now();
    const target = reputation;

    function easeOutExpo(t: number) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.round(easeOutExpo(progress) * target);
      if (el) el.textContent = String(current);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [reputation]);

  useMountEffect(animateScore);

  const alignmentRate =
    alignedCount + deviationCount > 0
      ? Math.round((alignedCount / (alignedCount + deviationCount)) * 100)
      : 100;

  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center overflow-hidden">
      {/* Radial burst background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] pointer-events-none animate-rep-burst-pulse rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.12)_0%,hsl(var(--primary)/0.04)_25%,transparent_70%)] dark:bg-[radial-gradient(circle,hsl(var(--primary)/0.12)_0%,hsl(var(--primary)/0.04)_25%,transparent_70%)]" />

      {/* Concentric rings SVG */}
      <svg
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[350px] h-[350px] sm:w-[600px] sm:h-[600px] pointer-events-none"
        viewBox="0 0 600 600"
      >
        <circle
          className="rep-ring fill-none stroke-[hsl(var(--primary)/0.08)] [stroke-width:1]"
          cx="300" cy="300" r="100"
          style={{ animation: "rep-ring-pulse-1 4s ease-in-out infinite" }}
        />
        <circle
          className="rep-ring fill-none stroke-[hsl(var(--primary)/0.06)] [stroke-width:0.8]"
          cx="300" cy="300" r="140"
          style={{ animation: "rep-ring-pulse-2 5s ease-in-out infinite" }}
        />
        <circle
          className="rep-ring fill-none stroke-[hsl(var(--primary)/0.04)] [stroke-width:0.6]"
          cx="300" cy="300" r="185"
          style={{ animation: "rep-ring-pulse-3 6s ease-in-out infinite" }}
        />
        <circle
          className="rep-ring fill-none stroke-[hsl(var(--primary)/0.03)] [stroke-width:0.5]"
          cx="300" cy="300" r="230"
          style={{ animation: "rep-ring-pulse-4 7s ease-in-out infinite" }}
        />
        <circle
          className="rep-ring fill-none stroke-[hsl(var(--positive)/0.025)] [stroke-width:0.4]"
          cx="300" cy="300" r="275"
          style={{ animation: "rep-ring-pulse-5 8s ease-in-out infinite" }}
        />

        {/* Tick marks on outer ring */}
        <g className="stroke-[hsl(var(--primary)/0.08)] [stroke-width:1]">
          <line x1="300" y1="18" x2="300" y2="28" />
          <line x1="300" y1="572" x2="300" y2="582" />
          <line x1="18" y1="300" x2="28" y2="300" />
          <line x1="572" y1="300" x2="582" y2="300" />
        </g>

        {/* Sweeping arc indicator */}
        <defs>
          <linearGradient id="repSweepGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0)" />
            <stop offset="50%" stopColor="hsl(var(--primary) / 0.4)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0)" />
          </linearGradient>
        </defs>
        <circle
          className="rep-ring-sweep"
          cx="300" cy="300" r="100"
          fill="none"
          stroke="url(#repSweepGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="180 450"
          style={{
            transformOrigin: "300px 300px",
            animation: "rep-ring-rotate 8s linear infinite",
          }}
        />
      </svg>

      {/* Score content */}
      <div className="relative z-10 text-center">
        <p className="text-sm font-medium tracking-[4px] uppercase text-muted-foreground mb-3">
          Reputation Score
        </p>

        <div className="animate-rep-score-glow">
          <span
            className="font-display text-[clamp(100px,15vw,160px)] font-bold leading-none bg-gradient-to-b from-foreground via-primary to-primary bg-clip-text text-transparent"
            ref={scoreRef}
          >
            {reputation}
          </span>
          <span className="text-[clamp(24px,4vw,36px)] font-normal bg-gradient-to-r from-muted-foreground to-muted-foreground/50 bg-clip-text text-transparent align-super ml-1">
            /1000
          </span>
        </div>

        {/* Tier badge with shimmer */}
        <div className={`inline-flex items-center gap-2 mt-7 px-7 py-2.5 rounded-full border relative overflow-hidden ${tierColors.bg} ${tierColors.border}`}>
          {/* Shimmer overlay */}
          <div className="absolute top-0 -left-full w-3/5 h-full bg-gradient-to-r from-transparent via-[hsl(var(--warning)/0.15)] to-transparent animate-rep-shimmer pointer-events-none" />
          <Star className={`w-5 h-5 ${tierColors.text}`} />
          <span className={`text-sm font-bold tracking-wider font-display ${tierColors.text}`}>
            {tier.name.toUpperCase()} TIER
          </span>
        </div>

        {/* Meta stats */}
        <div className="flex items-center justify-center gap-8 mt-6 flex-wrap">
          {totalGains > 0 && (
            <>
              <div className={`flex items-center gap-1.5 text-sm font-medium ${STATUS_COLORS.positive.text}`}>
                <TrendingUp className="w-3.5 h-3.5" />
                +{totalGains} pts earned
                <span className="inline-block animate-rep-sparkle-pulse text-xs">&#10024;</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-muted-foreground" />
            </>
          )}
          <div className="text-sm font-medium text-primary">
            {alignmentRate}% alignment
          </div>
          {reviewCount > 0 && (
            <>
              <div className="w-1 h-1 rounded-full bg-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                {reviewCount} reviews completed
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground animate-rep-scroll-bounce">
        <span className="text-xs font-medium tracking-[2px] uppercase">Explore</span>
        <ChevronDown className="w-5 h-5 opacity-40" />
      </div>
    </section>
  );
}
