import { test, expect } from "@playwright/test";
import { setExpertSession } from "../helpers/expert-auth";
import { setupSlashingReputationMocks } from "../helpers/guild-mocks";

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

    await test.step("the hero score breakdown tiles (Alignment and Reviews) are visible", async () => {
      // Redesign replaced the Review Accuracy / Consistency cards with hero KPI
      // tiles that break the score down into Alignment and Reviews.
      await expect(page.getByText("Alignment").first()).toBeVisible();
      await expect(page.getByText("Reviews").first()).toBeVisible();
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

    await test.step("the hero gains total and the individual slash losses are shown", async () => {
      // Hero Gains KPI tile aggregates positive changes: +8 (Carol Davis aligned entry).
      await expect(page.getByText("+8").first()).toBeVisible({ timeout: 10000 });
      // Redesign dropped the aggregated losses total from the hero; the losses now
      // surface as individual slash deltas in the timeline: severe -20 and mild -5.
      await expect(page.getByText("-20").first()).toBeVisible();
      await expect(page.getByText("-5").first()).toBeVisible();
    });
  });

  test("shows reward tier Foundation for 350 rep", async ({ page }) => {
    await test.step("expert navigates to the reputation page", async () => {
      await page.goto("/expert/reputation", { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Reputation").first()).toBeVisible({
        timeout: 15000,
      });
    });

    await test.step("the hero banner displays the Foundation tier for a 350-reputation expert", async () => {
      // Redesigned hero badge renders "Foundation · 1× rewards" for a 350-rep expert.
      await expect(page.getByText(/Foundation/).first()).toBeVisible({ timeout: 10000 });
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
