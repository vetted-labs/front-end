import { test, expect } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import {
  MOCK_GUILD,
  setupCommonExpertMocks,
} from "./helpers/guild-mocks";

test.describe("Expert endorsements page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
    await setupCommonExpertMocks(page);

    // Guilds list (avoid matching sub-routes like /guilds/<id>)
    await page.route("**/api/guilds", (route) => {
      if (route.request().url().includes("/guilds/")) return route.fallback();
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [MOCK_GUILD] }),
      });
    });

    // Governance proposals (sidebar)
    await page.route("**/api/governance/proposals**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    // Endorsements
    await page.route("**/api/endorsements/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    // Blockchain endorsement data
    await page.route("**/api/blockchain/endorsement/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });
  });

  test("shows Endorsement Marketplace heading", async ({ page }) => {
    await page.goto("/expert/endorsements", { waitUntil: "networkidle" });

    await expect(
      page.getByText("Endorsement Marketplace").first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("shows Live Market badge", async ({ page }) => {
    await page.goto("/expert/endorsements", { waitUntil: "networkidle" });

    await expect(
      page.getByText("Endorsement Marketplace").first(),
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText("Live Market").first()).toBeVisible();
  });

  test("shows guild selector with Select Guild label", async ({ page }) => {
    await page.goto("/expert/endorsements", { waitUntil: "networkidle" });

    await expect(
      page.getByText("Endorsement Marketplace").first(),
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByText("Select Guild").first()).toBeVisible({ timeout: 10000 });
  });

  test("no error toasts on load", async ({ page }) => {
    await page.goto("/expert/endorsements", { waitUntil: "networkidle" });

    await expect(
      page.getByText("Endorsement Marketplace").first(),
    ).toBeVisible({ timeout: 15000 });

    const errorToasts = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(errorToasts).toHaveCount(0);
  });
});
