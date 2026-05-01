"use client";

import type { CSSProperties } from "react";

import type { AnalyticsCriteriaAverage } from "@/types";
import { cssMotionStyle } from "@/lib/chartTokens";

interface RubricTraitBarsProps {
  criteria: AnalyticsCriteriaAverage[];
}

/**
 * VET-89: full-width horizontal bar chart of average score per rubric trait.
 *
 * Behaviors:
 *  - Sorts criteria by averageScore desc.
 *  - Each row: trait label · animated bar fill · "X.X / Y" score.
 *  - Bar fill animates from 0% to target with cubic-bezier(0.22, 1, 0.36, 1)
 *    over ~650ms, staggered per row via `cssMotionStyle` from chartTokens.
 *  - Top trait (rank 0) is emphasized with a slightly thicker bar plus an
 *    accent dot next to its label.
 *  - Footer shows the candidate count from the first criterion (the API
 *    guarantees these are equal across rubric traits for a given job).
 *
 * Animation strategy:
 *  We embed a scoped `@keyframes` block in the component itself so we don't
 *  need to touch `globals.css`. The keyframe name is unique and the bar's
 *  `--target-width` CSS variable carries the per-row endpoint, so the same
 *  animation reuses across every row. Re-mount via `key` on the list ensures
 *  the animation re-stages whenever the criteria array identity changes.
 *
 *  This avoids raw `useEffect` (uses pure CSS) and only references Vetted
 *  color tokens (`bg-primary`, `bg-muted`, `text-foreground`,
 *  `text-muted-foreground`).
 */
export function RubricTraitBars({ criteria }: RubricTraitBarsProps) {
  if (criteria.length === 0) {
    return null;
  }

  const sorted = [...criteria].sort((a, b) => b.averageScore - a.averageScore);
  // Stable remount key so the animation replays when the input set changes.
  const remountKey = sorted.map((c) => c.criterionId).join("|");
  const candidateCount = sorted[0]?.candidateCount ?? 0;

  return (
    <div>
      {/*
        Scoped keyframes. `--target-width` is supplied per-row inline so a
        single rule animates every bar to its own target. Using `width`
        rather than `transform: scaleX` keeps the right edge crisp and
        respects `border-radius` without sub-pixel artifacts.
      */}
      <style>{`
        @keyframes vet-rubric-bar-fill {
          from { width: 0%; }
          to   { width: var(--target-width, 0%); }
        }
      `}</style>

      <ul key={remountKey} className="grid gap-3" aria-label="Rubric trait averages">
        {sorted.map((trait, index) => {
          const isTop = index === 0;
          const pct = Math.max(
            0,
            Math.min(100, (trait.averageScore / trait.maxScore) * 100),
          );

          // `cssMotionStyle` provides the timing function + per-row stagger;
          // we add the `animationName` and the `--target-width` custom prop
          // so each row animates to its own endpoint.
          const fillStyle: CSSProperties = {
            ...cssMotionStyle(index, "bar"),
            animationName: "vet-rubric-bar-fill",
            ["--target-width" as string]: `${pct}%`,
            width: `${pct}%`,
          };

          return (
            <li
              key={trait.criterionId}
              className="grid grid-cols-[minmax(120px,1fr)_minmax(160px,3fr)_72px] items-center gap-4 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                {isTop ? (
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  />
                ) : null}
                <span
                  className={`truncate ${
                    isTop
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  }`}
                  title={trait.label}
                >
                  {trait.label}
                </span>
              </div>

              <div
                className={`relative w-full overflow-hidden rounded-full bg-muted ${
                  isTop ? "h-3" : "h-2"
                }`}
                role="progressbar"
                aria-valuenow={Number(trait.averageScore.toFixed(1))}
                aria-valuemin={0}
                aria-valuemax={trait.maxScore}
                aria-label={`${trait.label} average ${trait.averageScore.toFixed(1)} of ${trait.maxScore}`}
              >
                <span
                  className={`block h-full rounded-full bg-primary ${
                    isTop ? "" : "opacity-80"
                  }`}
                  style={fillStyle}
                />
              </div>

              <span className="text-right font-semibold tabular-nums text-foreground">
                {trait.averageScore.toFixed(1)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  / {trait.maxScore}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {candidateCount > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Based on {candidateCount} candidate{candidateCount === 1 ? "" : "s"} scored.
        </p>
      ) : null}
    </div>
  );
}
