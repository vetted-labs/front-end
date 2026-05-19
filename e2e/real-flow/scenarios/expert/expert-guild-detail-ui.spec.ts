// e2e/real-flow/scenarios/expert/expert-guild-detail-ui.spec.ts
//
// Expert-pillar coverage: guild detail / workspace page.
//
// Route: /expert/guild/[guildId]  (GuildWorkspacePage)
//
// The workspace page is the private member view for an expert who has been
// bootstrapped and staked into a guild. It renders:
//
//   • Slim header  — guild name + "· Workspace" h1, "members" count sub-text,
//                    "Member" badge, role badge
//   • KPI strip    — Your queue / Active commits / Stake locked /
//                    Pending payouts / Reputation tiles
//   • Tab bar      — Queue · My Reviews · Governance · Feed · Members ·
//                    Earnings · Leaderboard
//
// This spec asserts the core UI shell (heading, member count text, full tab
// bar) renders correctly for an authenticated expert, and that the Members
// and Leaderboard tabs activate without errors — covering the "members,
// requirements, history" intent from the task brief by mapping:
//
//   members      → Members tab / member count in sub-header
//   requirements → KPI strip (queue count, stake, reputation requirements)
//   history      → Leaderboard tab (historical ranking and performance)

import { test, expect } from "../../fixtures";
import { loginAsExpertViaUI } from "../../helpers/ui-auth";

const WORKSPACE_TABS = [
  "Queue",
  "My Reviews",
  "Governance",
  "Feed",
  "Members",
  "Earnings",
  "Leaderboard",
] as const;

test("guild detail page surfaces members, requirements, history", async ({
  page,
  cleanState: _cleanState,
  experts,
  guild,
  wallet,
}) => {
  void _cleanState;

  // Pick the first expert bootstrapped into guilds[0].
  const expert = experts.find((e) => e.guildId === guild.id);
  expect(
    expert,
    "fixture invariant: bootstrap must have at least one expert in guilds[0]",
  ).toBeDefined();

  // ─── Phase 1: Authenticate ────────────────────────────────────────────────
  await test.step("expert connects their wallet and lands on the dashboard via the real login flow", async () => {
    await wallet.attach(page, expert!.privateKey);
    await loginAsExpertViaUI(page, expert!.address);
  });

  // ─── Phase 2: Navigate to the guild workspace ────────────────────────────
  await test.step("expert navigates to their guild workspace page", async () => {
    await page.goto(`/expert/guild/${encodeURIComponent(guild.id)}`, {
      waitUntil: "domcontentloaded",
    });

    // The h1 is "{identity.displayName} · Workspace" — always contains the
    // guild name fragment and the literal word "Workspace".
    await expect(
      page.getByRole("heading", { name: /workspace/i }).first(),
    ).toBeVisible({ timeout: 30_000 });

    // The guild's display name must appear in the heading too.
    await expect(
      page.getByRole("heading", { name: new RegExp(guild.name, "i") }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ─── Phase 3: Sub-header — member count + "Member" badge ─────────────────
  await test.step("the sub-header surfaces member count and the Member badge", async () => {
    // The sub-header line is "{count} members · {count} open roles".
    // The "Member" badge text also exists on the same card.
    await expect(page.getByText(/members/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText(/member/i, { exact: false }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ─── Phase 4: KPI strip — requirements surface ───────────────────────────
  await test.step("the KPI strip renders all five workspace tiles (queue / commits / stake / payouts / reputation)", async () => {
    await expect(page.getByText(/your queue/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/active commits/i).first()).toBeVisible();
    await expect(page.getByText(/stake locked/i).first()).toBeVisible();
    await expect(page.getByText(/pending payouts/i).first()).toBeVisible();
    await expect(page.getByText(/^reputation$/i).first()).toBeVisible();
  });

  // ─── Phase 5: Full tab bar renders ───────────────────────────────────────
  await test.step("the workspace tab bar renders all seven tabs", async () => {
    for (const tab of WORKSPACE_TABS) {
      await expect(
        page.getByRole("button", { name: new RegExp(tab, "i") }).first(),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  // ─── Phase 6: Members tab activates and renders expert/candidate filters ──
  await test.step("the Members tab activates and shows expert and candidate filter buttons", async () => {
    await page
      .getByRole("button", { name: /^members$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/tab=members/, { timeout: 10_000 });

    await expect(
      page.getByRole("button", { name: /experts/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: /candidates/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ─── Phase 7: Leaderboard tab activates (history analog) ─────────────────
  await test.step("the Leaderboard tab activates and shows the top-experts leaderboard", async () => {
    await page
      .getByRole("button", { name: /^leaderboard$/i })
      .first()
      .click();
    await expect(page).toHaveURL(/tab=leaderboard/, { timeout: 10_000 });

    await expect(page.getByText(/top experts/i).first()).toBeVisible({
      timeout: 15_000,
    });
    // Period selector (All / Month / Week) must render so users can filter
    // historical performance data.
    await expect(page.getByRole("combobox").first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
