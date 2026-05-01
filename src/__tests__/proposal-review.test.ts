import { describe, expect, it } from "vitest";
import { isProposalVoteable, VOTEABLE_PROPOSAL_STATUS } from "@/lib/proposal-review";
import type { GuildApplication } from "@/types";

describe("proposal review helper", () => {
  it("treats ongoing assigned proposals as voteable", () => {
    expect(
      isProposalVoteable({
        status: VOTEABLE_PROPOSAL_STATUS,
        finalized: false,
        has_voted: false,
        is_assigned_reviewer: true,
      } as GuildApplication)
    ).toBe(true);
  });

  it("does not allow pending proposals to be voted", () => {
    expect(
      isProposalVoteable({
        status: "pending",
        finalized: false,
        has_voted: false,
        is_assigned_reviewer: true,
      } as GuildApplication)
    ).toBe(false);
  });

  it("does not allow finalized tiebreaker proposals", () => {
    expect(
      isProposalVoteable({
        status: VOTEABLE_PROPOSAL_STATUS,
        finalized: true,
        has_voted: false,
        is_tiebreaker_reviewer: true,
      } as GuildApplication)
    ).toBe(false);
  });
});
