import { afterEach, describe, expect, it, vi } from "vitest";

describe("job analytics detail helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("enables fixture mode only outside production with explicit flag", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_FIXTURE_MODE", "true");
    const enabledModule = await import("@/components/dashboard/analytics/job-detail-helpers");
    expect(enabledModule.isAnalyticsFixtureModeEnabled()).toBe(true);

    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_FIXTURE_MODE", "true");
    const productionModule = await import("@/components/dashboard/analytics/job-detail-helpers");
    expect(productionModule.isAnalyticsFixtureModeEnabled()).toBe(false);
  });

  it("sorts by vetting score, selected endorsers, selected amount, then newest date", async () => {
    const { sortAnalyticsCandidates } = await import("@/components/dashboard/analytics/job-detail-helpers");
    const sorted = sortAnalyticsCandidates([
      { id: "old", vettingScore: 90, selectedEndorserCount: 1, selectedEndorsementAmount: "100", appliedAt: "2026-04-01T00:00:00.000Z" },
      { id: "best", vettingScore: 92, selectedEndorserCount: 1, selectedEndorsementAmount: "100", appliedAt: "2026-04-01T00:00:00.000Z" },
      { id: "amount", vettingScore: 90, selectedEndorserCount: 2, selectedEndorsementAmount: "500", appliedAt: "2026-04-01T00:00:00.000Z" },
      { id: "new", vettingScore: null, selectedEndorserCount: 0, selectedEndorsementAmount: "0", appliedAt: "2026-04-05T00:00:00.000Z" },
    ] as never);

    expect(sorted.map((candidate) => candidate.id)).toEqual(["best", "amount", "old", "new"]);
  });

  it("exports a typed fixture matching the v1 contract", async () => {
    const { jobAnalyticsFixture } = await import("@/components/dashboard/analytics/job-detail-fixture");

    expect(jobAnalyticsFixture.contractVersion).toBe("analytics-job-detail-v1");
    expect(jobAnalyticsFixture.candidates[0].selectedEndorsementAmount).toBeTypeOf("string");
    expect(jobAnalyticsFixture.candidates[0].reviews[0].source).toBe("proposal_vote");
  });
});
