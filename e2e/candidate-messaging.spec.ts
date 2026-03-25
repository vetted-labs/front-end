import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";

test.describe("Candidate messages inbox", () => {
  test("shows Messages heading", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/messages", { waitUntil: "networkidle" });

    // Wait for page to load
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible({ timeout: 15000 });
  });

  test("shows empty inbox state for new user", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/messages", { waitUntil: "networkidle" });
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Empty inbox text
    await expect(page.getByText("No messages yet")).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText("When a company reaches out about your application, it will appear here.")
    ).toBeVisible();
  });

  test("fetches messages without API 500 errors", async ({ page }) => {
    await signupCandidate(page);

    // Monitor for API errors
    const apiErrors: { url: string; status: number }[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/") && response.status() >= 500) {
        apiErrors.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto("/candidate/messages", { waitUntil: "networkidle" });
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // No server errors
    expect(apiErrors).toHaveLength(0);

    // No error toasts should appear
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeHidden({ timeout: 3000 });
  });
});
