export type DoorwayArtifact = "report" | "replay" | "logs" | "bundle";

export interface DoorwayProofInput {
  outcome: "passed" | "failed" | "cancelled" | "infra_failed";
  selectedCount: number;
  failedCount: number;
  testGapCount: number;
  artifacts: DoorwayArtifact[];
}

export interface DoorwayProofState {
  headline: string;
  primaryAction: "review" | "fix" | "rerun";
  artifactLabels: string[];
  needsCoverageReview: boolean;
}

export function buildDoorwayProofState(input: DoorwayProofInput): DoorwayProofState {
  const artifactLabels = input.artifacts.map((artifact) => {
    if (artifact === "report") return "Report brief";
    if (artifact === "replay") return "Test replay";
    if (artifact === "logs") return "Redacted logs";
    return "Evidence bundle";
  });

  if (input.outcome === "failed") {
    return {
      headline: `${input.failedCount} of ${input.selectedCount} focused checks failed`,
      primaryAction: "fix",
      artifactLabels,
      needsCoverageReview: input.testGapCount > 0,
    };
  }

  if (input.outcome === "cancelled" || input.outcome === "infra_failed") {
    return {
      headline: "Proof run needs another attempt",
      primaryAction: "rerun",
      artifactLabels,
      needsCoverageReview: true,
    };
  }

  return {
    headline: input.testGapCount > 0
      ? "Focused checks passed, coverage needs review"
      : "Focused checks passed",
    primaryAction: "review",
    artifactLabels,
    needsCoverageReview: input.testGapCount > 0,
  };
}
