export interface AutoMateRunOutcomeInput {
  selectedCount: number;
  passedCount: number;
  failedCount: number;
}

export function summarizeAutoMateRunOutcome(input: AutoMateRunOutcomeInput) {
  const passRate = input.selectedCount > 0
    ? Math.round((input.passedCount / input.selectedCount) * 100)
    : 0;

  return {
    status: input.failedCount > 0 ? "failed" : "passed",
    passRate,
    summary: `${input.passedCount} passed, ${input.failedCount} failed, ${input.selectedCount} selected`,
  };
}
