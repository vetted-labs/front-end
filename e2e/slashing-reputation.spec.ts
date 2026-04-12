import { test, expect } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import { setupSlashingReputationMocks } from "./helpers/guild-mocks";

test.describe("Slashing reputation page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await setExpertSession(page);
    await setupSlashingReputationMocks(page);
  });

  test("shows reputation heading and score", async ({ page }) => {
    await page.goto("/expert/reputation", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Reputation").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("350").first()).toBeVisible();
  });

  test("shows score breakdown cards", async ({ page }) => {
    await page.goto("/expert/reputation", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Reputation").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Review Accuracy").first()).toBeVisible();
    await expect(page.getByText("Consistency").first()).toBeVisible();
  });

  test("shows timeline with slash entries", async ({ page }) => {
    await page.goto("/expert/reputation", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Reputation").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Slashed Expert Test").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("-20").first()).toBeVisible();
    await expect(page.getByText("Mild Slash Test").first()).toBeVisible();
    await expect(page.getByText("Carol Davis").first()).toBeVisible();
  });

  test("shows gains and losses summary", async ({ page }) => {
    await page.goto("/expert/reputation", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Reputation").first()).toBeVisible({
      timeout: 15000,
    });
    // Gains: +8 (Carol Davis aligned entry)
    await expect(page.getByText("+8").first()).toBeVisible({ timeout: 10000 });
    // Losses: -25 (severe -20 + mild -5)
    await expect(page.getByText("-25").first()).toBeVisible();
  });

  test("shows reward tier Foundation for 350 rep", async ({ page }) => {
    await page.goto("/expert/reputation", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Reputation").first()).toBeVisible({
      timeout: 15000,
    });
    // Hero shows "FOUNDATION TIER" (tier.name.toUpperCase() + " TIER")
    await expect(page.getByText("FOUNDATION TIER").first()).toBeVisible({ timeout: 10000 });
  });

  test("no error toasts on load", async ({ page }) => {
    await page.goto("/expert/reputation", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Reputation").first()).toBeVisible({
      timeout: 15000,
    });

    const errorToasts = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(errorToasts).toHaveCount(0);
  });
});
