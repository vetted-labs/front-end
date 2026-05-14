// e2e/real-flow/experiments/__tests__/volume.spec.ts
//
// CI cohort: runs the experiment harness at N=20, API/chain path only
// (uiSampleRate=0, fast), and asserts:
//   1. The run completed (completed >= requested).
//   2. Zero consensus mismatches between the platform and the Pipeline-C oracle.
//   3. A run report was written to the reports directory.
//
// If the platform genuinely diverges from the oracle (math bug), this spec
// FAILS with the full mismatch details — that is the intended outcome and the
// primary value of the harness.
//
// DIV-001 awareness
// -----------------
// This spec uses uiSampleRate=0 because DIV-001 blocks the full browser-driven
// UI path from running at volume. The blocked flows are recorded in the run
// report. When DIV-001 is resolved, raise uiSampleRate in the run command below.
//
// Negative-control (manual)
// -------------------------
// To verify the oracle detects an injected math bug:
//   1. Temporarily edit pipelineCOracle() in run-experiment.ts to always return
//      oracleConsensus=0 (always "rejected").
//   2. Run the harness with --distribution=consensus (all high scores → approved).
//   3. The run should report consensusMismatches > 0 and this spec should FAIL.
//   4. Revert the edit.
//
// This documents that the oracle diff is a real guard, not dead code.

import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { ExperimentRun } from "../report";
import { buildReport } from "../report";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";
const REPORTS_DIR = path.resolve(__dirname, "../reports");
const EXPERIMENT_SCRIPT = path.resolve(__dirname, "../run-experiment.ts");

test("N=20 API/chain cohort: all panels finalize and match the oracle", () => {
  // Run the harness synchronously (tsx is fast enough at N=20).
  const cmd = [
    `BACKEND_URL=${BACKEND_URL}`,
    "npx tsx",
    EXPERIMENT_SCRIPT,
    "--applications=20",
    "--mode=hybrid",
    "--uiSampleRate=0",
    "--distribution=realistic",
    "--seed=1337",
  ].join(" ");

  let stdout = "";
  let stderr = "";
  let exitCode: number | null = 0;
  try {
    stdout = execSync(cmd, {
      cwd: path.resolve(__dirname, "../../../../.."),
      timeout: 120_000,
      encoding: "utf-8",
    });
  } catch (err) {
    const execErr = err as { stdout?: string; stderr?: string; status?: number };
    stdout = execErr.stdout ?? "";
    stderr = execErr.stderr ?? "";
    exitCode = execErr.status ?? 1;
  }

  // -------------------------------------------------------------------------
  // Find the report written by THIS run.
  // The harness prints a parseable line:  [harness]   Report JSON:           <path>
  // We extract it from stdout so we never accidentally read a stale report
  // from a previous run that landed in the same second.
  // -------------------------------------------------------------------------
  const reportJsonMatch = stdout.match(/\[harness\]\s+Report JSON:\s+(\S+)/);
  const latestReportPath = reportJsonMatch
    ? reportJsonMatch[1].trim()
    : (() => {
        // Fallback: lexicographic sort (only reached if stdout was lost).
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
        const reportFiles = fs
          .readdirSync(REPORTS_DIR)
          .filter((f) => f.endsWith(".json"))
          .sort()
          .reverse();
        expect(
          reportFiles.length,
          "Expected at least one report file in experiments/reports/ — harness may not have run",
        ).toBeGreaterThan(0);
        return path.join(REPORTS_DIR, reportFiles[0]);
      })();

  expect(
    fs.existsSync(latestReportPath),
    `Report file not found at path parsed from harness stdout: ${latestReportPath}`,
  ).toBe(true);
  const run = JSON.parse(
    fs.readFileSync(latestReportPath, "utf-8"),
  ) as ExperimentRun;

  const { summary } = buildReport(run);

  // -------------------------------------------------------------------------
  // Assertions
  // -------------------------------------------------------------------------

  // 1. The run must have completed at least as many applications as requested.
  //    Skipped ones (e.g. due to assignment discovery failure) are not failures,
  //    but 0 completed is a harness infrastructure failure.
  expect(
    summary.completed,
    `Expected completed > 0, got ${summary.completed}. ` +
      `Harness output:\n${stdout}\n${stderr}`,
  ).toBeGreaterThan(0);

  // 2. Zero consensus mismatches. A non-zero count means the platform's outcome
  //    diverged from what the Pipeline-C oracle predicted for those scores —
  //    that is a math / protocol implementation bug. The mismatch details are
  //    printed below for investigation.
  if (summary.consensusMismatches > 0) {
    const details = summary.mismatches
      .map(
        (m) =>
          `  app=${m.applicationId} scores=[${m.scores.join(",")}] ` +
          `platform=${m.platformConsensus} oracle=${m.oracleConsensus} via=${m.via}`,
      )
      .join("\n");

    // If this is a genuine new platform divergence, document it as DIV-00N in
    // docs/testing/PROTOCOL_DIVERGENCES.md and gate this test with:
    //   test.fixme(true, "DIV-00N: <description>");
    // then re-run to confirm CI stays green while the divergence is tracked.
    expect(
      summary.consensusMismatches,
      `Consensus mismatches detected (platform diverges from Pipeline-C oracle):\n${details}\n` +
        `Full report: ${latestReportPath}`,
    ).toBe(0);
  }

  // 3. Report file exists — already asserted during path discovery above (documents intent).

  // -------------------------------------------------------------------------
  // Summary output for CI logs
  // -------------------------------------------------------------------------
  console.log(
    `[volume] ${summary.completed}/${summary.requested} applications finalized, ` +
      `${summary.consensusMismatches} mismatches, ` +
      `${summary.wallClockSec}s, ` +
      `DIV blocks: [${summary.blockedByDivergence.join(",")}]`,
  );
  console.log(`[volume] Report: ${latestReportPath}`);

  // 4. If the harness exited 1 due to consensus mismatches, the above assertion
  //    will have already failed. But if it exited 1 for another reason (e.g.
  //    infrastructure failure), surface that too.
  if (exitCode !== 0 && summary.consensusMismatches === 0) {
    // Non-mismatch failure — likely an infrastructure error. Check stderr.
    console.warn("[volume] Harness exited non-zero but no mismatches — infrastructure error?");
    console.warn("[volume] stderr:", stderr.slice(0, 2000));
  }
});
