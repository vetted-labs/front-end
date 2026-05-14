// e2e/real-flow/experiments/report.ts
//
// Run-report generator for the volume/experiment harness.
// Produces both a machine-readable JSON dump and a human-readable Markdown
// summary for every experiment run.

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One finalized application result. */
export type ApplicationResult = {
  /** Opaque application/session identifier. */
  applicationId: string;
  /** The panel scores that were submitted (0-100 range, Pipeline C path). */
  scores: number[];
  /** Consensus score read from the platform (backend/chain). */
  platformConsensus: number;
  /** Consensus score computed by the oracle (Technical Appendix §4). */
  oracleConsensus: number;
  /** Whether platform and oracle consensus scores agree (within 0.01). */
  consensusMatch: boolean;
  /** Which execution path was used: API/chain or the UI browser path. */
  via: "api" | "ui";
  /**
   * If the result could not be finalized, the divergence reference(s) that
   * explain why (e.g. "DIV-001"). Absence means the result IS finalized.
   */
  blockedBy?: string[];
  /** Optional wall-clock ms for this single application. */
  durationMs?: number;
};

/** Top-level experiment run record. */
export type ExperimentRun = {
  startedAt: string; // ISO-8601
  /** Completion timestamp (populated by writeReport/buildReport). */
  finishedAt?: string;
  mode: "hybrid" | "ui-soak";
  requested: number;
  completed: number;
  /** Fraction of applications that should have used the UI path (0-1). */
  uiSampleRate: number;
  /** Number of applications that DID use the UI path. */
  uiExercised: number;
  /**
   * Divergence references that caused some applications to be skipped or
   * reduced in scope (e.g. "DIV-001" when the UI-guild-application path is
   * blocked).
   */
  blockedByDivergence: string[];
  results: ApplicationResult[];
  durationMs: number;
  /** Arbitrary key/value metadata (distribution name, panelSize, etc.). */
  meta?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// buildReport
// ---------------------------------------------------------------------------

export type ReportSummary = {
  requested: number;
  completed: number;
  skipped: number;
  consensusMismatches: number;
  mismatches: ApplicationResult[];
  uiExercised: number;
  uiSampleRate: number;
  blockedByDivergence: string[];
  durationMs: number;
  wallClockSec: number;
  msPerApplication: number;
};

export type BuiltReport = {
  summary: ReportSummary;
  /** Human-readable Markdown. */
  markdown: string;
  /** The original run record (for pass-through to JSON). */
  run: ExperimentRun;
};

/** Build an in-memory report from a completed ExperimentRun. */
export function buildReport(run: ExperimentRun): BuiltReport {
  // Only count mismatches for COMPLETED (finalized) results, not skipped/blocked ones.
  const mismatches = run.results.filter(
    (r) => !r.consensusMatch && !r.blockedBy?.length && r.platformConsensus !== -1,
  );
  const summary: ReportSummary = {
    requested: run.requested,
    completed: run.completed,
    skipped: run.requested - run.completed,
    consensusMismatches: mismatches.length,
    mismatches,
    uiExercised: run.uiExercised,
    uiSampleRate: run.uiSampleRate,
    blockedByDivergence: run.blockedByDivergence,
    durationMs: run.durationMs,
    wallClockSec: Math.round(run.durationMs / 100) / 10,
    msPerApplication:
      run.completed > 0 ? Math.round(run.durationMs / run.completed) : 0,
  };

  const markdown = buildMarkdown(run, summary);
  return { summary, markdown, run };
}

function buildMarkdown(run: ExperimentRun, summary: ReportSummary): string {
  const lines: string[] = [];

  lines.push("# Vetted Experiment Run Report");
  lines.push("");
  lines.push(
    `**Started:** ${run.startedAt}  `,
    run.finishedAt ? `**Finished:** ${run.finishedAt}  ` : "",
    `**Mode:** ${run.mode}  `,
    `**Duration:** ${summary.wallClockSec}s`,
  );
  lines.push("");

  // --- Summary table ---
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Requested | ${summary.requested} |`);
  lines.push(`| Completed | ${summary.completed} |`);
  lines.push(`| Skipped | ${summary.skipped} |`);
  lines.push(`| Consensus mismatches | ${summary.consensusMismatches} |`);
  lines.push(
    `| UI exercised | ${summary.uiExercised} / ${summary.requested} (rate=${(summary.uiSampleRate * 100).toFixed(0)}%) |`,
  );
  lines.push(`| ms / application | ${summary.msPerApplication} |`);
  lines.push("");

  // --- Oracle attestation ---
  lines.push(
    `> Results validated against the Pipeline C simple-majority oracle ` +
      `(Technical Appendix §4 approval threshold). ` +
      `NOTE: the IQR/commit-reveal pipeline (Pipeline B) is not exercised — see DIV-001. ` +
      `UI exercised on ${summary.uiExercised} of ${summary.requested} applications.`,
  );
  lines.push("");

  // --- Divergence / blocked flows ---
  if (run.blockedByDivergence.length > 0) {
    lines.push("## Blocked Flows");
    lines.push("");
    lines.push(
      "The following protocol divergences prevented some flows from running at volume:",
    );
    lines.push("");
    for (const div of run.blockedByDivergence) {
      lines.push(
        `- **${div}** — see \`docs/testing/PROTOCOL_DIVERGENCES.md\` for details.`,
      );
    }
    if (run.blockedByDivergence.includes("DIV-001")) {
      lines.push("");
      lines.push(
        "> **DIV-001:** Candidate guild-applications submitted via the UI endpoint " +
          "(`POST /api/guilds/{id}/applications`) do NOT promote into the IQR/commit-reveal " +
          "pipeline (Pipeline B). The harness ran the working API/chain path for consensus " +
          "math validation. When DIV-001 is resolved, raising `uiSampleRate` will " +
          "automatically exercise the full end-to-end flow with no harness changes required.",
      );
    }
    lines.push("");
  }

  // --- Mismatch details ---
  if (summary.mismatches.length > 0) {
    lines.push("## Consensus Mismatches");
    lines.push("");
    lines.push(
      `Found **${summary.mismatches.length}** application(s) where the platform ` +
        `consensus differed from the oracle expectation:`,
    );
    lines.push("");
    for (const m of summary.mismatches) {
      lines.push(`### Application \`${m.applicationId}\``);
      lines.push("");
      lines.push(`- **Scores:** \`[${m.scores.join(", ")}]\``);
      lines.push(`- **Oracle consensus:** ${m.oracleConsensus}`);
      lines.push(`- **Platform consensus:** ${m.platformConsensus}`);
      lines.push(`- **Delta:** ${Math.abs(m.platformConsensus - m.oracleConsensus).toFixed(2)}`);
      lines.push(`- **Via:** ${m.via}`);
      if (m.blockedBy && m.blockedBy.length > 0) {
        lines.push(`- **Blocked by:** ${m.blockedBy.join(", ")}`);
      }
      lines.push("");
    }
  } else if (summary.completed > 0) {
    lines.push("## Consensus Validation");
    lines.push("");
    lines.push(
      `All **${summary.completed}** finalized applications matched the Technical Appendix oracle. ` +
        `No consensus mismatches detected.`,
    );
    lines.push("");
  } else {
    lines.push("## Consensus Validation");
    lines.push("");
    lines.push(
      "No applications were finalized in this run. " +
        "Check the blocked-flows section for the reason.",
    );
    lines.push("");
  }

  // --- Per-result table ---
  if (run.results.length > 0) {
    lines.push("## Per-Application Results");
    lines.push("");
    lines.push(
      "| Application | Scores | Oracle | Platform | Match | Via | Blocked |",
    );
    lines.push("|-------------|--------|--------|----------|-------|-----|---------|");
    for (const r of run.results) {
      lines.push(
        `| \`${r.applicationId.slice(0, 8)}\` ` +
          `| [${r.scores.join(",")}] ` +
          `| ${r.oracleConsensus} ` +
          `| ${r.platformConsensus} ` +
          `| ${r.consensusMatch ? "✓" : "✗"} ` +
          `| ${r.via} ` +
          `| ${r.blockedBy?.join(",") ?? ""} |`,
      );
    }
    lines.push("");
  }

  // --- Meta ---
  if (run.meta && Object.keys(run.meta).length > 0) {
    lines.push("## Run Parameters");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(run.meta, null, 2));
    lines.push("```");
    lines.push("");
  }

  return lines.filter((l) => l !== undefined).join("\n");
}

// ---------------------------------------------------------------------------
// writeReport
// ---------------------------------------------------------------------------

export type WriteReportResult = {
  jsonPath: string;
  mdPath: string;
};

/**
 * Write a run report to `dir`. Creates `<dir>/<timestamp>.json` and
 * `<dir>/<timestamp>.md`. Returns both paths.
 */
export function writeReport(
  run: ExperimentRun,
  dir: string,
): WriteReportResult {
  fs.mkdirSync(dir, { recursive: true });

  const { summary, markdown } = buildReport(run);
  void summary; // exposed via buildReport — callers use it directly if needed

  // Use the run's startedAt timestamp (sanitised for filesystem use).
  const ts = run.startedAt.replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const base = path.join(dir, ts);
  const jsonPath = `${base}.json`;
  const mdPath = `${base}.md`;

  fs.writeFileSync(jsonPath, JSON.stringify(run, null, 2), "utf-8");
  fs.writeFileSync(mdPath, markdown, "utf-8");

  return { jsonPath, mdPath };
}
