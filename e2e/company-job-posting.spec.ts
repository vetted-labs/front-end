import { test, expect, type Page } from "@playwright/test";
import { signupCompany } from "./helpers/company-auth";

/**
 * The "post a job" flow is now a 7-step wizard (src/components/JobForm.tsx +
 * src/hooks/useJobWizard.ts). Steps:
 *   1 The role         — title, experience level, employment type, top skills
 *   2 Where/how much   — work model, location, compensation
 *   3 Description      — markdown description + requirements
 *   4 Guild            — assign a reviewing guild (modal picker)
 *   5 Questions        — optional
 *   6 Attachments      — optional
 *   7 Review           — Publish job
 *
 * The footer exposes Back / Continue, with Continue swapping to "Publish job"
 * on the final step. Publishing redirects to /dashboard/jobs.
 */

async function gotoJobWizard(page: Page) {
  await page.goto("/jobs/new", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "The role" })
  ).toBeVisible({ timeout: 15000 });
  // The wizard autosaves a draft and restores it on mount, which can
  // asynchronously reset fields the test just typed. Clear any persisted
  // draft and reload so the wizard mounts from a clean INITIAL_FORM with no
  // pending restore to race against the test's input.
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("vetted:draft:"))
      .forEach((k) => localStorage.removeItem(k));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "The role" })
  ).toBeVisible({ timeout: 15000 });
}

async function fillStepRole(page: Page) {
  // The wizard autosaves/restores a draft and can asynchronously reset fields
  // mid-fill right after hydration. Fill the whole step and advance as a single
  // retried unit: if anything got reset, re-fill and retry until the wizard
  // actually leaves step 1 (the step-2 heading appears).
  const title = page.getByPlaceholder("e.g. Senior Frontend Engineer");
  const skillInput = page.getByPlaceholder("Type to search — Node, Python, AWS, …");
  await expect(async () => {
    await page.getByRole("radio", { name: "Senior" }).click();
    await page.getByRole("radio", { name: "Full-time" }).click();
    if (!(await page.getByRole("button", { name: "Remove Playwright" }).isVisible())) {
      await skillInput.click();
      await skillInput.fill("Playwright");
      await skillInput.press("Enter");
    }
    await title.fill("E2E Test Engineer");
    await expect(title).toHaveValue("E2E Test Engineer", { timeout: 1000 });
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByRole("heading", { name: "Where and how much" })
    ).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20000 });
}

async function fillStepLocationComp(page: Page) {
  await page.getByRole("radio", { name: "Remote" }).click();
  await page.getByPlaceholder("e.g. Berlin · Remote-friendly").fill("Remote");
  await page.getByPlaceholder("140,000").fill("120000");
  await page.getByPlaceholder("185,000").fill("160000");
}

async function fillStepDescription(page: Page) {
  await page
    .getByPlaceholder("## About the role")
    .fill(
      "This is an E2E test job posting created by Playwright automated tests. " +
        "The role involves testing web applications and ensuring quality standards are met."
    );
  const reqInput = page.getByPlaceholder("Add a requirement, press Enter…");
  await reqInput.fill("3+ years testing experience");
  await reqInput.press("Enter");
}

async function fillStepGuild(page: Page) {
  await page.getByRole("button", { name: "Choose guild" }).click();
  // Pick the first guild card inside the picker modal, then confirm.
  await page.getByRole("button", { name: /experts$/ }).first().click();
  await page.getByRole("button", { name: "Assign guild" }).click();
  await expect(page.getByText("Assigned guild")).toBeVisible();
}

async function continueWizard(page: Page) {
  await page.getByRole("button", { name: "Continue" }).click();
}

test.describe("Company job posting", () => {
  test("navigates to the job creation wizard from the dashboard", async ({ page }) => {
    await test.step("company signs up and lands on the dashboard", async () => {
      await signupCompany(page);
      await page.waitForURL("**/dashboard", { timeout: 15000 });
    });

    await test.step("company clicks Post New Job and reaches the job wizard", async () => {
      await page.getByRole("link", { name: /Post New Job/i }).first().click();
      await page.waitForURL("**/jobs/new", { timeout: 10000 });
      await expect(
        page.getByRole("heading", { name: "The role" })
      ).toBeVisible();
    });
  });

  test("creates a job posting through the full wizard", async ({ page }) => {
    await test.step("company signs up and opens the job wizard", async () => {
      await signupCompany(page);
      await gotoJobWizard(page);
    });

    await test.step("company completes step 1 — the role", async () => {
      // fillStepRole fills step 1 and advances to step 2 as a retried unit.
      await fillStepRole(page);
    });

    await test.step("company completes step 2 — location and compensation", async () => {
      await fillStepLocationComp(page);
      await continueWizard(page);
    });

    await test.step("company completes step 3 — description and requirements", async () => {
      await fillStepDescription(page);
      await continueWizard(page);
    });

    await test.step("company assigns a reviewing guild in step 4", async () => {
      await expect(
        page.getByRole("heading", { name: "Pick the guild that owns review", exact: true })
      ).toBeVisible();
      await fillStepGuild(page);
      await continueWizard(page);
    });

    await test.step("company advances through the optional steps to review", async () => {
      // Step 5 (questions) and step 6 (attachments) are optional.
      await continueWizard(page); // step 5 -> 6
      await continueWizard(page); // step 6 -> 7 (review)
    });

    await test.step("company publishes the job and is returned to the jobs list", async () => {
      // Both the review step and the sticky footer expose a "Publish job"
      // button; the footer (last) is the canonical wizard action.
      await page.getByRole("button", { name: "Publish job" }).last().click();
      await page.waitForURL("**/dashboard/jobs", { timeout: 15000 });
      await expect(
        page.getByRole("heading", { name: "Your job postings" })
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test("validates required fields before advancing past step 1", async ({ page }) => {
    await test.step("company signs up and opens the job wizard", async () => {
      await signupCompany(page);
      await gotoJobWizard(page);
    });

    await test.step("company clicks Continue on an empty step and validation errors appear", async () => {
      await page.getByRole("button", { name: "Continue" }).click();
      // The wizard surfaces a global error and stays on step 1.
      await expect(
        page.getByText("Please fix the highlighted fields before continuing.")
      ).toBeVisible({ timeout: 5000 });
      await expect(
        page.getByRole("heading", { name: "The role" })
      ).toBeVisible();
    });
  });

  test("back to dashboard button works from the job wizard", async ({ page }) => {
    await test.step("company signs up and opens the job wizard", async () => {
      await signupCompany(page);
      await gotoJobWizard(page);
    });

    await test.step("company clicks Back to Dashboard and returns to the dashboard", async () => {
      await page.getByRole("button", { name: "Back to Dashboard" }).click();
      await page.waitForURL("**/dashboard", { timeout: 10000 });
    });
  });
});
