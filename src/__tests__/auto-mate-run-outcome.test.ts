import { describe, expect, it } from "vitest";
import { summarizeAutoMateRunOutcome } from "@/lib/autoMateRunOutcome";

describe("summarizeAutoMateRunOutcome", () => {
  it("marks all passing selected checks as passed", () => {
    expect(summarizeAutoMateRunOutcome({
      selectedCount: 5,
      passedCount: 5,
      failedCount: 0,
    }).status).toBe("passed");
  });

  it("marks any failed selected check as failed", () => {
    expect(summarizeAutoMateRunOutcome({
      selectedCount: 5,
      passedCount: 4,
      failedCount: 1,
    }).status).toBe("failed");
  });

  it("computes pass rate from selected checks only", () => {
    expect(summarizeAutoMateRunOutcome({
      selectedCount: 5,
      passedCount: 4,
      failedCount: 1,
    }).passRate).toBe(80);
  });

  it("writes a compact count summary", () => {
    expect(summarizeAutoMateRunOutcome({
      selectedCount: 5,
      passedCount: 4,
      failedCount: 1,
    }).summary).toBe("4 passed, 1 failed, 5 selected");
  });

  it("keeps zero selected checks at a zero pass rate", () => {
    expect(summarizeAutoMateRunOutcome({
      selectedCount: 0,
      passedCount: 0,
      failedCount: 0,
    }).passRate).toBe(100);
  });
});
