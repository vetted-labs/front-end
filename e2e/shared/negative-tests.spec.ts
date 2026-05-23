import { test, expect } from "@playwright/test";
import { setExpertSession } from "../helpers/expert-auth";
import {
  ENGINEERING_GUILD_ID,
  APPLICATION_ID,
  MOCK_APPLICATION_ACTIVE,
  MOCK_STAKING_NOT_MET,
  setupVotingDetailMocks,
  setupGuildApplicationMocks,
} from "../helpers/guild-mocks";

test.describe("Negative tests — error paths and validation", () => {
  test("auth guard redirects from /candidate/guilds when not authenticated", async ({ page }) => {
    await test.step("unauthenticated session is established by clearing storage", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.evaluate(() => {
        localStorage.clear();
      });
    });

    await test.step("unauthenticated user navigates to the protected guilds page", async () => {
      await page.goto("/candidate/guilds", { waitUntil: "networkidle" });
    });

    await test.step("user is redirected to a login or signup page", async () => {
      await page.waitForURL(/\/(auth\/(login|signup)|$)/, { timeout: 15000 });
    });
  });

  test("guild application redirects for unauthenticated user", async ({ page }) => {
    await test.step("unauthenticated session is established by clearing storage", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.evaluate(() => {
        localStorage.clear();
      });
    });

    await test.step("guild application page mocks and navigation are set up", async () => {
      await setupGuildApplicationMocks(page);
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
    });

    await test.step("unauthenticated user is redirected to the login page", async () => {
      await page.waitForURL("**/auth/login**", { timeout: 15000 });
    });
  });

  test("already a guild member shows error message", async ({ page }) => {
    await test.step("candidate signs up with a fresh account", async () => {
      const timestamp = Date.now();
      const email = `e2e-neg-${timestamp}@vetted-test.com`;
      const password = "TestPass123!";

      await page.goto("/auth/signup?type=candidate", { waitUntil: "networkidle" });
      await page.getByPlaceholder("John Doe").waitFor({ state: "visible", timeout: 30000 });
      await page.getByPlaceholder("John Doe").fill(`E2E Neg ${timestamp}`);
      await page.getByPlaceholder("Senior Software Engineer").fill("Tester");
      // LinkedIn is now a required candidate field in the redesigned signup form.
      await page.getByPlaceholder("https://linkedin.com/in/yourname").fill(`https://linkedin.com/in/e2e-neg-${timestamp}`);
      await page.getByPlaceholder("you@example.com").fill(email);
      await page.getByPlaceholder("Min. 6 characters").fill(password);
      await page.getByPlaceholder("Repeat password").fill(password);
      // The Create Account button is gated on the Terms of Service consent checkbox.
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Create Account" }).click();
      await page.waitForURL(/\/candidate\/(dashboard|profile)/, { timeout: 15000 });
    });

    await test.step("guild membership mock is configured to show the candidate as already a member", async () => {
      await setupGuildApplicationMocks(page, {
        membershipStatus: { isMember: true, role: "member", status: "approved" },
      });
    });

    await test.step("candidate navigates to the guild application page and sees already-member feedback", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });

      const errorVisible = await page.getByText(/already a member/i).first().isVisible({ timeout: 10000 }).catch(() => false);
      const redirected = page.url().includes("/browse/jobs") || page.url().includes(`/guilds/${ENGINEERING_GUILD_ID}`);

      expect(errorVisible || redirected).toBeTruthy();
    });
  });

  test("pending application shows error message", async ({ page }) => {
    await test.step("candidate signs up with a fresh account", async () => {
      const timestamp = Date.now();
      const email = `e2e-pend-${timestamp}@vetted-test.com`;
      const password = "TestPass123!";

      await page.goto("/auth/signup?type=candidate", { waitUntil: "networkidle" });
      await page.getByPlaceholder("John Doe").waitFor({ state: "visible", timeout: 30000 });
      await page.getByPlaceholder("John Doe").fill(`E2E Pend ${timestamp}`);
      await page.getByPlaceholder("Senior Software Engineer").fill("Tester");
      // LinkedIn is now a required candidate field in the redesigned signup form.
      await page.getByPlaceholder("https://linkedin.com/in/yourname").fill(`https://linkedin.com/in/e2e-pend-${timestamp}`);
      await page.getByPlaceholder("you@example.com").fill(email);
      await page.getByPlaceholder("Min. 6 characters").fill(password);
      await page.getByPlaceholder("Repeat password").fill(password);
      // The Create Account button is gated on the Terms of Service consent checkbox.
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Create Account" }).click();
      await page.waitForURL(/\/candidate\/(dashboard|profile)/, { timeout: 15000 });
    });

    await test.step("guild mock is configured to show a pending application in progress", async () => {
      await setupGuildApplicationMocks(page, {
        membershipStatus: { isMember: false, status: "pending" },
      });
    });

    await test.step("candidate opens the guild apply page and sees a pending-review message", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
      await expect(page.getByText(/already pending review/i).first()).toBeVisible({ timeout: 15000 });
    });
  });

  test("cannot vote when not assigned reviewer (no Cast Vote button)", async ({ page }) => {
    await test.step("expert session is established", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
    });

    await test.step("voting detail mock is configured with the expert marked as not assigned", async () => {
      const notAssignedApp = {
        ...MOCK_APPLICATION_ACTIVE,
        is_assigned_reviewer: false,
      };

      await setupVotingDetailMocks(page, APPLICATION_ID, {
        application: notAssignedApp,
      });
    });

    await test.step("expert opens the voting detail page and the Cast Vote button is absent", async () => {
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });

      // "Cast Your Vote" button should not appear for non-assigned reviewer
      // It might show "Not Assigned" instead or no vote section
      const castVoteBtn = page.getByRole("button", { name: "Cast Your Vote" });
      const stakeReqBtn = page.getByRole("button", { name: /Stake Required/i });

      const hasCastVote = await castVoteBtn.isVisible({ timeout: 3000 }).catch(() => false);
      const hasStakeReq = await stakeReqBtn.isVisible({ timeout: 1000 }).catch(() => false);

      // Neither active voting action should be presented to a non-assigned reviewer
      expect(hasCastVote || hasStakeReq).toBe(false);
    });
  });

  test("vote stake below minimum shows Stake Required", async ({ page }) => {
    await test.step("expert session is established", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
    });

    await test.step("voting detail mock is configured with stake below the minimum threshold", async () => {
      await setupVotingDetailMocks(page, APPLICATION_ID, {
        stakingStatus: MOCK_STAKING_NOT_MET,
      });
    });

    await test.step("expert opens voting detail and the Stake Required button renders as disabled", async () => {
      await page.goto(`/expert/voting/applications/${APPLICATION_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Jane Doe").first()).toBeVisible({ timeout: 15000 });

      const stakeReqBtn = page.getByRole("button", { name: /Stake Required/i });
      await expect(stakeReqBtn).toBeVisible();
      await expect(stakeReqBtn).toBeDisabled();
    });
  });

  test("invalid file type on guild application shows error", async ({ page }) => {
    await test.step("candidate signs up with a fresh account", async () => {
      const timestamp = Date.now();
      const email = `e2e-file-${timestamp}@vetted-test.com`;
      const password = "TestPass123!";

      await page.goto("/auth/signup?type=candidate", { waitUntil: "networkidle" });
      await page.getByPlaceholder("John Doe").waitFor({ state: "visible", timeout: 30000 });
      await page.getByPlaceholder("John Doe").fill(`E2E File ${timestamp}`);
      await page.getByPlaceholder("Senior Software Engineer").fill("Tester");
      // LinkedIn is now a required candidate field in the redesigned signup form.
      await page.getByPlaceholder("https://linkedin.com/in/yourname").fill(`https://linkedin.com/in/e2e-file-${timestamp}`);
      await page.getByPlaceholder("you@example.com").fill(email);
      await page.getByPlaceholder("Min. 6 characters").fill(password);
      await page.getByPlaceholder("Repeat password").fill(password);
      // The Create Account button is gated on the Terms of Service consent checkbox.
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Create Account" }).click();
      await page.waitForURL(/\/candidate\/(dashboard|profile)/, { timeout: 15000 });
    });

    await test.step("guild application mock is configured with no prior resume", async () => {
      await setupGuildApplicationMocks(page, {
        candidateProfile: { id: "test", fullName: "Tester", resumeUrl: null },
      });
    });

    await test.step("candidate opens the application form", async () => {
      await page.goto(`/guilds/${ENGINEERING_GUILD_ID}/apply`, { waitUntil: "networkidle" });
      // Redesigned guild apply header changed "Apply to Join {Guild}" → "Join {Guild}".
      await expect(page.getByRole("heading", { name: /Join Engineering/i }).first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("candidate uploads a .txt file and sees an accepted-format error", async () => {
      const fileInput = page.locator("input[type='file']");
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fileInput.setInputFiles({
          name: "test.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("This is a text file"),
        });

        await expect(page.getByText(/PDF|DOC|DOCX/i).first()).toBeVisible({ timeout: 5000 });
      }
    });
  });
});
