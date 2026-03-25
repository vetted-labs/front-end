import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";

test.describe("Candidate dashboard page", () => {
  test("displays welcome message with candidate name", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/dashboard", { waitUntil: "networkidle" });

    // Wait for dashboard to load
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Should show welcome message with the candidate's first name
    await expect(page.getByRole("heading", { name: /Welcome back, E2E/ })).toBeVisible({ timeout: 15000 });
  });

  test("shows stat cards for new user", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Verify stat labels are present
    await expect(page.getByText("Applied")).toBeVisible();
    await expect(page.getByText("Pending")).toBeVisible();
    await expect(page.getByText("In Review")).toBeVisible();
    await expect(page.getByText("Accepted")).toBeVisible();
    await expect(page.getByText("Rejected")).toBeVisible();
  });

  test("shows section headings", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    await expect(page.getByText("Recent Applications")).toBeVisible();
    await expect(page.getByText("Guild Applications")).toBeVisible();
    await expect(page.getByText("Messages")).toBeVisible();
    await expect(page.getByText("Quick Actions")).toBeVisible();
  });

  test("shows empty states for new user with no applications", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Recent Applications empty state
    await expect(page.getByText("No applications yet")).toBeVisible();

    // Guild Applications empty state
    await expect(page.getByText("No guild applications")).toBeVisible();

    // Messages empty state
    await expect(page.getByText("No messages yet")).toBeVisible();
  });

  test("quick action buttons are visible", async ({ page }) => {
    await signupCandidate(page);
    await page.goto("/candidate/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    await expect(page.getByRole("link", { name: "Browse Jobs" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Messages" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore Guilds" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit Profile" })).toBeVisible();
  });

  test("fetches dashboard data without API 500 errors", async ({ page }) => {
    await signupCandidate(page);

    // Monitor for API errors
    const apiErrors: { url: string; status: number }[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/") && response.status() >= 500) {
        apiErrors.push({ url: response.url(), status: response.status() });
      }
    });

    await page.goto("/candidate/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // No server errors
    expect(apiErrors).toHaveLength(0);

    // No error toasts should appear
    await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeHidden({ timeout: 3000 });
  });
});
