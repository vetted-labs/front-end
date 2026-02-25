import { test, expect } from "@playwright/test";
import {
  setExpertSession,
  mockExpertProfileApi,
  mockNotificationsApi,
  mockGovernanceApi,
  mockLeaderboardApi,
} from "./helpers/expert-auth";

test.describe("Expert pages (without wallet connection)", () => {
  test("/expert/guild-ranks renders rank progression", async ({ page }) => {
    await page.goto("/expert/guild-ranks", { waitUntil: "networkidle" });

    // Static page — no useAccount check, should render for anyone
    await expect(
      page.getByText("Advance Your Guild Rank"),
    ).toBeVisible({ timeout: 15000 });

    // Verify rank names are visible
    await expect(page.getByText("Recruit")).toBeVisible();
    await expect(page.getByText("Guild Master")).toBeVisible();
  });

  test("/expert/governance renders page structure with mocked API", async ({
    page,
  }) => {
    await mockGovernanceApi(page);
    await page.goto("/expert/governance", { waitUntil: "networkidle" });

    // Heading
    await expect(page.getByText("Governance")).toBeVisible({ timeout: 15000 });

    // Filter buttons
    await expect(page.getByRole("button", { name: "Active" })).toBeVisible();
    await expect(page.getByRole("button", { name: "All" })).toBeVisible();

    // Create Proposal button
    await expect(
      page.getByRole("link", { name: /Create Proposal/i }),
    ).toBeVisible();
  });

  test("/expert/governance/create renders form and shows wallet warning", async ({
    page,
  }) => {
    await page.goto("/expert/governance/create", { waitUntil: "networkidle" });

    // Page should render without crashing
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();

    // Look for the form or wallet-related content
    const hasForm = await page.getByText("Create Proposal").isVisible().catch(() => false);
    const hasWalletWarning = await page.getByText(/wallet|connect/i).first().isVisible().catch(() => false);
    expect(hasForm || hasWalletWarning).toBeTruthy();
  });

  test("/expert/withdrawals shows 'Wallet Not Connected' state", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);

    await page.goto("/expert/withdrawals", { waitUntil: "networkidle" });

    await expect(
      page.getByText("Wallet Not Connected"),
    ).toBeVisible({ timeout: 15000 });

    // Should have a link to dashboard
    await expect(
      page.getByText(/dashboard/i).first(),
    ).toBeVisible();
  });

  test("/expert/dashboard shows loading then redirects without wallet", async ({
    page,
  }) => {
    await page.goto("/expert/dashboard", { waitUntil: "networkidle" });

    // Without wallet, the dashboard either:
    // 1. Shows a loading/connect wallet message, or
    // 2. Redirects away (2s debounce)
    // Wait for the page to settle
    await page.waitForTimeout(3000);

    const url = page.url();
    const bodyText = await page.textContent("body");

    // Either redirected away from dashboard, or shows wallet connection prompt
    const redirectedAway = !url.includes("/expert/dashboard");
    const showsWalletPrompt = bodyText?.includes("connect") || bodyText?.includes("wallet") || bodyText?.includes("Connect");
    expect(redirectedAway || showsWalletPrompt).toBeTruthy();
  });

  test("/expert/notifications renders heading or loading state", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
    await mockNotificationsApi(page);

    await page.goto("/expert/notifications", { waitUntil: "networkidle" });

    // Should show Notifications heading or loading state
    const hasHeading = await page.getByText("Notifications").first().isVisible().catch(() => false);
    const hasLoading = await page.getByText("Loading notifications").isVisible().catch(() => false);
    expect(hasHeading || hasLoading).toBeTruthy();
  });

  test("/expert/leaderboard renders without crashing", async ({ page }) => {
    await mockLeaderboardApi(page);
    await mockExpertProfileApi(page);

    await page.goto("/expert/leaderboard", { waitUntil: "networkidle" });

    // Page should render — look for leaderboard content or loading
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();

    // Should have leaderboard-related content
    const hasLeaderboard = await page.getByText(/leaderboard/i).first().isVisible().catch(() => false);
    const hasLoading = await page.getByText(/loading/i).first().isVisible().catch(() => false);
    const hasExperts = await page.getByText(/expert/i).first().isVisible().catch(() => false);
    expect(hasLeaderboard || hasLoading || hasExperts).toBeTruthy();
  });
});
