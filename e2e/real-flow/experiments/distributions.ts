// e2e/real-flow/experiments/distributions.ts
//
// Seeded, deterministic score-distribution generators for the volume/experiment
// harness. The PRNG (mulberry32) is intentionally small and self-contained so
// these functions can run in any Node/browser context without a native Random
// dependency.
//
// Usage:
//   const scores = makePanelScores("realistic", 5, 42);
//   // → 5 integers in [0, 100], reproducible for seed=42

export const SCORE_DISTRIBUTIONS = [
  "consensus",
  "realistic",
  "polarized",
  "random",
] as const;

export type ScoreDistribution = (typeof SCORE_DISTRIBUTIONS)[number];

// ---------------------------------------------------------------------------
// mulberry32 — fast, 32-bit, period 2^32.
// Reference: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
// ---------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    z = (z ^ (z >>> 14)) >>> 0;
    return z / 4294967296;
  };
}

/** Clamp x to [0, 100] and round to integer. */
function clamp100(x: number): number {
  return Math.round(Math.min(100, Math.max(0, x)));
}

/**
 * Generate a panel of `panelSize` integer scores in [0, 100] from the
 * given distribution, seeded deterministically by `seed`.
 *
 * - `consensus`  — tight cluster: small spread (≤ 20) around a random centre
 * - `realistic`  — moderate spread (≤ 50), centre in 30-90
 * - `polarized`  — two clusters separated by > 40 points
 * - `random`     — uniform in [0, 100]
 */
export function makePanelScores(
  distribution: ScoreDistribution,
  panelSize: number,
  seed: number,
): number[] {
  const rng = mulberry32(seed);

  switch (distribution) {
    case "consensus": {
      // Centre in [30, 80]; each score deviates ± up to 8.
      const centre = 30 + Math.floor(rng() * 51); // 30-80
      return Array.from({ length: panelSize }, () => {
        const delta = Math.floor(rng() * 17) - 8; // -8..+8
        return clamp100(centre + delta);
      });
    }

    case "realistic": {
      // Centre in [35, 85]; each score deviates ± up to 20.
      const centre = 35 + Math.floor(rng() * 51); // 35-85
      return Array.from({ length: panelSize }, () => {
        const delta = Math.floor(rng() * 41) - 20; // -20..+20
        return clamp100(centre + delta);
      });
    }

    case "polarized": {
      // Two clusters: low [5, 35] and high [65, 95].
      // Guaranteed gap > 40 between the clusters.
      // Roughly half the panel in each cluster (or ± 1 for odd sizes).
      const lowCentre = 5 + Math.floor(rng() * 31); // 5-35
      const highCentre = 65 + Math.floor(rng() * 31); // 65-95
      const half = Math.floor(panelSize / 2);
      const scores: number[] = [];
      for (let i = 0; i < half; i++) {
        const delta = Math.floor(rng() * 11) - 5; // ±5
        scores.push(clamp100(lowCentre + delta));
      }
      for (let i = half; i < panelSize; i++) {
        const delta = Math.floor(rng() * 11) - 5; // ±5
        scores.push(clamp100(highCentre + delta));
      }
      // Shuffle so low and high are interspersed.
      for (let i = scores.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [scores[i], scores[j]] = [scores[j], scores[i]];
      }
      return scores;
    }

    case "random": {
      return Array.from({ length: panelSize }, () =>
        Math.floor(rng() * 101),
      );
    }
  }
}
