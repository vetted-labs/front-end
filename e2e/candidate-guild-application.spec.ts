import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";
import {
  ENGINEERING_GUILD_ID,
  JOB_ID,
  MOCK_GUILD,
  MOCK_GUILD_APP_TEMPLATE,
  MOCK_JOB,
  MOCK_CANDIDATE_PROFILE,
  setupGuildApplicationMocks,
} from "./helpers/guild-mocks";

test.describe("Candidate guild application flow", () => {
  test("redirects unauthenticated user to login", async ({ page }) => {
    await setupGuildApplicationMocks(page);
    await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });

    // Should redirect to login page
    await page.waitForURL("**/auth/login**", { timeout: 15000 });
    await expect(page.getByText(/Sign In/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("loads form and shows step indicator", async ({ page }) => {
    await signupCandidate(page);
    await setupGuildApplicationMocks(page);

    await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });

    await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Resume & General").first()).toBeVisible();
    await expect(page.getByText("Guild Review").first()).toBeVisible();
  });

  test("validates resume requirement on step 1", async ({ page }) => {
    await signupCandidate(page);
    await setupGuildApplicationMocks(page, {
      candidateProfile: { ...MOCK_CANDIDATE_PROFILE, resumeUrl: null, resumeFileName: null },
    });

    await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
    await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });

    // Try to proceed without resume
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText(/resume/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("validates required general question answers", async ({ page }) => {
    await signupCandidate(page);
    await setupGuildApplicationMocks(page);

    await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
    await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });

    // Upload a resume first (use profile resume if available)
    const useProfileResumeCheckbox = page.getByText(/profile resume/i).first();
    if (await useProfileResumeCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await useProfileResumeCheckbox.click();
    }

    // Try to continue without filling general questions
    await page.getByRole("button", { name: "Continue" }).click();

    // Should show validation error about a required question
    await expect(page.getByText(/Please answer/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("navigates between steps preserving answers", async ({ page }) => {
    await signupCandidate(page);
    await setupGuildApplicationMocks(page);

    await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
    await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });

    // Use profile resume
    const useProfileResumeCheckbox = page.getByText(/profile resume/i).first();
    if (await useProfileResumeCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await useProfileResumeCheckbox.click();
    }

    // Fill in general questions
    const motivationField = page.getByPlaceholder(/motivation/i).first();
    const experienceField = page.getByPlaceholder(/experience/i).first();

    // Try textarea approach — find textareas by their labels
    const textareas = page.locator("textarea");
    const textareaCount = await textareas.count();

    if (textareaCount >= 2) {
      await textareas.nth(0).fill("I want to join because I am passionate about engineering and building great software.");
      await textareas.nth(1).fill("I have 5 years of experience building full-stack web applications with React and Node.js.");
    }

    // Click Continue to go to Guild Review step (no job step)
    await page.getByRole("button", { name: "Continue" }).click();

    // Should now be on Guild Review step
    await expect(page.getByText("Guild Review").first()).toBeVisible({ timeout: 5000 });

    // Go back
    await page.getByRole("button", { name: "Back" }).click();

    // Answers should still be in the textareas
    await expect(page.getByText("Resume & General").first()).toBeVisible({ timeout: 5000 });
    if (textareaCount >= 1) {
      const firstVal = await textareas.nth(0).inputValue();
      expect(firstVal).toContain("passionate");
    }
  });

  test("shows job questions step when jobId is present", async ({ page }) => {
    await signupCandidate(page);
    await setupGuildApplicationMocks(page, { job: MOCK_JOB });

    await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply?jobId=${JOB_ID}`, { waitUntil: "networkidle" });
    await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });

    // Should show 3 steps: Resume & General, Job Questions, Guild Review
    await expect(page.getByText("Job Questions").first()).toBeVisible();
  });

  test("validates cover letter minimum length of 50 chars", async ({ page }) => {
    await signupCandidate(page);
    await setupGuildApplicationMocks(page, { job: MOCK_JOB });

    await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply?jobId=${JOB_ID}`, { waitUntil: "networkidle" });
    await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });

    // Fill step 1 and proceed to step 2
    const useProfileResume = page.getByText(/profile resume/i).first();
    if (await useProfileResume.isVisible({ timeout: 3000 }).catch(() => false)) {
      await useProfileResume.click();
    }

    // Fill general questions
    const textareas = page.locator("textarea");
    const count = await textareas.count();
    for (let i = 0; i < count; i++) {
      await textareas.nth(i).fill("This is a detailed answer that exceeds the minimum character requirement for this field.");
    }

    await page.getByRole("button", { name: "Continue" }).click();

    // On Job Questions step — type a short cover letter
    await page.waitForTimeout(500);
    const coverLetterTextarea = page.locator("textarea").first();
    if (await coverLetterTextarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await coverLetterTextarea.fill("Too short");
      await page.getByRole("button", { name: "Continue" }).click();

      await expect(page.getByText(/50 characters/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("validates no-AI declaration checkbox required", async ({ page }) => {
    await signupCandidate(page);
    await setupGuildApplicationMocks(page);

    await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
    await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });

    // Fill step 1
    const useProfileResume = page.getByText(/profile resume/i).first();
    if (await useProfileResume.isVisible({ timeout: 3000 }).catch(() => false)) {
      await useProfileResume.click();
    }

    const textareas = page.locator("textarea");
    const count = await textareas.count();
    for (let i = 0; i < count; i++) {
      await textareas.nth(i).fill("This is a detailed answer that exceeds the minimum character requirement for this field.");
    }

    await page.getByRole("button", { name: "Continue" }).click();

    // Now on Guild Review step — select a level and fill domain question
    await page.waitForTimeout(500);

    // Try to submit without no-AI declaration
    const domainTextareas = page.locator("textarea");
    const domainCount = await domainTextareas.count();
    for (let i = 0; i < domainCount; i++) {
      await domainTextareas.nth(i).fill("This is a comprehensive answer about my experience and expertise in this domain area that meets the minimum length requirement.");
    }

    // Click the level selector if present
    const levelButtons = page.locator("[role='radio'], [role='option']");
    if (await levelButtons.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await levelButtons.first().click();
    }

    await page.getByRole("button", { name: "Submit Application" }).click();

    // Should show no-AI declaration error
    await expect(page.getByText(/no-AI declaration/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("Back to Guild button navigates back", async ({ page }) => {
    await signupCandidate(page);
    await setupGuildApplicationMocks(page);

    await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
    await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });

    await page.getByText("Back to Guild").click();
    await page.waitForURL(`**/guilds/${ENGINEERING_GUILD_ID}`, { timeout: 10000 });
  });

  test("Cancel button on step 1 navigates to guild page", async ({ page }) => {
    await signupCandidate(page);
    await setupGuildApplicationMocks(page);

    await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
    await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForURL(`**/guilds/${ENGINEERING_GUILD_ID}`, { timeout: 10000 });
  });
});
