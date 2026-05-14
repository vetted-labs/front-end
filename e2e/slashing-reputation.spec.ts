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
    await test.step("expert navigates to the reputation page", async () => {
      await page.goto("/expert/reputation", { waitUntil: "domcontentloaded" });
    });

    await test.step("the reputation heading and overall score of 350 are visible", async () => {
      await expect(page.getByText("Reputation").first()).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText("350").first()).toBeVisible();
    });
  });

  test("shows score breakdown cards", async ({ page }) => {
    await test.step("expert navigates to the reputation page", async () => {
      await page.goto("/expert/reputation", { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Reputation").first()).toBeVisible({
        timeout: 15000,
      });
    });

    await test.step("the Review Accuracy and Consistency breakdown cards are visible", async () => {
      await expect(page.getByText("Review Accuracy").first()).toBeVisible();
      await expect(page.getByText("Consistency").first()).toBeVisible();
    });
  });

  test("shows timeline with slash entries", async ({ page }) => {
    await test.step("expert navigates to the reputation page", async () => {
      await page.goto("/expert/reputation", { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Reputation").first()).toBeVisible({
        timeout: 15000,
      });
    });

    await test.step("the reputation timeline renders slash entries for each reviewed candidate", async () => {
      await expect(page.getByText("Slashed Expert Test").first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("-20").first()).toBeVisible();
      await expect(page.getByText("Mild Slash Test").first()).toBeVisible();
      await expect(page.getByText("Carol Davis").first()).toBeVisible();
    });
  });

  test("shows gains and losses summary", async ({ page }) => {
    await test.step("expert navigates to the reputation page", async () => {
      await page.goto("/expert/reputation", { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Reputation").first()).toBeVisible({
        timeout: 15000,
      });
    });

    await test.step("the summary shows +8 total gains and -25 total losses", async () => {
      // Gains: +8 (Carol Davis aligned entry)
      await expect(page.getByText("+8").first()).toBeVisible({ timeout: 10000 });
      // Losses: -25 (severe -20 + mild -5)
      await expect(page.getByText("-25").first()).toBeVisible();
    });
  });

  test("shows reward tier Foundation for 350 rep", async ({ page }) => {
    await test.step("expert navigates to the reputation page", async () => {
      await page.goto("/expert/reputation", { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Reputation").first()).toBeVisible({
        timeout: 15000,
      });
    });

    await test.step("the hero banner displays FOUNDATION TIER for a 350-reputation expert", async () => {
      // Hero shows "FOUNDATION TIER" (tier.name.toUpperCase() + " TIER")
      await expect(page.getByText("FOUNDATION TIER").first()).toBeVisible({ timeout: 10000 });
    });
  });

  test("no error toasts on load", async ({ page }) => {
    await test.step("expert navigates to the reputation page", async () => {
      await page.goto("/expert/reputation", { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Reputation").first()).toBeVisible({
        timeout: 15000,
      });
    });

    await test.step("no error toasts appear after the page settles", async () => {
      const errorToasts = page.locator('[data-sonner-toast][data-type="error"]');
      await expect(errorToasts).toHaveCount(0);
    });
  });
});
