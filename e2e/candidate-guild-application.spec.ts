import { test, expect, Page } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";
import {
  ENGINEERING_GUILD_ID,
  JOB_ID,
  MOCK_JOB,
  MOCK_CANDIDATE_PROFILE,
  setupGuildApplicationMocks,
} from "./helpers/guild-mocks";

// ---------------------------------------------------------------------------
// Post-redesign guild application flow.
//
// The single-page multi-step form was replaced by a SUBSTEP wizard:
//   • Header: "Join {Guild}" (no job) / "Apply to {Job} · join {Guild}" (with job)
//   • Top steps (left rail): "Resume & general", optional "Role questions",
//     "Guild specifics"
//   • Each top step is split into substeps shown one at a time; the
//     Continue/Back footer walks substeps, and per-step validation only fires
//     when continuing PAST the last substep of a step.
//   • Resume is chosen via a "Use resume from profile" / "Upload a new resume"
//     button pair (no checkbox). General/domain answers require >= 100 / 50 chars.
//   • The no-AI attestation is a (visually hidden) checkbox inside a clickable
//     label on the Guild specifics setup substep.
// ---------------------------------------------------------------------------

const RESUME_STEP_NAME = "Resume & general";
const GUILD_STEP_NAME = "Guild specifics";
const ROLE_STEP_NAME = "Role questions";

/** Click the footer Continue button. */
async function clickContinue(page: Page) {
  await page.getByRole("button", { name: "Continue" }).click();
}

/**
 * Advance through every substep of the current top step by clicking Continue
 * until the footer reports we are on the final substep, then return without
 * triggering the step transition. `expectedSubsteps` guards the loop.
 */
