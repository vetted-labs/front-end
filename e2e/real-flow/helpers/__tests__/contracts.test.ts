// e2e/real-flow/helpers/__tests__/contracts.test.ts
import { describe, it, expect } from "vitest";
import { readContractAddresses, makeContracts } from "../contracts";
import { createAnvilHandle } from "../chain";

describe("contracts helper", () => {
  it("reads addresses and instantiates contracts", () => {
    const addrs = readContractAddresses();
    const anvil = createAnvilHandle();
    const c = makeContracts(addrs, anvil.publicClient);
    expect(c.vettingManager.address).toBe(addrs.VettingManager);
    expect(c.expertStaking.address).toBe(addrs.ExpertStaking);
    expect(c.guildRegistry.address).toBe(addrs.GuildRegistry);
    expect(c.slashingManager.address).toBe(addrs.SlashingManager);
    expect(c.vettedToken.address).toBe(addrs.VettedToken);
    expect(c.endorsementBidding.address).toBe(addrs.EndorsementBidding);
    expect(c.rewardDistributor.address).toBe(addrs.RewardDistributor);
    expect(c.reputationManager.address).toBe(addrs.ReputationManager);
  });
});
