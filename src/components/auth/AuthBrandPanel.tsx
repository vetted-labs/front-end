"use client";

import Link from "next/link";
import { ShieldCheck, Layers, Coins } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PatternBackground } from "@/components/ui/pattern-background";

interface FeatureRow {
  icon: typeof ShieldCheck;
  title: string;
  blurb: string;
}

const FEATURES: FeatureRow[] = [
  {
    icon: ShieldCheck,
    title: "Vetted by guild experts",
    blurb: "Every candidate is reviewed by a curated guild of senior practitioners.",
  },
  {
    icon: Coins,
    title: "Reputation, on-chain",
    blurb: "Experts stake VETD on their endorsements — incentives are skin in the game.",
  },
  {
    icon: Layers,
    title: "Built for hiring outcomes",
    blurb: "Match scores, expert reports, and signal — not yet another applicant tracking system.",
  },
];

interface AuthBrandPanelProps {
  /** Eyebrow line above the headline. e.g. "JOB SEEKER · SIGN IN" */
  eyebrow?: string;
  headline?: React.ReactNode;
  subhead?: string;
}

export function AuthBrandPanel({
  eyebrow = "VETTED · WEB3 HIRING",
  headline,
  subhead = "The talent network where reputation is staked, expertise is verified, and hiring decisions are backed by people who actually do the work.",
}: AuthBrandPanelProps) {
  return (
    <div className="hidden lg:flex relative flex-col justify-between lg:flex-1 lg:order-1 overflow-hidden border-r border-border/40 bg-card">
      {/* Brand pattern background */}
      <PatternBackground
        mask="fade-diagonal"
        intensity="medium"
        className="!opacity-[0.55] dark:!opacity-[0.18]"
      />
      {/* Soft primary glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-primary/[0.06] blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full bg-primary/[0.04] blur-[100px]"
      />

      {/* Top — logo */}
      <div className="relative z-10 px-12 pt-10">
        <Link href="/" className="inline-flex">
          <Logo />
        </Link>
      </div>

      {/* Middle — headline + features */}
      <div className="relative z-10 px-12 max-w-[560px]">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary/80 mb-4">
          {eyebrow}
        </p>
        <h2 className="font-display text-4xl xl:text-5xl font-bold text-foreground tracking-tight leading-[1.05]">
          {headline ?? (
            <>
              Hiring,
              <br />
              backed by <span className="text-primary">proof</span>.
            </>
          )}
        </h2>
        <p className="mt-5 text-sm text-muted-foreground leading-relaxed max-w-md">
          {subhead}
        </p>

        {/* Feature list */}
        <ul className="mt-10 space-y-5">
          {FEATURES.map(({ icon: Icon, title, blurb }) => (
            <li key={title} className="flex items-start gap-4">
              <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 grid place-items-center">
                <Icon className="w-4 h-4 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {title}
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed">
                  {blurb}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom — small links */}
      <div className="relative z-10 px-12 pb-8 flex items-center gap-5 text-[11px] text-muted-foreground/70">
        <Link href="/privacy" className="hover:text-foreground transition-colors">
          Privacy
        </Link>
        <span aria-hidden className="opacity-40">·</span>
        <Link href="/terms" className="hover:text-foreground transition-colors">
          Terms
        </Link>
        <span aria-hidden className="opacity-40">·</span>
        <Link href="/about" className="hover:text-foreground transition-colors">
          About
        </Link>
        <span className="ml-auto tabular-nums opacity-50">© Vetted Labs</span>
      </div>
    </div>
  );
}
