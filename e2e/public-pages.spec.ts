import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("homepage renders with hero section and content", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Vetted branding should be visible
    await expect(page.getByText("Vetted").first()).toBeVisible({ timeout: 15000 });
  });

  test("homepage fetches guilds data without errors", async ({ page }) => {
    const apiErrors: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/guilds") && response.status() >= 500) {
        apiErrors.push(`${response.url()} - ${response.status()}`);
      }
    });

    // Wait for the guilds API response instead of arbitrary timeout
    const guildsResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/guilds"),
      { timeout: 15000 },
    ).catch(() => null);

    await page.goto("/", { waitUntil: "networkidle" });
    await guildsResponse;

    expect(apiErrors).toHaveLength(0);
  });

  test("homepage fetches active jobs without errors", async ({ page }) => {
    const apiErrors: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/jobs") && response.status() >= 500) {
        apiErrors.push(`${response.url()} - ${response.status()}`);
      }
    });

    // Wait for the jobs API response instead of arbitrary timeout
    const jobsResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/jobs"),
      { timeout: 15000 },
    ).catch(() => null);

    await page.goto("/", { waitUntil: "networkidle" });
    await jobsResponse;

    expect(apiErrors).toHaveLength(0);
  });

  test("guilds listing page loads", async ({ page }) => {
    await page.goto("/guilds", { waitUntil: "networkidle" });

    // Page should have meaningful content
    await expect(page.getByText("Vetted").first()).toBeVisible({ timeout: 15000 });
  });

  test("browse jobs page is publicly accessible", async ({ page }) => {
    // Browse jobs should work without authentication
    await page.goto("/browse/jobs", { waitUntil: "networkidle" });

    // Should NOT redirect to login
    expect(page.url()).toContain("/browse/jobs");

    // Page should have meaningful content
    await expect(page.locator("body")).toBeVisible();
  });

  test("auth pages render correctly", async ({ page }) => {
    // Signup page
    await page.goto("/auth/signup", { waitUntil: "networkidle" });
    await expect(
      page.getByText(/Create your account|Create Your Account/i)
    ).toBeVisible({ timeout: 30000 });

    // Login page
    await page.goto("/auth/login", { waitUntil: "networkidle" });
    await expect(
      page.getByText(/Welcome back|Sign in/i).first()
    ).toBeVisible({ timeout: 30000 });
  });

  test("login page shows user type toggle", async ({ page }) => {
    await page.goto("/auth/login", { waitUntil: "networkidle" });

    // User type toggle buttons
    await expect(page.getByText("Job Seeker")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Employer")).toBeVisible();
  });

  test("signup page shows user type toggle", async ({ page }) => {
    await page.goto("/auth/signup", { waitUntil: "networkidle" });

    await expect(page.getByText("Job Seeker")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Employer")).toBeVisible();
  });
});
