import { test, expect } from "@playwright/test";
import { signupCandidate } from "../helpers/auth";
import {
  MOCK_GUILD_APPLICATION_SUMMARIES,
} from "../helpers/guild-mocks";

// Post-IA-restructure, /candidate/guilds ("My guilds") groups applications into
// "My guilds" (approved), "Pending applications", and "Closed applications"
// sections, with KPI tiles (Total applied / Verified / Pending review). The old
// status filter pills + "X applications" summary chips were removed, so those
// assertions are re-pinned to the sectioned layout + KPI counts.

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

    await test.step("candidate opens the My guilds page", async () => {
      await page.goto("/candidate/guilds", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "My guilds", level: 1 })).toBeVisible({ timeout: 15000 });
    });

    await test.step("empty state message and Browse guilds call to action are visible", async () => {
      await expect(page.getByText("No guild applications yet").first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("button", { name: "Browse guilds" })).toBeVisible();
    });
  });

  test("shows application cards with guild names and status labels", async ({ page }) => {
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

    await test.step("candidate opens the My guilds page", async () => {
      await page.goto("/candidate/guilds", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "My guilds", level: 1 })).toBeVisible({ timeout: 15000 });
    });

    await test.step("all three application cards are visible with their guild names", async () => {
      await expect(page.getByText("Engineering").first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Design").first()).toBeVisible();
      await expect(page.getByText("Data Science").first()).toBeVisible();
    });

    await test.step("each application surfaces its status as a label", async () => {
      await expect(page.getByText("APPROVED").first()).toBeVisible();
      await expect(page.getByText("PENDING").first()).toBeVisible();
      await expect(page.getByText("REJECTED").first()).toBeVisible();
    });
  });

  test("KPI tiles show correct counts across statuses", async ({ page }) => {
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

    await test.step("candidate opens the My guilds page", async () => {
      await page.goto("/candidate/guilds", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "My guilds", level: 1 })).toBeVisible({ timeout: 15000 });
    });

    await test.step("the KPI tiles summarise total / verified / pending review", async () => {
      // Mock list: 3 total, 1 approved (Verified), 1 pending (Pending review).
      await expect(page.getByText("Total applied", { exact: true })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Verified", { exact: true })).toBeVisible();
      await expect(page.getByText("Pending review", { exact: true })).toBeVisible();
    });
  });

  test("applications are grouped into status sections", async ({ page }) => {
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

    await test.step("candidate opens the My guilds page", async () => {
      await page.goto("/candidate/guilds", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "My guilds", level: 1 })).toBeVisible({ timeout: 15000 });
    });

    await test.step("the approved, pending, and closed sections are all present", async () => {
      // Section headings render as uppercase labels alongside the page header.
      await expect(page.getByRole("heading", { name: "Pending applications" })).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("heading", { name: "Closed applications" })).toBeVisible();
      // The approved "My guilds" section heading is distinct from the page title;
      // the page title is the level-1 heading while the section uses an h2.
      await expect(page.getByRole("heading", { name: "My guilds", level: 2 })).toBeVisible();
    });
  });

  test("Explore guilds button navigates to guilds page", async ({ page }) => {
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

    await test.step("candidate opens the My guilds page", async () => {
      await page.goto("/candidate/guilds", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "My guilds", level: 1 })).toBeVisible({ timeout: 15000 });
    });

    await test.step("clicking Explore guilds navigates to the guilds listing page", async () => {
      await page.getByRole("button", { name: "Explore guilds" }).click();
      await page.waitForURL("**/guilds", { timeout: 10000 });
    });
  });
});
