import { describe, it, expect } from "vitest";
import { mapAppealResponse } from "@/types/guildApplication";

describe("mapAppealResponse", () => {
  const baseBackendResponse = {
    id: "appeal-uuid",
    application_id: "app-uuid",
    application_type: "candidate",
    guild_id: "guild-uuid",
    guild_name: "Solidity Experts",
    appealed_by_expert_id: "expert-uuid",
    appealer_name: "Jane Doe",
    appeal_reason: "The candidate has strong qualifications.",
    evidence: null,
    stake_amount: "50.00000000",
    appeal_number: 1,
    status: "open",
    original_reviewer_ids: ["r1", "r2"],
    resolved_at: null,
    created_at: "2026-02-24T12:00:00Z",
    updated_at: "2026-02-24T12:00:00Z",
    panel_members: [],
  };

  it("maps backend snake_case to camelCase", () => {
    const result = mapAppealResponse(baseBackendResponse);
    expect(result.id).toBe("appeal-uuid");
    expect(result.applicationId).toBe("app-uuid");
    expect(result.guildId).toBe("guild-uuid");
    expect(result.guildName).toBe("Solidity Experts");
    expect(result.appealerExpertId).toBe("expert-uuid");
    expect(result.appealerName).toBe("Jane Doe");
    expect(result.justification).toBe("The candidate has strong qualifications.");
    expect(result.createdAt).toBe("2026-02-24T12:00:00Z");
  });

  it("parses stake_amount as a number", () => {
    const result = mapAppealResponse(baseBackendResponse);
    expect(result.stakeAmount).toBe(50);
  });

  it('maps backend "open" status to frontend "pending"', () => {
    const result = mapAppealResponse({ ...baseBackendResponse, status: "open" });
    expect(result.status).toBe("pending");
  });

  it('maps backend "panel_assigned" status to frontend "pending"', () => {
    const result = mapAppealResponse({ ...baseBackendResponse, status: "panel_assigned" });
    expect(result.status).toBe("pending");
  });

  it('maps backend "under_review" status to frontend "reviewing"', () => {
    const result = mapAppealResponse({ ...baseBackendResponse, status: "under_review" });
    expect(result.status).toBe("reviewing");
  });

  it('maps backend "approved" status to frontend "overturned"', () => {
    const result = mapAppealResponse({
      ...baseBackendResponse,
      status: "approved",
      resolved_at: "2026-02-26T00:00:00Z",
    });
    expect(result.status).toBe("overturned");
  });

  it('maps backend "dismissed" status to frontend "upheld"', () => {
    const result = mapAppealResponse({
      ...baseBackendResponse,
      status: "dismissed",
      resolved_at: "2026-02-26T00:00:00Z",
    });
    expect(result.status).toBe("upheld");
  });

  it('maps backend "expired" status to frontend "upheld"', () => {
    const result = mapAppealResponse({
      ...baseBackendResponse,
      status: "expired",
      resolved_at: "2026-02-26T00:00:00Z",
    });
    expect(result.status).toBe("upheld");
  });

  it("produces outcome for resolved (approved) appeals", () => {
    const result = mapAppealResponse({
      ...baseBackendResponse,
      status: "approved",
      resolved_at: "2026-02-26T00:00:00Z",
    });
    expect(result.outcome).toBeDefined();
    expect(result.outcome!.decision).toBe("overturned");
    expect(result.outcome!.appealerReputationChange).toBe(3);
    expect(result.outcome!.appealerStakeReturned).toBe(true);
  });

  it("produces outcome for resolved (dismissed) appeals", () => {
    const result = mapAppealResponse({
      ...baseBackendResponse,
      status: "dismissed",
      resolved_at: "2026-02-26T00:00:00Z",
    });
    expect(result.outcome).toBeDefined();
    expect(result.outcome!.decision).toBe("upheld");
    expect(result.outcome!.appealerReputationChange).toBe(-5);
    expect(result.outcome!.appealerStakeReturned).toBe(false);
  });

  it("does not produce outcome for active appeals", () => {
    const result = mapAppealResponse(baseBackendResponse);
    expect(result.outcome).toBeUndefined();
  });

  it("maps panel_members with votes to AppealVote array", () => {
    const result = mapAppealResponse({
      ...baseBackendResponse,
      status: "under_review",
      panel_members: [
        {
          id: "pm-1",
          appeal_id: "appeal-uuid",
          expert_id: "officer-1",
          expert_name: "Officer Alice",
          vote: "approve_appeal",
          reasoning: "Strong candidate",
          voted_at: "2026-02-25T12:00:00Z",
          created_at: "2026-02-24T13:00:00Z",
        },
        {
          id: "pm-2",
          appeal_id: "appeal-uuid",
          expert_id: "officer-2",
          expert_name: "Officer Bob",
          vote: null,
          reasoning: null,
          voted_at: null,
          created_at: "2026-02-24T13:00:00Z",
        },
      ],
    });

    // Only the member who voted should appear in votes
    expect(result.votes).toHaveLength(1);
    expect(result.votes[0].expertId).toBe("officer-1");
    expect(result.votes[0].expertName).toBe("Officer Alice");
    expect(result.votes[0].decision).toBe("overturn");
    expect(result.votes[0].reasoning).toBe("Strong candidate");
  });

  it('maps "uphold_rejection" vote to "uphold" decision', () => {
    const result = mapAppealResponse({
      ...baseBackendResponse,
      panel_members: [
        {
          id: "pm-1",
          appeal_id: "appeal-uuid",
          expert_id: "officer-1",
          expert_name: "Officer X",
          vote: "uphold_rejection",
          reasoning: "Correct decision",
          voted_at: "2026-02-25T12:00:00Z",
          created_at: "2026-02-24T13:00:00Z",
        },
      ],
    });

    expect(result.votes[0].decision).toBe("uphold");
  });

  it("computes votesUphold and votesOverturn correctly", () => {
    const result = mapAppealResponse({
      ...baseBackendResponse,
      panel_members: [
        { id: "pm-1", expert_id: "e1", vote: "uphold_rejection", reasoning: "a", voted_at: "2026-02-25T12:00:00Z", created_at: "2026-02-24T13:00:00Z" },
        { id: "pm-2", expert_id: "e2", vote: "approve_appeal", reasoning: "b", voted_at: "2026-02-25T13:00:00Z", created_at: "2026-02-24T13:00:00Z" },
        { id: "pm-3", expert_id: "e3", vote: "uphold_rejection", reasoning: "c", voted_at: "2026-02-25T14:00:00Z", created_at: "2026-02-24T13:00:00Z" },
      ],
    });

    expect(result.votesUphold).toBe(2);
    expect(result.votesOverturn).toBe(1);
  });

  it("uses panel_members length as panelSize", () => {
    const result = mapAppealResponse({
      ...baseBackendResponse,
      panel_members: [
        { id: "pm-1", expert_id: "e1", vote: null, reasoning: null, voted_at: null, created_at: "2026-02-24T13:00:00Z" },
        { id: "pm-2", expert_id: "e2", vote: null, reasoning: null, voted_at: null, created_at: "2026-02-24T13:00:00Z" },
        { id: "pm-3", expert_id: "e3", vote: null, reasoning: null, voted_at: null, created_at: "2026-02-24T13:00:00Z" },
      ],
    });

    expect(result.panelSize).toBe(3);
  });

  it("defaults panelSize to 3 when no panel_members", () => {
    const result = mapAppealResponse({
      ...baseBackendResponse,
      panel_members: undefined,
    });

    expect(result.panelSize).toBe(3);
  });
});
