import { test, expect } from "@playwright/test";
import { setExpertSession, MOCK_EXPERT } from "./helpers/expert-auth";
import {
  MOCK_EXPERT_PROFILE,
  MOCK_REPUTATION_TIMELINE,
  setupReputationMocks,
} from "./helpers/guild-mocks";

test.describe("Expert reputation page", () => {
  test("shows wallet not connected state when no expert session", async ({ page }) => {
    await test.step("mocks are set up to simulate no wallet connection (401 responses)", async () => {
      // Don't set expert session — simulate wallet not connected
      await page.goto("/", { waitUntil: "networkidle" });

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
    });

    await test.step("visitor opens the reputation page without a wallet session", async () => {
      await page.goto("/expert/reputation", { waitUntil: "networkidle" });
    });

    await test.step("the page prompts the visitor to connect their wallet", async () => {
      await expect(page.getByText(/Connect your wallet/i).first()).toBeVisible({ timeout: 15000 });
    });
  });

  test("shows reputation heading and score overview cards", async ({ page }) => {
    await test.step("expert session and reputation mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupReputationMocks(page);
    });

    await test.step("expert opens the reputation page", async () => {
      await page.goto("/expert/reputation", { waitUntil: "networkidle" });
    });

    await test.step("the reputation heading and score overview cards render with correct values", async () => {
      await expect(page.getByText("Reputation").first()).toBeVisible({ timeout: 15000 });
      // Hero ring shows the expert's reputation value (350 from the mocked profile)
      await expect(page.getByText("350").first()).toBeVisible();
      // KPI tiles in the hero card
      await expect(page.getByText("Gains").first()).toBeVisible();
      await expect(page.getByText("Alignment").first()).toBeVisible();
      await expect(page.getByText("Reviews").first()).toBeVisible();
    });
  });

  test("shows reward tier card", async ({ page }) => {
    await test.step("expert session and reputation mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupReputationMocks(page);
    });

    await test.step("expert opens the reputation page", async () => {
      await page.goto("/expert/reputation", { waitUntil: "networkidle" });
      await expect(page.getByText("Reputation").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("the tier display shows the Foundation tier for a 350-point reputation", async () => {
      // Redesigned 3-tier model: Foundation 0-999, Established 1000-1999, Authority 2000+.
      // The hero badge renders "Foundation · 1× rewards" for a 350-rep expert.
      await expect(page.getByText(/Foundation/).first()).toBeVisible();
    });
  });

  test("shows timeline entries with change amounts and reasons", async ({ page }) => {
    await test.step("expert session and reputation mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupReputationMocks(page);
    });

    await test.step("expert opens the reputation page", async () => {
      await page.goto("/expert/reputation", { waitUntil: "networkidle" });
      await expect(page.getByText("Reputation").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("the timeline section lists entries with alignment reasons and candidate names", async () => {
      // The redesigned page renders timeline entries directly (no "Timeline"
      // section heading); assert the entries themselves carry reasons + names.
      await expect(page.getByText("Aligned").first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Alex Smith").first()).toBeVisible();
    });
  });

  test("shows gains and losses summary totals", async ({ page }) => {
    await test.step("expert session and reputation mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupReputationMocks(page);
    });

    await test.step("expert opens the reputation page", async () => {
      await page.goto("/expert/reputation", { waitUntil: "networkidle" });
      await expect(page.getByText("Reputation").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("the gains and losses summary totals match the mocked timeline data", async () => {
      // Gains: +5 + +8 = +13
      await expect(page.getByText("+13").first()).toBeVisible();
      // Losses: -3
      await expect(page.getByText("-3").first()).toBeVisible();
    });
  });

  test("shows alignment percentage", async ({ page }) => {
    await test.step("expert session and reputation mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupReputationMocks(page);
    });

    await test.step("expert opens the reputation page", async () => {
      await page.goto("/expert/reputation", { waitUntil: "networkidle" });
      await expect(page.getByText("Reputation").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("the alignment percentage reflects 2 aligned votes out of 3 total (67%)", async () => {
      await expect(page.getByText("Alignment").first()).toBeVisible();
      // 2 aligned out of 3 total (2 aligned + 1 deviation) = 67%
      await expect(page.getByText("67%").first()).toBeVisible();
    });
  });
});
