// e2e/real-flow/experiments/__tests__/report.spec.ts
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildReport, writeReport, type ExperimentRun } from "../report";

const sampleRun: ExperimentRun = {
  startedAt: new Date().toISOString(),
  mode: "hybrid",
  requested: 3,
  completed: 2,
  uiSampleRate: 0.5,
  uiExercised: 1,
  blockedByDivergence: ["DIV-001"],
  results: [
    { applicationId: "a1", scores: [80, 82, 81], platformConsensus: 81, oracleConsensus: 81, consensusMatch: true, via: "api" },
    { applicationId: "a2", scores: [10, 90, 50], platformConsensus: 50, oracleConsensus: 50, consensusMatch: true, via: "ui" },
  ],
  durationMs: 1234,
};

test("buildReport summarizes discrepancies, timings, and divergences", () => {
  const r = buildReport(sampleRun);
  expect(r.summary.requested).toBe(3);
  expect(r.summary.completed).toBe(2);
  expect(r.summary.consensusMismatches).toBe(0);
  expect(r.markdown).toContain("DIV-001");
  expect(r.markdown).toContain("Pipeline C simple-majority oracle");
  expect(r.markdown).toContain("Technical Appendix §4 approval threshold");
});

test("writeReport emits both json and md", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "exp-"));
  const { jsonPath, mdPath } = writeReport(sampleRun, dir);
  expect(fs.existsSync(jsonPath)).toBe(true);
  expect(fs.existsSync(mdPath)).toBe(true);
  fs.rmSync(dir, { recursive: true });
});
