import { describe, expect, it } from "vitest";
import { canLoadGuildWorkspaceData } from "@/lib/guild-workspace-readiness";

describe("guild workspace readiness", () => {
  it("allows workspace data to load when an expert wallet address is resolved without live wagmi connection", () => {
    expect(
      canLoadGuildWorkspaceData({
        address: "0x1111111111111111111111111111111111111111",
        isStoryLabSyntheticGuild: false,
      }),
    ).toBe(true);
  });

  it("does not load private workspace data without a wallet outside story lab", () => {
    expect(
      canLoadGuildWorkspaceData({
        address: undefined,
        isStoryLabSyntheticGuild: false,
      }),
    ).toBe(false);
  });

  it("allows story lab synthetic guild data without a wallet", () => {
    expect(
      canLoadGuildWorkspaceData({
        address: undefined,
        isStoryLabSyntheticGuild: true,
      }),
    ).toBe(true);
  });
});
