import { test, expect } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import { setupEndorsementHistoryMocks } from "./helpers/guild-mocks";

test.describe("Slashing endorsements page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
    await setupEndorsementHistoryMocks(page);
  });

  test("shows Endorsement Marketplace heading", async ({ page }) => {
    await page.goto("/expert/endorsements", { waitUntil: "networkidle" });

    await expect(
      page.getByText("Endorsement Marketplace").first(),
    ).toBeVisible({ timeout: 15000 });
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
