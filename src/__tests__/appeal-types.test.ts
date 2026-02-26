import { describe, it, expect } from "vitest";
import type {
  GuildApplicationAppeal,
  AppealVote,
  AppealOutcome,
  AppealStatus,
} from "@/types/guildApplication";

describe("Appeal type structure (Stage 2b: Decentralized Arbitration)", () => {
  const mockAppealVote: AppealVote = {
    id: "vote-1",
    expertId: "expert-1",
    expertName: "Officer Smith",
    decision: "overturn",
    reasoning: "The candidate demonstrated sufficient expertise in their application.",
    votedAt: "2026-02-25T12:00:00Z",
  };

  const mockOutcome: AppealOutcome = {
    decision: "overturned",
    appealerReputationChange: 15,
    appealerStakeReturned: true,
    originalReviewersReputationChange: -5,
    resolvedAt: "2026-02-26T12:00:00Z",
  };

  const mockAppeal: GuildApplicationAppeal = {
    id: "appeal-1",
    applicationId: "app-1",
    guildId: "guild-1",
    guildName: "Solidity Experts",
    appealerExpertId: "expert-2",
    appealerName: "Expert Jane",
    justification: "This candidate was incorrectly rejected. Their portfolio demonstrates deep Solidity knowledge.",
    stakeAmount: 50,
    status: "overturned",
    createdAt: "2026-02-24T12:00:00Z",
    resolvedAt: "2026-02-26T12:00:00Z",
    votes: [mockAppealVote],
    panelSize: 3,
    votesUphold: 0,
    votesOverturn: 1,
    outcome: mockOutcome,
  };

  it("supports all 4 appeal statuses from whitepaper", () => {
    const statuses: AppealStatus[] = ["pending", "reviewing", "upheld", "overturned"];
    statuses.forEach((status) => {
      const appeal: GuildApplicationAppeal = { ...mockAppeal, status };
      expect(appeal.status).toBe(status);
    });
  });

  it("appeal vote decision is either uphold or overturn", () => {
    const upholdVote: AppealVote = { ...mockAppealVote, decision: "uphold" };
    const overturnVote: AppealVote = { ...mockAppealVote, decision: "overturn" };
    expect(upholdVote.decision).toBe("uphold");
    expect(overturnVote.decision).toBe("overturn");
  });

  it("outcome decision maps to upheld or overturned", () => {
    const upheldOutcome: AppealOutcome = { ...mockOutcome, decision: "upheld", appealerStakeReturned: false };
    const overturnedOutcome: AppealOutcome = { ...mockOutcome, decision: "overturned", appealerStakeReturned: true };
    expect(upheldOutcome.decision).toBe("upheld");
    expect(upheldOutcome.appealerStakeReturned).toBe(false);
    expect(overturnedOutcome.decision).toBe("overturned");
    expect(overturnedOutcome.appealerStakeReturned).toBe(true);
  });

  it("tracks panel votes with uphold/overturn counts", () => {
    expect(mockAppeal.panelSize).toBe(3);
    expect(mockAppeal.votesUphold + mockAppeal.votesOverturn).toBeLessThanOrEqual(mockAppeal.panelSize);
    expect(mockAppeal.votes).toHaveLength(1);
  });

  it("requires stake amount per whitepaper (minimum 50 VETD)", () => {
    expect(mockAppeal.stakeAmount).toBeGreaterThanOrEqual(50);
  });

  it("records appealer reputation change on outcome", () => {
    expect(mockAppeal.outcome?.appealerReputationChange).toBeDefined();
    // Overturned → positive reputation change for appealer
    expect(mockAppeal.outcome?.appealerReputationChange).toBeGreaterThan(0);
    // Overturned → stake returned
    expect(mockAppeal.outcome?.appealerStakeReturned).toBe(true);
  });

  it("tracks original reviewers reputation change on overturn", () => {
    // When overturned, original reviewers receive a penalty
    expect(mockAppeal.outcome?.originalReviewersReputationChange).toBeDefined();
    expect(mockAppeal.outcome?.originalReviewersReputationChange).toBeLessThan(0);
  });
});

describe("Appeal API contract", () => {
  it("guildAppealApi is exported from api.ts", async () => {
    const apiModule = await import("@/lib/api");
    expect(apiModule.guildAppealApi).toBeDefined();
    expect(typeof apiModule.guildAppealApi.fileAppeal).toBe("function");
    expect(typeof apiModule.guildAppealApi.getAppealByApplication).toBe("function");
    expect(typeof apiModule.guildAppealApi.getAppeal).toBe("function");
    expect(typeof apiModule.guildAppealApi.getGuildAppeals).toBe("function");
    expect(typeof apiModule.guildAppealApi.voteOnAppeal).toBe("function");
    expect(typeof apiModule.guildAppealApi.checkAppealEligibility).toBe("function");
  });
});
