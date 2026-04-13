"use client";

import { useState } from "react";
import { Lock, Unlock, Eye, EyeOff, RotateCcw, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "score" | "committed" | "revealed";

interface MockExpert {
  name: string;
  score: number;
  nonce: string;
  hash: string;
  comment: string;
}

// Pre-seeded scores for 4 other experts — tuned so the user's vote around 75-85
// produces an "aligned" result and outliers produce "deviated".
const MOCK_EXPERTS: MockExpert[] = [
  {
    name: "expert_0x3f...2a",
    score: 76,
    nonce: "n3f2a",
    hash: "0x4c8b…a912",
    comment: "Strong systems thinking. Shaky on the DB question.",
  },
  {
    name: "expert_0xb1...8e",
    score: 82,
    nonce: "nb18e",
    hash: "0x7d1c…e4b0",
    comment: "Good communicator, clean code samples.",
  },
  {
    name: "expert_0x9a...c4",
    score: 79,
    nonce: "n9ac4",
    hash: "0x2f4a…b8d3",
    comment: "Solid mid-level signals.",
  },
  {
    name: "expert_0x05...71",
    score: 84,
    nonce: "n0571",
    hash: "0x9e3f…7c21",
    comment: "Impressive portfolio work.",
  },
];

const MEDIAN_OF_OTHERS = 80.5;

export function CommitRevealDemo() {
  const [phase, setPhase] = useState<Phase>("score");
  const [score, setScore] = useState(78);
  const [showOthers, setShowOthers] = useState(false);

  const reset = () => {
    setPhase("score");
    setScore(78);
    setShowOthers(false);
  };

  // Tiny deterministic "hash" preview for the demo — not a real hash.
  const fakeHash = `0x${Math.abs(score * 8192 + 0xa91).toString(16).padStart(4, "0")}…${Math.abs((score * 17) ^ 0x42).toString(16).padStart(4, "0")}`;

  // Alignment classification against mock median — binary: aligned or misaligned
  // Mirrors backend voting-consensus.service.ts getSlashingTier(): iqrMultiple <= 1 = aligned, else misaligned
  const distance = Math.abs(score - MEDIAN_OF_OTHERS);
  const mockIqr = 8; // representative IQR for the demo panel
  const iqrMultiple = mockIqr > 0 ? distance / mockIqr : 0;
  const tier =
    iqrMultiple <= 1
      ? { label: "Aligned", color: "text-positive", bg: "bg-positive/10", border: "border-positive/40", rep: "+10", slash: "0%" }
      : { label: "Misaligned", color: "text-negative", bg: "bg-negative/10", border: "border-negative/40", rep: "−20", slash: "25%" };

  return (
    <div className="my-8 overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Interactive demo — commit-reveal voting
          </span>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {/* Phase indicator */}
      <div className="flex border-b border-border">
        <PhaseTab label="1. Score" active={phase === "score"} done={phase !== "score"} />
        <PhaseTab label="2. Commit (blind)" active={phase === "committed"} done={phase === "revealed"} />
        <PhaseTab label="3. Reveal" active={phase === "revealed"} done={false} />
      </div>

      <div className="p-5 md:p-6">
        {phase === "score" && (
          <div>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              You're reviewing a mock candidate. Score them on a 0–100 scale — anywhere
              between 75 and 85 will land near the consensus the other four experts
              produced. Try setting a wild value to see the slashing penalty.
            </p>
            <div className="mt-6 rounded-lg border border-border bg-muted/30 p-5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="demo-score"
                  className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Your score
                </label>
                <span className="font-mono text-2xl font-bold text-primary tabular-nums">
                  {score}
                </span>
              </div>
              <input
                id="demo-score"
                type="range"
                min={0}
                max={100}
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="mt-3 w-full accent-[hsl(var(--primary))]"
              />
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPhase("committed")}
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
            >
              <Lock className="h-4 w-4" />
              Commit vote
            </button>
          </div>
        )}

        {phase === "committed" && (
          <div>
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-positive/40 bg-positive/5 p-4">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-positive" />
              <div>
                <p className="text-[14.5px] font-semibold text-foreground">
                  Vote committed
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
                  The hash of your score has been written to the chain. Other experts
                  can see that you voted, but not what you voted.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                What other experts see
              </p>
              <div className="mt-3 space-y-2">
                <VoteRow
                  name="You"
                  hash={fakeHash}
                  score={null}
                  highlight
                />
                {MOCK_EXPERTS.map((e) => (
                  <VoteRow key={e.name} name={e.name} hash={e.hash} score={null} />
                ))}
              </div>
              <p className="mt-4 text-[12.5px] text-muted-foreground">
                Every cell shows only a hash. Nothing about the underlying score leaks
                until reveal phase.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPhase("revealed")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
              >
                <Unlock className="h-4 w-4" />
                Reveal phase
              </button>
              <button
                type="button"
                onClick={() => setShowOthers((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {showOthers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showOthers ? "Hide" : "Peek at"} true scores
              </button>
            </div>
            {showOthers && (
              <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-[13px] text-muted-foreground">
                <p className="mb-2 font-semibold text-foreground">
                  Peeking (demo-only — in the real app nobody sees this)
                </p>
                <ul className="space-y-1 font-mono">
                  {MOCK_EXPERTS.map((e) => (
                    <li key={e.name}>
                      {e.name}: {e.score}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-sans">
                  Median: <strong>{MEDIAN_OF_OTHERS.toFixed(1)}</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {phase === "revealed" && (
          <div>
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-info-blue/40 bg-info-blue/5 p-4">
              <Eye className="mt-0.5 h-5 w-5 shrink-0 text-info-blue" />
              <div>
                <p className="text-[14.5px] font-semibold text-foreground">
                  Reveal phase complete
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
                  All scores are now visible. The backend verified your reveal
                  matches the hash you committed earlier.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Revealed votes
              </p>
              <div className="mt-3 space-y-2">
                <VoteRow name="You" hash={fakeHash} score={score} highlight />
                {MOCK_EXPERTS.map((e) => (
                  <VoteRow key={e.name} name={e.name} hash={e.hash} score={e.score} />
                ))}
              </div>
            </div>

            <div
              className={cn(
                "mt-6 rounded-lg border p-5",
                tier.border,
                tier.bg
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Your result
              </p>
              <p className={cn("mt-2 text-xl font-bold", tier.color)}>{tier.label}</p>
              <dl className="mt-3 grid grid-cols-3 gap-4 text-[13px]">
                <div>
                  <dt className="text-muted-foreground">Distance from median</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-foreground">
                    {distance.toFixed(1)} pts
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Reputation</dt>
                  <dd className={cn("mt-0.5 font-mono font-semibold", tier.color)}>
                    {tier.rep}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Stake slashed</dt>
                  <dd className={cn("mt-0.5 font-mono font-semibold", tier.color)}>
                    {tier.slash}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseTab({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div
      className={cn(
        "flex-1 border-b-2 px-4 py-3 text-center text-[12.5px] font-semibold uppercase tracking-wide transition-colors",
        active
          ? "border-primary text-primary"
          : done
          ? "border-transparent text-foreground"
          : "border-transparent text-muted-foreground"
      )}
    >
      {label}
    </div>
  );
}

function VoteRow({
  name,
  hash,
  score,
  highlight,
}: {
  name: string;
  hash: string;
  score: number | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border px-3 py-2 font-mono text-[12.5px]",
        highlight
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-background"
      )}
    >
      <span className={cn(highlight && "font-semibold text-primary")}>{name}</span>
      <span className="flex items-center gap-3 text-muted-foreground">
        <span>{hash}</span>
        {score !== null ? (
          <span className="font-bold text-foreground">{score}</span>
        ) : (
          <Lock className="h-3 w-3" />
        )}
      </span>
    </div>
  );
}
