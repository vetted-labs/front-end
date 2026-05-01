import { describe, expect, it } from "vitest";
import {
  PRACTICE_GENERAL_TEMPLATE,
  PRACTICE_LEVEL_TEMPLATE,
} from "@/components/expert/onboarding/practiceReviewData";

describe("practice review demo data", () => {
  it("keeps the first-run practice rubric short enough for story mode", () => {
    expect(PRACTICE_GENERAL_TEMPLATE.generalQuestions).toHaveLength(1);
    expect(PRACTICE_GENERAL_TEMPLATE.rubric?.redFlags).toHaveLength(1);
    expect(PRACTICE_LEVEL_TEMPLATE.topics).toHaveLength(1);
  });
});
