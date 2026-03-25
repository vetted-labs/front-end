import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";

test.describe("Candidate notifications page", () => {
  test("shows Notifications heading", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/notifications", { waitUntil: "networkidle" });

    // Wait for page to load
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible({ timeout: 15000 });
  });

  test("shows filter tabs: All, Unread, Applications, Messages", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/notifications", { waitUntil: "networkidle" });
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Filter tab buttons
    await expect(page.getByRole("button", { name: /^All/ })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /^Unread/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Applications/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Messages/ })).toBeVisible();
  });

  test("shows empty state for new user", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/notifications", { waitUntil: "networkidle" });
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Empty state
    await expect(page.getByText("No notifications")).toBeVisible({ timeout: 15000 });
  });

  test("fetches notifications without API 500 errors", async ({ page }) => {
    await signupCandidate(page);

    // Monitor for API errors
    const apiErrors: { url: string; status: number }[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/") && response.status() >= 500) {
        apiErrors.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto("/candidate/notifications", { waitUntil: "networkidle" });
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // No server errors
    expect(apiErrors).toHaveLength(0);

    // No error toasts should appear
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeHidden({ timeout: 3000 });
  });
});