async function advanceToLastSubstep(page: Page, maxClicks = 6) {
  for (let i = 0; i < maxClicks; i++) {
    const label = await page
      .getByText(/substep \d+ of \d+/i)
      .first()
      .textContent()
      .catch(() => null);
    if (!label) return; // single-substep step — already at the end
    const match = label.match(/substep (\d+) of (\d+)/i);
    if (!match) return;
    if (match[1] === match[2]) return; // on last substep
    await clickContinue(page);
  }
}

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

  test("loads the wizard and shows the step rail", async ({ page }) => {
    await test.step("candidate signs up and mocks are set up", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page);
    });

    await test.step("candidate opens the Engineering guild application form", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
    });

    await test.step("the Join header and the wizard steps are visible", async () => {
      await expect(page.getByRole("heading", { name: "Join Engineering" })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(RESUME_STEP_NAME).first()).toBeVisible();
      await expect(page.getByText(GUILD_STEP_NAME).first()).toBeVisible();
    });
  });

  test("validates resume requirement on the resume step", async ({ page }) => {
    await test.step("candidate signs up with a profile that has no resume, and mocks are set up", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page, {
        candidateProfile: { ...MOCK_CANDIDATE_PROFILE, resumeUrl: null, resumeFileName: null },
      });
    });

    await test.step("candidate opens the guild application form", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Join Engineering" })).toBeVisible({ timeout: 15000 });
    });

    await test.step("advancing to the end of the resume step without a resume shows a resume validation error", async () => {
      // Walk to the last substep of the resume step, then continue to trigger
      // step validation. Resume is validated before general answers, so the
      // resume error surfaces first.
      await advanceToLastSubstep(page);
      await clickContinue(page);
      await expect(page.getByText(/upload your resume/i).first()).toBeVisible({ timeout: 5000 });
    });
  });

  test("validates required general question answers", async ({ page }) => {
    await test.step("candidate signs up and mocks are set up", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page);
    });

    await test.step("candidate opens the guild application form and selects the profile resume", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Join Engineering" })).toBeVisible({ timeout: 15000 });

      await page.getByRole("button", { name: /Use resume from profile/i }).click();
    });

    await test.step("advancing without filling the general questions shows a validation error", async () => {
      await advanceToLastSubstep(page);
      await clickContinue(page);
      await expect(page.getByText(/Please answer/i).first()).toBeVisible({ timeout: 5000 });
    });
  });

  test("navigates between substeps preserving answers", async ({ page }) => {
    await test.step("candidate signs up and mocks are set up", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page);
    });

    await test.step("candidate opens the form, selects the profile resume, and answers the first general question", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Join Engineering" })).toBeVisible({ timeout: 15000 });

      await page.getByRole("button", { name: /Use resume from profile/i }).click();
      // Advance to the first general-question substep.
      await clickContinue(page);
      const firstAnswer =
        "I am passionate about engineering and building great software that scales to millions of users.";
      await page.locator("textarea").first().fill(firstAnswer);
    });

    await test.step("going back to the setup substep then forward preserves the typed answer", async () => {
      await page.getByRole("button", { name: "Back" }).click();
      // Back on the setup substep, the resume selector is visible again.
      await expect(page.getByRole("button", { name: /Use resume from profile/i })).toBeVisible({ timeout: 5000 });

      await clickContinue(page);
      const restored = await page.locator("textarea").first().inputValue();
      expect(restored).toContain("passionate");
    });
  });

  test("shows a Role questions step when a jobId is present", async ({ page }) => {
    await test.step("candidate signs up and mocks are set up with a job", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page, { job: MOCK_JOB });
    });

    await test.step("candidate opens the guild application form with a jobId query param", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply?jobId=${JOB_ID}`, { waitUntil: "networkidle" });
    });

    await test.step("a Role questions step appears in the step rail", async () => {
      await expect(page.getByText(/join Engineering/i).first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(ROLE_STEP_NAME).first()).toBeVisible();
    });
  });

  test("validates cover letter minimum length on the role step", async ({ page }) => {
    await test.step("candidate signs up and mocks are set up with a job", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page, { job: MOCK_JOB });
    });

    await test.step("candidate completes the resume step", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply?jobId=${JOB_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText(/join Engineering/i).first()).toBeVisible({ timeout: 15000 });

      await page.getByRole("button", { name: /Use resume from profile/i }).click();
      // Answer each general question substep with >= 100 chars, then continue.
      await advanceGeneralQuestions(page);
      await clickContinue(page); // leave resume step → role step
    });

    await test.step("a too-short cover letter triggers the minimum length error", async () => {
      await expect(page.getByText(new RegExp(ROLE_STEP_NAME, "i")).first()).toBeVisible({ timeout: 5000 });
      // The cover-letter substep is the first substep of the role step.
      await page.locator("textarea").first().fill("Too short");
      await advanceToLastSubstep(page);
      await clickContinue(page);
      await expect(page.getByText(/at least 50 characters/i).first()).toBeVisible({ timeout: 5000 });
    });
  });

  test("validates the no-AI declaration on the guild step", async ({ page }) => {
    await test.step("candidate signs up and mocks are set up", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page);
    });

    await test.step("candidate completes the resume step", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Join Engineering" })).toBeVisible({ timeout: 15000 });

      await page.getByRole("button", { name: /Use resume from profile/i }).click();
      await advanceGeneralQuestions(page);
      await clickContinue(page); // leave resume step → guild step
    });

    await test.step("on the guild step, pick a level and a domain answer but skip the attestation", async () => {
      await expect(page.getByText(new RegExp(GUILD_STEP_NAME, "i")).first()).toBeVisible({ timeout: 5000 });
      // Setup substep: choose the Entry-Level experience level (do NOT check the
      // no-AI attestation).
      await page.getByRole("button", { name: /Entry-Level/i }).click();
      // Advance to the domain-question substep and answer it (>= 50 chars).
      await clickContinue(page);
      await page
        .locator("textarea")
        .first()
        .fill(
          "I have a strong grasp of core engineering fundamentals built over years of hands-on practice and study."
        );
    });

    await test.step("submitting without confirming the no-AI declaration shows a validation error", async () => {
      // On the final substep the primary action is "Submit application"; it runs
      // the same step validation, which flags the missing attestation.
      await page.getByRole("button", { name: /Submit application/i }).click();
      await expect(page.getByText(/no-AI declaration/i).first()).toBeVisible({ timeout: 5000 });
    });
  });

  test("Cancel navigates back to the guild page", async ({ page }) => {
    await test.step("candidate signs up and opens the guild application form", async () => {
      await signupCandidate(page);
      await setupGuildApplicationMocks(page);
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Join Engineering" })).toBeVisible({ timeout: 15000 });
    });

    await test.step("clicking Cancel navigates to the guild detail page", async () => {
      // Both the top nav and the footer expose a Cancel that returns to the
      // guild detail page; the top-nav Cancel is always present (it does not
      // depend on the current substep), so target it deterministically.
      await page.getByRole("button", { name: "Cancel" }).first().click();
      await page.waitForURL(`**/guilds/${ENGINEERING_GUILD_ID}`, { timeout: 10000 });
    });
  });
});

/**
 * Fill every general-question substep of the resume step with a >= 100 char
 * answer, leaving the wizard positioned on the final substep of that step.
 */
async function advanceGeneralQuestions(page: Page, maxClicks = 6) {
  const answer =
    "I am passionate about engineering and building great software that scales reliably to millions of users worldwide every single day.";
  for (let i = 0; i < maxClicks; i++) {
    const label = await page
      .getByText(/substep \d+ of \d+/i)
      .first()
      .textContent()
      .catch(() => null);
    if (!label) return;
    const match = label.match(/substep (\d+) of (\d+)/i);
    if (!match) return;
    // If the current substep shows a textarea (a general question), fill it.
    const ta = page.locator("textarea").first();
    if (await ta.isVisible({ timeout: 1500 }).catch(() => false)) {
      await ta.fill(answer);
    }
    if (match[1] === match[2]) return; // last substep reached
    await clickContinue(page);
  }
}
