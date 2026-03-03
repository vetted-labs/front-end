import { test, expect } from "@playwright/test";
import { setExpertSession, MOCK_EXPERT } from "./helpers/expert-auth";
import {
  MOCK_EXPERT_PROFILE,
  MOCK_REPUTATION_TIMELINE,
  setupReputationMocks,
} from "./helpers/guild-mocks";

test.describe("Expert reputation page", () => {
  test("shows wallet not connected state when no expert session", async ({ page }) => {
    // Don't set expert session — simulate wallet not connected
    await page.goto("/", { waitUntil: "networkidle" });

    // Set up mocks that would return 401 (mimics no wallet)
    await page.route("**/api/experts/profile**", (route) => {
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) });
    });
    await page.route("**/api/experts/reputation/timeline**", (route) => {
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) });
    });
    await page.route("**/api/governance/proposals**", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
    });
    await page.route("**/api/experts/*/notifications**", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { notifications: [], unreadCount: 0 } }) });
    });

    await page.goto("/expert/reputation", { waitUntil: "networkidle" });

    await expect(page.getByText(/Connect your wallet/i).first()).toBeVisible({ timeout: 15000 });
  });

  test("shows reputation heading and score overview cards", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
    await setupReputationMocks(page);

    await page.goto("/expert/reputation", { waitUntil: "networkidle" });

    await expect(page.getByText("Reputation").first()).toBeVisible({ timeout: 15000 });
    // Score card shows the expert's reputation value
    await expect(page.getByText("Score").first()).toBeVisible();
    await expect(page.getByText("350").first()).toBeVisible();
    // Gains card
    await expect(page.getByText("Gained").first()).toBeVisible();
    // Losses card
    await expect(page.getByText("Lost").first()).toBeVisible();
  });

  test("shows reward tier card", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
    await setupReputationMocks(page);

    await page.goto("/expert/reputation", { waitUntil: "networkidle" });

    await expect(page.getByText("Reputation").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Reward Tier").first()).toBeVisible();
    // With reputation 350, should be "Established" tier (101-500)
    await expect(page.getByText("Established").first()).toBeVisible();
  });

  test("shows timeline entries with change amounts and reasons", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
    await setupReputationMocks(page);

    await page.goto("/expert/reputation", { waitUntil: "networkidle" });

    await expect(page.getByText("Reputation").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Timeline").first()).toBeVisible({ timeout: 10000 });
    // Check for timeline entries
    await expect(page.getByText("Aligned").first()).toBeVisible();
    await expect(page.getByText("Alex Smith").first()).toBeVisible();
  });

  test("shows gains and losses summary totals", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
    await setupReputationMocks(page);

    await page.goto("/expert/reputation", { waitUntil: "networkidle" });

    await expect(page.getByText("Reputation").first()).toBeVisible({ timeout: 15000 });
    // Gains: +5 + +8 = +13
    await expect(page.getByText("+13").first()).toBeVisible();
    // Losses: -3
    await expect(page.getByText("-3").first()).toBeVisible();
  });

  test("shows alignment percentage", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
    await setupReputationMocks(page);

    await page.goto("/expert/reputation", { waitUntil: "networkidle" });

    await expect(page.getByText("Reputation").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Alignment").first()).toBeVisible();
    // 2 aligned out of 3 total (2 aligned + 1 deviation) = 67%
    await expect(page.getByText("67%").first()).toBeVisible();
  });
});
