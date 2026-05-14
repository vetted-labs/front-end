import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";
import {
  MOCK_GUILD_APPLICATION_SUMMARIES,
} from "./helpers/guild-mocks";

test.describe("Candidate guild tracking page", () => {
  test("empty state for new candidate with no applications", async ({ page }) => {
    await test.step("candidate signs up and the guild applications API returns an empty list", async () => {
      await signupCandidate(page);

      await page.route("**/api/candidates/me/guild-applications", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: [] }),
        });
      });
    });

    await test.step("candidate opens the My Guilds page", async () => {
      await page.goto("/candidate/guilds", { waitUntil: "networkidle" });
      await expect(page.getByText("My Guilds").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("empty state message and Browse Guilds call to action are visible", async () => {
      await expect(page.getByText("No guild applications yet").first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("button", { name: /Browse Guilds/i })).toBeVisible();
    });
  });

  test("shows application cards with guild name and status badge", async ({ page }) => {
    await test.step("candidate signs up and the guild applications API returns a list of applications", async () => {
      await signupCandidate(page);

      await page.route("**/api/candidates/me/guild-applications", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: MOCK_GUILD_APPLICATION_SUMMARIES }),
        });
      });
    });

    await test.step("candidate opens the My Guilds page", async () => {
      await page.goto("/candidate/guilds", { waitUntil: "networkidle" });
      await expect(page.getByText("My Guilds").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("all three application cards are visible with their guild names and an application count", async () => {
      await expect(page.getByText("Engineering").first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Design").first()).toBeVisible();
      await expect(page.getByText("Data Science").first()).toBeVisible();
      await expect(page.getByText("3 applications").first()).toBeVisible();
    });
  });

  test("filter pills show correct counts", async ({ page }) => {
    await test.step("candidate signs up and the guild applications API returns a mixed-status list", async () => {
      await signupCandidate(page);

      await page.route("**/api/candidates/me/guild-applications", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: MOCK_GUILD_APPLICATION_SUMMARIES }),
        });
      });
    });

    await test.step("candidate opens the My Guilds page", async () => {
      await page.goto("/candidate/guilds", { waitUntil: "networkidle" });
      await expect(page.getByText("My Guilds").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("filter pills show the correct count for each status", async () => {
      await expect(page.getByText("All (3)").first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Pending (1)").first()).toBeVisible();
      await expect(page.getByText("Approved (1)").first()).toBeVisible();
      await expect(page.getByText("Rejected (1)").first()).toBeVisible();
    });
  });

  test("filter click shows filtered results", async ({ page }) => {
    await test.step("candidate signs up and the guild applications API returns a mixed-status list", async () => {
      await signupCandidate(page);

      await page.route("**/api/candidates/me/guild-applications", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: MOCK_GUILD_APPLICATION_SUMMARIES }),
        });
      });
    });

    await test.step("candidate opens the My Guilds page", async () => {
      await page.goto("/candidate/guilds", { waitUntil: "networkidle" });
      await expect(page.getByText("My Guilds").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("selecting the Pending filter shows only the pending application", async () => {
      await page.getByText("Pending (1)").click();
      await expect(page.getByText("Engineering").first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Design")).not.toBeVisible();
    });

    await test.step("selecting the Approved filter shows only the approved application", async () => {
      await page.getByText("Approved (1)").click();
      await expect(page.getByText("Design").first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Data Science")).not.toBeVisible();
    });
  });

  test("Explore Guilds button navigates to guilds page", async ({ page }) => {
    await test.step("candidate signs up and the guild applications API returns a list of applications", async () => {
      await signupCandidate(page);

      await page.route("**/api/candidates/me/guild-applications", (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: MOCK_GUILD_APPLICATION_SUMMARIES }),
        });
      });
    });

    await test.step("candidate opens the My Guilds page", async () => {
      await page.goto("/candidate/guilds", { waitUntil: "networkidle" });
      await expect(page.getByText("My Guilds").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("clicking Explore Guilds navigates to the guilds listing page", async () => {
      await page.getByText("Explore Guilds").click();
      await page.waitForURL("**/guilds", { timeout: 10000 });
    });
  });
});
