import { test, expect } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import {
  MOCK_APPLICATION_ACTIVE,
  MOCK_APPLICATION_FINALIZED,
  MOCK_STAKING_NOT_MET,
  setupVotingQueueMocks,
} from "./helpers/guild-mocks";

test.describe("Expert voting queue page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
  });

  test("shows page heading and guild selector", async ({ page }) => {
    await setupVotingQueueMocks(page);
    await page.goto("/expert/voting", { waitUntil: "networkidle" });

    await expect(page.getByText("Guild Applications & Voting").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Select Guild").first()).toBeVisible();
  });

  test("shows staking warning when insufficient stake", async ({ page }) => {
    await setupVotingQueueMocks(page, { stakingStatus: MOCK_STAKING_NOT_MET });
    await page.goto("/expert/voting", { waitUntil: "networkidle" });

    await expect(page.getByText("Guild Applications & Voting").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Staking Required to Vote").first()).toBeVisible({ timeout: 10000 });
  });

  test("shows Assigned to Me and All Applications filter tabs", async ({ page }) => {
    await setupVotingQueueMocks(page);
    await page.goto("/expert/voting", { waitUntil: "networkidle" });

    await expect(page.getByText("Guild Applications & Voting").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /Assigned to Me/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /All Applications/i })).toBeVisible();
  });

  test("application cards show candidate name and deadline info", async ({ page }) => {
    await setupVotingQueueMocks(page);
    await page.goto("/expert/voting", { waitUntil: "networkidle" });

    await expect(page.getByText("Guild Applications & Voting").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 10000 });
  });

  test("shows Assigned Reviewer badge on assigned applications", async ({ page }) => {
    await setupVotingQueueMocks(page);
    await page.goto("/expert/voting", { waitUntil: "networkidle" });

    await expect(page.getByText("Guild Applications & Voting").first()).toBeVisible({ timeout: 15000 });
    // Default filter is "Assigned to Me" — wait for it to appear and data to load
    await expect(page.getByRole("button", { name: /Assigned to Me/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Assigned Reviewer/i).first()).toBeVisible();
  });

  test("empty state when no applications", async ({ page }) => {
    await setupVotingQueueMocks(page, { applications: [], assignedApplications: [] });
    await page.goto("/expert/voting", { waitUntil: "networkidle" });

    await expect(page.getByText("Guild Applications & Voting").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/No active applications/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("View Details button is present on application cards", async ({ page }) => {
    await setupVotingQueueMocks(page);
    await page.goto("/expert/voting", { waitUntil: "networkidle" });

    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /View Details/i }).first()).toBeVisible();
  });

  test("lock/Stake Required shown when staking insufficient", async ({ page }) => {
    await setupVotingQueueMocks(page, { stakingStatus: MOCK_STAKING_NOT_MET });
    await page.goto("/expert/voting", { waitUntil: "networkidle" });

    await expect(page.getByText("Guild Applications & Voting").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Stake Required/i).first()).toBeVisible();
  });
});
