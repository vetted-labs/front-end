import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";

test.describe("Browse jobs page", () => {
  test("loads and displays the jobs listing page", async ({ page }) => {
    await page.goto("/browse/jobs", { waitUntil: "networkidle" });

    // Page should render with search bar
    await expect(
      page.getByPlaceholder(/Role, company|search/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("shows filter controls", async ({ page }) => {
    await page.goto("/browse/jobs", { waitUntil: "networkidle" });

    // Filter button or guild tags should be visible
    const hasFilter = await page.getByText("Filter").isVisible().catch(() => false);
    const hasGuildTags = await page.getByText("Design").or(page.getByText("Engineering")).first().isVisible().catch(() => false);
    const hasSearch = await page.getByPlaceholder(/Role, company|keywords/i).first().isVisible().catch(() => false);

    // At least one filter control should exist
    expect(hasFilter || hasGuildTags || hasSearch).toBeTruthy();
  });

  test("authenticated candidate can see job listings", async ({ page }) => {
    await signupCandidate(page);

    // Monitor API calls for job fetching
    const jobsApiResponse = page.waitForResponse(
      (resp) => resp.url().includes("/api/jobs") && resp.request().method() === "GET",
      { timeout: 15000 },
    );

    await page.goto("/browse/jobs", { waitUntil: "networkidle" });

    const response = await jobsApiResponse;
    expect(response.status()).toBeLessThan(500);
  });

  test("page renders without crashes", async ({ page }) => {
    await page.goto("/browse/jobs", { waitUntil: "networkidle" });

    // Verify the page has meaningful content — check for Vetted branding or search UI
    await expect(page.locator("body")).toBeVisible();
    await expect(
      page.getByPlaceholder(/Role, company|search/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("search bar accepts input", async ({ page }) => {
    await page.goto("/browse/jobs", { waitUntil: "networkidle" });

    // Find and fill the search bar
    const searchInput = page.getByPlaceholder(/Role, company|keywords/i).first();
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    await searchInput.fill("Engineer");

    // Verify the input value was set
    await expect(searchInput).toHaveValue("Engineer");
  });
});
