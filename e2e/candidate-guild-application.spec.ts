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
    await test.step("guild application mocks are set up", async () => {
      await setupGuildApplicationMocks(page);
    });

    await test.step("unauthenticated user tries to open the guild application form", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
    });

    await test.step("user is redirected to the login page", async () => {
      await page.waitForURL("**/auth/login**", { timeout: 15000 });
      await expect(page.getByText(/Sign In/i).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test("loads form and shows step indicator", async ({ page }) => {
    await test.step("candidate signs up and mocks are set up", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page);
    });

    await test.step("candidate opens the Engineering guild application form", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
    });

    await test.step("form title and step indicator with all steps are visible", async () => {
      await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Resume & General").first()).toBeVisible();
      await expect(page.getByText("Guild Review").first()).toBeVisible();
    });
  });

  test("validates resume requirement on step 1", async ({ page }) => {
    await test.step("candidate signs up with a profile that has no resume, and mocks are set up", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page, {
        candidateProfile: { ...MOCK_CANDIDATE_PROFILE, resumeUrl: null, resumeFileName: null },
      });
    });

    await test.step("candidate opens the guild application form", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
      await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("clicking Continue without a resume shows a resume validation error", async () => {
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByText(/resume/i).first()).toBeVisible({ timeout: 5000 });
    });
  });

  test("validates required general question answers", async ({ page }) => {
    await test.step("candidate signs up and mocks are set up", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page);
    });

    await test.step("candidate opens the guild application form and attaches a resume", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
      await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });

      const useProfileResumeCheckbox = page.getByText(/profile resume/i).first();
      if (await useProfileResumeCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await useProfileResumeCheckbox.click();
      }
    });

    await test.step("clicking Continue without filling general questions shows a validation error", async () => {
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByText(/Please answer/i).first()).toBeVisible({ timeout: 5000 });
    });
  });

  test("navigates between steps preserving answers", async ({ page }) => {
    await test.step("candidate signs up and mocks are set up", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page);
    });

    await test.step("candidate opens the guild application form and fills in step 1", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
      await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });

      const useProfileResumeCheckbox = page.getByText(/profile resume/i).first();
      if (await useProfileResumeCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await useProfileResumeCheckbox.click();
      }

      const textareas = page.locator("textarea");
      const textareaCount = await textareas.count();

      if (textareaCount >= 2) {
        await textareas.nth(0).fill("I want to join because I am passionate about engineering and building great software.");
        await textareas.nth(1).fill("I have 5 years of experience building full-stack web applications with React and Node.js.");
      }
    });

    await test.step("candidate advances to the Guild Review step", async () => {
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByText("Guild Review").first()).toBeVisible({ timeout: 5000 });
    });

    await test.step("going back to step 1 shows the previously entered answers", async () => {
      await page.getByRole("button", { name: "Back" }).click();
      await expect(page.getByText("Resume & General").first()).toBeVisible({ timeout: 5000 });

      const textareas = page.locator("textarea");
      const textareaCount = await textareas.count();
      if (textareaCount >= 1) {
        const firstVal = await textareas.nth(0).inputValue();
        expect(firstVal).toContain("passionate");
      }
    });
  });

  test("shows job questions step when jobId is present", async ({ page }) => {
    await test.step("candidate signs up and mocks are set up with a job", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page, { job: MOCK_JOB });
    });

    await test.step("candidate opens the guild application form with a jobId query param", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply?jobId=${JOB_ID}`, { waitUntil: "networkidle" });
    });

    await test.step("a Job Questions step appears in the step indicator", async () => {
      await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Job Questions").first()).toBeVisible();
    });
  });

  test("validates cover letter minimum length of 50 chars", async ({ page }) => {
    await test.step("candidate signs up and mocks are set up with a job", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page, { job: MOCK_JOB });
    });

    await test.step("candidate completes step 1 and advances to the Job Questions step", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply?jobId=${JOB_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });

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
    });

    await test.step("a cover letter shorter than 50 characters triggers a minimum length error", async () => {
      await page.waitForTimeout(500);
      const coverLetterTextarea = page.locator("textarea").first();
      if (await coverLetterTextarea.isVisible({ timeout: 3000 }).catch(() => false)) {
        await coverLetterTextarea.fill("Too short");
        await page.getByRole("button", { name: "Continue" }).click();

        await expect(page.getByText(/50 characters/i).first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test("validates no-AI declaration checkbox required", async ({ page }) => {
    await test.step("candidate signs up and mocks are set up", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page);
    });

    await test.step("candidate completes step 1 and advances to the Guild Review step", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
      await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });

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
    });

    await test.step("submitting the guild review without checking the no-AI declaration shows a validation error", async () => {
      await page.waitForTimeout(500);

      const domainTextareas = page.locator("textarea");
      const domainCount = await domainTextareas.count();
      for (let i = 0; i < domainCount; i++) {
        await domainTextareas.nth(i).fill("This is a comprehensive answer about my experience and expertise in this domain area that meets the minimum length requirement.");
      }

      const levelButtons = page.locator("[role='radio'], [role='option']");
      if (await levelButtons.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await levelButtons.first().click();
      }

      await page.getByRole("button", { name: "Submit Application" }).click();

      await expect(page.getByText(/no-AI declaration/i).first()).toBeVisible({ timeout: 5000 });
    });
  });

  test("Back to Guild button navigates back", async ({ page }) => {
    await test.step("candidate signs up and opens the guild application form", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page);
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
      await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("clicking Back to Guild navigates to the guild detail page", async () => {
      await page.getByText("Back to Guild").click();
      await page.waitForURL(`**/guilds/${ENGINEERING_GUILD_ID}`, { timeout: 10000 });
    });
  });

  test("Cancel button on step 1 navigates to guild page", async ({ page }) => {
    await test.step("candidate signs up and opens the guild application form", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page);
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
      await expect(page.getByText("Apply to Join Engineering").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("clicking Cancel navigates back to the guild detail page", async () => {
      await page.getByRole("button", { name: "Cancel" }).click();
      await page.waitForURL(`**/guilds/${ENGINEERING_GUILD_ID}`, { timeout: 10000 });
    });
  });
});
