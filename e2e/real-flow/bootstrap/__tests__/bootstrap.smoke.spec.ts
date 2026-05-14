// e2e/real-flow/bootstrap/__tests__/bootstrap.smoke.spec.ts
//
// Smoke tests that prove the bootstrap manifest matches on-chain + backend
// reality. Three checks:
//   1. Manifest shape: 3 guilds × 10 experts each = 30 total.
//   2. On-chain staking: every manifest expert has >= 10 VETD staked in their
//      assigned guild, verified via ExpertStaking.getStakeInfo().
//   3. panelFor: returns a valid 5-7 panel and throws below the minimum.
//
// Pre-conditions: the deterministic bootstrap has run (`npm run e2e:bootstrap`),
// anvil is up on :8545 with the post-bootstrap chain state intact.

import { test, expect } from "../../fixtures";

const MIN_STAKE = 10n * 10n ** 18n; // 10 VETD, the bootstrap minimum

test("manifest has 3 guilds × 10 experts each", async ({ guilds, experts }) => {
  await test.step("manifest declares exactly 3 guilds", async () => {
    expect(guilds).toHaveLength(3);
  });

  await test.step("manifest declares exactly 30 experts total", async () => {
    expect(experts).toHaveLength(30);
  });

  await test.step("each guild has exactly 10 experts", async () => {
    for (const guild of guilds) {
      const count = experts.filter((e) => e.guildId === guild.id).length;
      expect(count, `guild "${guild.name}" should have 10 experts`).toBe(10);
    }
  });
});

test("every manifest expert is staked on-chain", async ({
  experts,
  guilds,
  contracts,
}) => {
  await test.step("read on-chain stake for every expert via getStakeInfo", async () => {
    for (const expert of experts) {
      const guild = guilds.find((g) => g.id === expert.guildId);
      if (!guild) {
        throw new Error(
          `Expert ${expert.address} references unknown guildId ${expert.guildId}`,
        );
      }

      // getStakeInfo(address expert, bytes32 guildId) → (uint256 amount, uint256 stakedAt)
      // viem returns a plain tuple array: [amount, stakedAt]
      const result = await contracts.expertStaking.read.getStakeInfo([
        expert.address,
        guild.on_chain_guild_id,
      ]);

      // Result is [amount, stakedAt] tuple returned as an array by viem
      const [amount] = result as [bigint, bigint];

      expect(
        amount >= MIN_STAKE,
        `Expert ${expert.address} in guild "${guild.name}" has stake ${amount} < MIN_STAKE ${MIN_STAKE}`,
      ).toBe(true);
    }
  });
});

test("panelFor draws a valid 5-7 expert panel", async ({ guilds, panelFor }) => {
  await test.step("panelFor(guilds[0].id, 7) returns 7 unique experts", async () => {
    const panel = panelFor(guilds[0].id, 7);
    expect(panel).toHaveLength(7);

    const addresses = panel.map((e) => e.address);
    const unique = new Set(addresses);
    expect(unique.size).toBe(7);
  });

  await test.step("panelFor(guilds[0].id, 4) throws — size below minimum of 5", async () => {
    expect(() => panelFor(guilds[0].id, 4)).toThrow(/5|panel/i);
  });
});
