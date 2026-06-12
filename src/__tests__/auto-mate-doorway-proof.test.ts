import { describe, expect, it } from "vitest";
import { buildDoorwayProofState } from "@/lib/autoMateDoorwayProof";

describe("buildDoorwayProofState", () => {
  it("marks a clean passing run as reviewable", () => {
    const state = buildDoorwayProofState({
      outcome: "passed",
      selectedCount: 5,
      failedCount: 0,
      testGapCount: 0,
      artifacts: ["report", "replay", "logs", "bundle"],
    });

    expect(state.headline).toBe("Focused checks passed");
    expect(state.primaryAction).toBe("review");
  });

  it("keeps artifact labels user-facing", () => {
    const state = buildDoorwayProofState({
      outcome: "passed",
      selectedCount: 5,
      failedCount: 0,
      testGapCount: 0,
      artifacts: ["report", "replay", "logs", "bundle"],
    });

    expect(state.artifactLabels).toEqual([
      "Report brief",
      "Test replay",
      "Redacted logs",
      "Evidence bundle",
    ]);
  });

  it("flags passed runs when coverage gaps remain", () => {
    const state = buildDoorwayProofState({
      outcome: "passed",
      selectedCount: 5,
      failedCount: 0,
      testGapCount: 1,
      artifacts: ["report", "logs"],
    });

    expect(state.headline).toBe("Focused checks passed, coverage needs review");
    expect(state.needsCoverageReview).toBe(true);
  });

  it("tells reviewers to fix failed focused checks", () => {
    const state = buildDoorwayProofState({
      outcome: "failed",
      selectedCount: 5,
      failedCount: 1,
      testGapCount: 0,
      artifacts: ["report", "logs"],
    });

    expect(state.headline).toBe("1 of 5 focused checks failed");
    expect(state.primaryAction).toBe("fix");
  });

  it("tells reviewers to rerun cancelled proof attempts", () => {
    const state = buildDoorwayProofState({
      outcome: "cancelled",
      selectedCount: 5,
      failedCount: 0,
      testGapCount: 0,
      artifacts: ["report"],
    });

    expect(state.primaryAction).toBe("rerun");
    expect(state.needsCoverageReview).toBe(true);
  });
});
