import { test, expect } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import { setupDashboardWithVoteWeight } from "./helpers/guild-mocks";

test.describe("Dashboard vote weight with high reputation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await setExpertSession(page);
    await setupDashboardWithVoteWeight(page);
  });

  test("shows expert dashboard loads", async ({ page }) => {
    await page.goto("/expert/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Dashboard").first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("shows vote weight 2.5 from 1500 reputation", async ({ page }) => {
    await page.goto("/expert/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Dashboard").first()).toBeVisible({
      timeout: 15000,
    });

    // 1500 rep → weight = 1 × (1 + min(1500/1000, 2.0)) = 2.5×
    // Display may be "2.5×" or "2.50×"
    await expect(
      page.getByText("2.50×").first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows reward tier Established for 1500 reputation", async ({
    page,
  }) => {
    await page.goto("/expert/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Dashboard").first()).toBeVisible({
      timeout: 15000,
    });

    await expect(page.getByText("Established").first()).toBeVisible();
  });

  test("no error toasts on load", async ({ page }) => {
    await page.goto("/expert/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Dashboard").first()).toBeVisible({
      timeout: 15000,
    });

    // Sonner toasts use [data-sonner-toast] with data-type="error"
    const errorToasts = page.locator(
      '[data-sonner-toast][data-type="error"]',
    );
    await expect(errorToasts).toHaveCount(0);
  });
});
