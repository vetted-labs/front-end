// Phase 4 (initial): drive a real on-chain transaction through the production
// UI via the wallet shim.
//
// Flow:
//   1. Login as expert via the real UI (Connect Wallet → modal → shim)
//   2. Click "Manage Stake" on the dashboard — opens StakingModal
//   3. Enter a stake amount, click "Stake for Engineering"
//   4. The app calls `usePermitOrApprove` → EIP-712 permit signTypedData_v4
//      (signed by the shim), then `stakeWithPermit` writeContractAsync on
//      ExpertStaking (also signed by the shim)
//   5. Verify the on-chain stake balance increased
//
// This proves the full production write path runs through the shim: EIP-2612
// permit + ExpertStaking.stakeWithPermit. The same `writeContractAsync` +
// `signTypedDataAsync` pipeline backs every other real-tx UI (endorsement
// bidding, commit-reveal, governance proposals, etc.) — once it works here,
// the rest is selector work.

import { test, expect } from "../fixtures";
import { loginAsExpertViaUI } from "../helpers/ui-auth";
import { ANVIL_RPC } from "../helpers/chain";
import {
  createPublicClient,
  http,
  parseAbi,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { sepolia } from "viem/chains";

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

const STAKING_ABI = parseAbi([
  "function getTotalStakedAmount(address expert, bytes32 guildId) view returns (uint256)",
]);

async function readOnChainStake(
  stakingAddress: Address,
  expert: Address,
  guildIdBytes32: Hex,
): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(ANVIL_RPC),
  });
  return (await publicClient.readContract({
    address: stakingAddress,
    abi: STAKING_ABI,
    functionName: "getTotalStakedAmount",
    args: [expert, guildIdBytes32],
  })) as bigint;
}

