import { test, expect } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import {
  MOCK_EARNINGS_BREAKDOWN,
  setupEarningsMocks,
} from "./helpers/guild-mocks";

test.describe("Expert earnings page", () => {
  test("shows wallet not connected state when no expert session", async ({ page }) => {
    await test.step("mocks are set up to simulate no wallet connection", async () => {
      await page.goto("/", { waitUntil: "networkidle" });

      await page.route("**/api/experts/profile**", (route) => {
        route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) });
      });
      await page.route("**/api/experts/earnings/breakdown**", (route) => {
        route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) });
      });
      await page.route("**/api/governance/proposals**", (route) => {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
      });
      await page.route("**/api/experts/*/notifications**", (route) => {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { notifications: [], unreadCount: 0 } }) });
      });
    });

    await test.step("expert opens the earnings page without a wallet session", async () => {
      await page.goto("/expert/earnings", { waitUntil: "networkidle" });
    });

    await test.step("the page prompts the expert to connect their wallet", async () => {
      await expect(page.getByText(/Connect your wallet/i).first()).toBeVisible({ timeout: 15000 });
    });
  });

  test("shows earnings heading and summary cards", async ({ page }) => {
    await test.step("expert session and earnings mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupEarningsMocks(page);
    });

    await test.step("expert opens the earnings page", async () => {
      await page.goto("/expert/earnings", { waitUntil: "networkidle" });
    });

    await test.step("the earnings heading and summary cards render with correct totals", async () => {
      await expect(page.getByText("Earnings").first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Total Earned").first()).toBeVisible();
      await expect(page.getByText("42.50").first()).toBeVisible();
      await expect(page.getByText("Voting").first()).toBeVisible();
      await expect(page.getByText("Endorsements").first()).toBeVisible();
    });
  });

  test("shows time range filter buttons", async ({ page }) => {
    await test.step("expert session and earnings mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupEarningsMocks(page);
    });

    await test.step("expert opens the earnings page", async () => {
      await page.goto("/expert/earnings", { waitUntil: "networkidle" });
      await expect(page.getByText("Earnings").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("all four time range filter buttons are visible", async () => {
      await expect(page.getByRole("button", { name: "All Time" })).toBeVisible();
      await expect(page.getByRole("button", { name: "24h" })).toBeVisible();
      await expect(page.getByRole("button", { name: "7d" })).toBeVisible();
      await expect(page.getByRole("button", { name: "30d" })).toBeVisible();
    });
  });

  test("time range filter buttons trigger API refetch", async ({ page }) => {
    let fetchCount = 0;

    await test.step("expert session and earnings mocks are set up with a fetch counter", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupEarningsMocks(page);

      await page.route("**/api/experts/earnings/breakdown**", (route) => {
        fetchCount++;
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: MOCK_EARNINGS_BREAKDOWN }),
        });
      });
    });

    await test.step("expert opens the earnings page and waits for initial load", async () => {
      await page.goto("/expert/earnings", { waitUntil: "networkidle" });
      await expect(page.getByText("Earnings").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("expert clicks the 7d filter and a new API call is made", async () => {
      const initialCount = fetchCount;

      await page.getByRole("button", { name: "7d" }).click();
      await page.waitForTimeout(1000);

      expect(fetchCount).toBeGreaterThan(initialCount);
    });
  });

  test("shows How Earnings Work section", async ({ page }) => {
    await test.step("expert session and earnings mocks are set up", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
      await setupEarningsMocks(page);
    });

    await test.step("expert opens the earnings page", async () => {
      await page.goto("/expert/earnings", { waitUntil: "networkidle" });
      await expect(page.getByText("Earnings").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("the How Earnings Work explanatory section is visible", async () => {
      await expect(page.getByText(/How Earnings Work/i).first()).toBeVisible({ timeout: 10000 });
    });
  });
});
