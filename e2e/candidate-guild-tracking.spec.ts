import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";
import {
  MOCK_GUILD_APPLICATION_SUMMARIES,
} from "./helpers/guild-mocks";

test.describe("Candidate guild tracking page", () => {
  test("empty state for new candidate with no applications", async ({ page }) => {
    await signupCandidate(page);

    // Mock guild applications API to return empty array
    await page.route("**/api/candidates/me/guild-applications", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto("/candidate/guilds", { waitUntil: "networkidle" });

    await expect(page.getByText("My Guilds").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("No guild applications yet").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Browse Guilds/i })).toBeVisible();
  });

  test("shows application cards with guild name and status badge", async ({ page }) => {
    await signupCandidate(page);

    await page.route("**/api/candidates/me/guild-applications", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_GUILD_APPLICATION_SUMMARIES }),
      });
    });

    await page.goto("/candidate/guilds", { waitUntil: "networkidle" });

    await expect(page.getByText("My Guilds").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Engineering").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Design").first()).toBeVisible();
    await expect(page.getByText("Data Science").first()).toBeVisible();
    // Count should show
    await expect(page.getByText("3 applications").first()).toBeVisible();
  });

  test("filter pills show correct counts", async ({ page }) => {
    await signupCandidate(page);

    await page.route("**/api/candidates/me/guild-applications", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_GUILD_APPLICATION_SUMMARIES }),
      });
    });

    await page.goto("/candidate/guilds", { waitUntil: "networkidle" });

    await expect(page.getByText("My Guilds").first()).toBeVisible({ timeout: 15000 });
    // Filter pills with counts
    await expect(page.getByText("All (3)").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Pending (1)").first()).toBeVisible();
    await expect(page.getByText("Approved (1)").first()).toBeVisible();
    await expect(page.getByText("Rejected (1)").first()).toBeVisible();
  });

  test("filter click shows filtered results", async ({ page }) => {
    await signupCandidate(page);

    await page.route("**/api/candidates/me/guild-applications", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_GUILD_APPLICATION_SUMMARIES }),
      });
    });

    await page.goto("/candidate/guilds", { waitUntil: "networkidle" });

    await expect(page.getByText("My Guilds").first()).toBeVisible({ timeout: 15000 });

    // Click "Pending" filter
    await page.getByText("Pending (1)").click();
    await expect(page.getByText("Engineering").first()).toBeVisible({ timeout: 5000 });
    // Design (approved) should not be visible
    await expect(page.getByText("Design")).not.toBeVisible();

    // Click "Approved" filter
    await page.getByText("Approved (1)").click();
    await expect(page.getByText("Design").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Data Science")).not.toBeVisible();
  });

  test("Explore Guilds button navigates to guilds page", async ({ page }) => {
    await signupCandidate(page);

    await page.route("**/api/candidates/me/guild-applications", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_GUILD_APPLICATION_SUMMARIES }),
      });
    });

    await page.goto("/candidate/guilds", { waitUntil: "networkidle" });

    await expect(page.getByText("My Guilds").first()).toBeVisible({ timeout: 15000 });

    await page.getByText("Explore Guilds").click();
    await page.waitForURL("**/guilds", { timeout: 10000 });
  });
});