test("expert stakes VETD via UI → real EIP-2612 permit + on-chain stake tx", async ({
  page,
  experts,
  guild,
  contracts,
  cleanState: _cleanState,
  wallet,
}) => {
  // Forward page-side console + errors to the test output so failures
  // surface useful detail (toast errors, permit rejections, etc.).
  page.on("console", (msg) => {
    const text = msg.text();
    if (/error|fail|reject|insufficient|stake|permit|tx/i.test(text)) {
      console.log(`[page ${msg.type()}]`, text);
    }
  });
  page.on("pageerror", (err) => console.log("[page error]", err.message));
  const expert = experts[0];
  const stakingAddress = contracts.expertStaking.address as Address;
  const guildIdBytes32 = guild.on_chain_guild_id;

  // Baseline: fixture already staked 10 VETD per expert.
  const beforeStake = await readOnChainStake(
    stakingAddress,
    expert.address,
    guildIdBytes32,
  );
  expect(beforeStake).toBeGreaterThan(0n);

  // 1. Login as expert via real UI.
  await wallet.attach(page, expert.privateKey);
  await loginAsExpertViaUI(page, expert.address);

  // Diagnostic: read balance through wagmi to confirm the FE can hit anvil.
  const balanceViaWagmi = await page.evaluate(
    async ([tokenAddr, expertAddr]) => {
      const harness = (
        window as unknown as {
          __wagmiTest?: {
            config: unknown;
            readContract: (
              cfg: unknown,
              args: {
                address: string;
                abi: unknown;
                functionName: string;
                args: unknown[];
              },
            ) => Promise<unknown>;
          };
        }
      ).__wagmiTest;
      if (!harness) return "no harness";
      try {
        const v = await harness.readContract(harness.config, {
          address: tokenAddr,
          abi: [
            {
              type: "function",
              name: "balanceOf",
              stateMutability: "view",
              inputs: [{ name: "a", type: "address" }],
              outputs: [{ name: "", type: "uint256" }],
            },
          ],
          functionName: "balanceOf",
          args: [expertAddr],
          chainId: 11155111,
        });
        return String(v);
      } catch (err) {
        return `error: ${(err as Error).message}`;
      }
    },
    [
      "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      expert.address,
    ] as const,
  );
  console.log("[balance via wagmi]", balanceViaWagmi);

  // Also try the read via window.ethereum (our shim's publicClient passthrough)
  // — this hits anvil directly, bypassing wagmi's transport choice.
  const balanceViaEthereum = await page.evaluate(
    async ([tokenAddr, expertAddr]) => {
      const eth = window.ethereum as { request: (a: { method: string; params: unknown[] }) => Promise<unknown> };
      const data = `0x70a08231${(expertAddr as string).toLowerCase().replace("0x", "").padStart(64, "0")}`;
      try {
        const res = await eth.request({
          method: "eth_call",
          params: [{ to: tokenAddr, data }, "latest"],
        });
        return res;
      } catch (err) {
        return `error: ${(err as Error).message}`;
      }
    },
    [
      "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      expert.address,
    ] as const,
  );
  console.log("[balance via window.ethereum]", balanceViaEthereum);

  // Inspect wagmi state — what chain does it think we're on?
  const wagmiState = await page.evaluate(() => {
    const harness = (
      window as unknown as {
        __wagmiTest?: {
          config: { chains: { id: number; name: string }[] };
          getAccount: (cfg: unknown) => {
            chainId?: number;
            isConnected: boolean;
            address?: string;
          };
        };
      }
    ).__wagmiTest;
    if (!harness) return { error: "no harness" };
    const account = harness.getAccount(harness.config);
    return {
      chains: harness.config.chains.map((c) => `${c.id}:${c.name}`),
      isConnected: account.isConnected,
      address: account.address,
      chainId: account.chainId,
    };
  });
  console.log("[wagmi state]", JSON.stringify(wagmiState));

  // Final diagnostic — read via a fresh viem client built from scratch in
  // the test process to verify localhost:8545 is fine outside wagmi.
  {
    const c = createPublicClient({
      chain: sepolia,
      transport: http(ANVIL_RPC),
    });
    const v = (await c.readContract({
      address: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" as Address,
      abi: [
        {
          type: "function",
          name: "balanceOf",
          stateMutability: "view",
          inputs: [{ name: "a", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
        },
      ],
      functionName: "balanceOf",
      args: [expert.address],
    })) as bigint;
    console.log("[balance via fresh viem]", v.toString());
  }

  // 2. Click "Manage Stake" on the dashboard. The button is rendered by
  //    `ActionButtonPanel` and toggles the StakingModal.
  await page
    .getByRole("button", { name: /manage stake|stake to start vetting/i })
    .first()
    .click();

  // 3. Open the guild selector dropdown and pick our guild. The trigger
  //    button reads "Select guild / Choose a guild to stake for" before
  //    selection; click it, then click the guild name in the list.
  await page
    .getByRole("button", { name: /select guild|choose a guild/i })
    .first()
    .click();
  await page
    .getByRole("button", { name: new RegExp(guild.name, "i") })
    .first()
    .click();

  // 4. Enter the additional stake amount. The input is a `<input type=number>`.
  const stakeAmountVETD = "50";
  const amountInput = page.getByPlaceholder(/min:|0\.00/i).first();
  await amountInput.waitFor({ state: "visible", timeout: 15_000 });
  await amountInput.fill(stakeAmountVETD);

  // 5. Click the stake button — copy is "Stake for <guildName>". Wait a
  //    beat for token-balance and minStake hooks to settle before clicking
  //    so the button's disabled-state isn't a race.
  await page.waitForTimeout(2500);
  const stakeBtn = page.getByRole("button", { name: /stake for/i }).first();
  await expect(stakeBtn).toBeEnabled({ timeout: 10_000 });
  await page.screenshot({ path: "/tmp/before-stake-click.png" });
  await stakeBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/tmp/after-stake-click.png" });

  // Snapshot any toast that appeared
  const toastTexts = await page.locator("[data-sonner-toast] *, [role=status]").allTextContents();
  console.log("[toasts]", JSON.stringify(toastTexts));

  // 5. Wait for the on-chain stake to actually increase. The modal shows a
  //    "Transaction confirmed" or similar state, but rather than rely on UI
  //    copy we poll the chain directly — that's the source of truth.
  const expectedDelta = parseEther(stakeAmountVETD);
  await expect
    .poll(
      async () =>
        await readOnChainStake(stakingAddress, expert.address, guildIdBytes32),
      { timeout: 60_000, intervals: [500, 1_000, 2_000] },
    )
    .toBe(beforeStake + expectedDelta);
});
