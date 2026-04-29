import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildStoryLabRoute,
  canAdvanceStoryLabStep,
  getStoryLabLaunchRoute,
  getStoryLabRoutes,
  getStoryLabStepIndex,
  isExpertStoryLabSearchParams,
  STORY_LAB_ACTUAL_ACTION_STEPS,
  STORY_LAB_COMPLETION_SIGNAL,
  STORY_LAB_STEPS,
} from "@/components/expert/story-lab/storyLabData";
import { TOUR_TARGETS } from "@/components/expert/onboarding/tourTargets";
import {
  STORY_LAB_EARNINGS_ENTRY,
  STORY_LAB_ENDORSEMENT_APPLICATION,
  STORY_LAB_EXPERT_GUILD,
  STORY_LAB_GOVERNANCE_PROPOSAL,
  STORY_LAB_NOTIFICATIONS,
  STORY_LAB_REPUTATION_ENTRY,
  STORY_LAB_REVIEW_APPLICATION,
} from "@/components/expert/story-lab/storyLabFixtures";
import { apiRequest } from "@/lib/api";

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
  localStorage.clear();
});

describe("expert story lab data", () => {
  it("launches into the real expert dashboard route with story lab params", () => {
    expect(getStoryLabLaunchRoute()).toBe(
      "/expert/dashboard?storyLab=expert&storyStep=overview"
    );
  });

  it("moves across the real expert surfaces instead of staying on one generic page", () => {
    expect(getStoryLabRoutes()).toEqual([
      "/expert/dashboard",
      "/expert/guilds",
      "/expert/guilds",
      "/expert/voting",
      "/expert/voting",
      "/expert/voting",
      "/expert/voting",
      "/expert/voting",
      "/expert/voting",
      "/expert/voting",
      "/expert/notifications",
      "/expert/earnings",
      "/expert/reputation",
      "/expert/endorsements",
      "/expert/governance",
      "/expert/dashboard",
    ]);
  });

  it("includes the full story arc the user needs to understand", () => {
    expect(STORY_LAB_STEPS.map((step) => step.page)).toEqual([
      "dashboard",
      "guilds",
      "guildDetail",
      "applications",
      "applications",
      "review",
      "review",
      "review",
      "review",
      "review",
      "notifications",
      "earnings",
      "reputation",
      "endorsements",
      "governance",
      "complete",
    ]);
    expect(STORY_LAB_COMPLETION_SIGNAL).toMatchObject({
      dataSource: "authenticated expert session",
      routeMode: "real expert routes",
      mutationMode: "read-only story fixtures",
    });
  });

  it("does not require real mutating actions during the story", () => {
    expect(STORY_LAB_ACTUAL_ACTION_STEPS).toEqual([]);
  });

  it("falls back to the first step for unknown query params", () => {
    expect(getStoryLabStepIndex("earnings")).toBe(11);
    expect(getStoryLabStepIndex("missing")).toBe(0);
    expect(getStoryLabStepIndex(null)).toBe(0);
  });

  it("builds story routes without dropping existing real-route query params", () => {
    expect(
      buildStoryLabRoute("/expert/guild/abc?tab=membershipApplications", "guild-detail")
    ).toBe(
      "/expert/guild/abc?tab=membershipApplications&storyLab=expert&storyStep=guild-detail"
    );
  });

  it("detects story lab mode from URLSearchParams", () => {
    expect(
      isExpertStoryLabSearchParams(
        new URLSearchParams("storyLab=expert&storyStep=overview")
      )
    ).toBe(true);
    expect(isExpertStoryLabSearchParams(new URLSearchParams("storyLab=other"))).toBe(false);
  });

  it("uses production tour target anchors instead of story-only target names", () => {
    const realTargets = new Set(Object.values(TOUR_TARGETS));
    for (const step of STORY_LAB_STEPS) {
      expect(realTargets.has(step.target)).toBe(true);
    }
  });

  it("does not allow a fallback target to advance an incomplete story step", () => {
    const stepWithFallback = STORY_LAB_STEPS.find((step) => step.fallbackTarget);
    expect(stepWithFallback).toBeDefined();
    expect(canAdvanceStoryLabStep(stepWithFallback!, stepWithFallback!.target)).toBe(true);
    expect(canAdvanceStoryLabStep(stepWithFallback!, stepWithFallback!.fallbackTarget!)).toBe(false);
    expect(canAdvanceStoryLabStep(stepWithFallback!, null)).toBe(false);
  });

  it("uses fixed timestamps in story fixtures", () => {
    expect(STORY_LAB_EXPERT_GUILD.joinedAt).toBe("2026-03-15T12:00:00.000Z");
    expect(STORY_LAB_REVIEW_APPLICATION.appliedAt).toBe("2026-04-27T12:00:00.000Z");
    expect(STORY_LAB_REVIEW_APPLICATION.commitDeadline).toBe("2026-05-02T12:00:00.000Z");
    expect(STORY_LAB_NOTIFICATIONS.map((item) => item.createdAt)).toEqual([
      "2026-04-29T12:00:00.000Z",
      "2026-04-29T11:55:00.000Z",
    ]);
    expect(STORY_LAB_EARNINGS_ENTRY.created_at).toBe("2026-04-29T11:50:00.000Z");
    expect(STORY_LAB_REPUTATION_ENTRY.created_at).toBe("2026-04-29T11:52:00.000Z");
    expect(STORY_LAB_ENDORSEMENT_APPLICATION.applied_at).toBe("2026-04-29T09:00:00.000Z");
    expect(STORY_LAB_ENDORSEMENT_APPLICATION.bidding_deadline).toBe("2026-04-30T08:00:00.000Z");
    expect(STORY_LAB_GOVERNANCE_PROPOSAL.voting_deadline).toBe("2026-05-03T12:00:00.000Z");
    expect(STORY_LAB_GOVERNANCE_PROPOSAL.created_at).toBe("2026-04-28T12:00:00.000Z");
  });

  it("blocks API mutations while story mode is active except onboarding state", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    window.history.pushState(null, "", "/expert/voting?storyLab=expert&storyStep=review-commit");

    await expect(
      apiRequest("/api/proposals/story-lab-review-maya-chen/vote", {
        method: "POST",
        body: JSON.stringify({ score: 90 }),
      })
    ).rejects.toMatchObject({
      status: 409,
      message: "Story mode is read-only.",
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    await expect(
      apiRequest("/api/experts/me/onboarding-state", {
        method: "PUT",
        body: JSON.stringify({ hasCompletedSetup: true }),
      })
    ).resolves.toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("clearly labels synthetic story data as non-mutating", () => {
    const copy = STORY_LAB_STEPS
      .map((step) => `${step.title} ${step.body} ${step.detail}`)
      .join(" ")
      .toLowerCase();

    expect(copy).toContain("synthetic");
    expect(copy).toContain("will not sign");
    expect(copy).toContain("never call a wallet");
  });

  it("declares a single canonical vote outcome that drives every downstream display", async () => {
    const { STORY_LAB_VOTE_OUTCOME, STORY_LAB_REVIEW_APPLICATION_ID } =
      await import("@/components/expert/story-lab/storyLabFixtures");
    expect(STORY_LAB_VOTE_OUTCOME).toEqual({
      applicationId: STORY_LAB_REVIEW_APPLICATION_ID,
      candidateName: "Maya Chen",
      stake: 100,
      reward: 139,
      reputationDelta: 12,
      weightMultiplier: 1.4,
      voteResolvedAt: "2026-04-29T12:00:00.000Z",
    });
  });

  it("derives every reward/reputation display from STORY_LAB_VOTE_OUTCOME", async () => {
    const fx = await import("@/components/expert/story-lab/storyLabFixtures");
    const reward = fx.STORY_LAB_VOTE_OUTCOME.reward;
    const repDelta = fx.STORY_LAB_VOTE_OUTCOME.reputationDelta;

    expect(fx.STORY_LAB_EARNINGS_ENTRY.amount).toBe(reward);
    expect(fx.STORY_LAB_REPUTATION_ENTRY.change_amount).toBe(repDelta);
    expect(fx.STORY_LAB_REPUTATION_ENTRY.reward_amount).toBe(reward);

    const rewardNotification = fx.STORY_LAB_NOTIFICATIONS.find(
      (n) => n.type === "reward_earned",
    );
    expect(rewardNotification?.title).toContain(String(reward));
  });

  it("aggregates story earnings totals from the canonical reward", async () => {
    const fx = await import("@/components/expert/story-lab/storyLabFixtures");
    const result = fx.withStoryLabEarnings(null, [], null);
    expect(result.summary.totalVetd).toBe(fx.STORY_LAB_VOTE_OUTCOME.reward);
    expect(result.summary.byGuild?.[0]?.total).toBe(fx.STORY_LAB_VOTE_OUTCOME.reward);
    expect(result.summary.byType?.[0]?.total).toBe(fx.STORY_LAB_VOTE_OUTCOME.reward);
  });

  it("injects a deterministic story-mode guild stake matching the canonical stake amount", async () => {
    const { withStoryLabGuildStakes, STORY_LAB_VOTE_OUTCOME, STORY_LAB_GUILD } =
      await import("@/components/expert/story-lab/storyLabFixtures");
    const result = withStoryLabGuildStakes([]);
    expect(result).toEqual([
      {
        guildId: STORY_LAB_GUILD.id,
        stakedAmount: String(STORY_LAB_VOTE_OUTCOME.stake),
        meetsMinimum: true,
      },
    ]);
  });

  it("does not duplicate a real stake for the story guild", async () => {
    const { withStoryLabGuildStakes, STORY_LAB_GUILD } =
      await import("@/components/expert/story-lab/storyLabFixtures");
    const real = [
      { guildId: STORY_LAB_GUILD.id, stakedAmount: "200", meetsMinimum: true },
    ];
    expect(withStoryLabGuildStakes(real)).toEqual(real);
  });
});
