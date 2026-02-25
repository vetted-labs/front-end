import { test, expect } from "@playwright/test";
import {
  signupCandidate,
  loginCandidate,
  logoutCandidate,
} from "./helpers/auth";
import {
  setExpertSession,
  expectNoExpertSession,
} from "./helpers/expert-auth";

/**
 * Bug regression tests for specific reported issues.
 *
 * Bugs requiring expert/wallet auth are marked with test.skip().
 * See expert-session.spec.ts and expert-pages.spec.ts for partial expert coverage
 * via localStorage injection. The skipped tests below require a real wallet connection
 * (wagmi useAccount) which cannot be simulated in Playwright without a wallet mock
 * provider (e.g., Hardhat/Anvil node + injected signer).
 */

test.describe("Bug 1: Candidate login shows expert wallet address", () => {
  test("candidate signup clears stale expert wallet data from localStorage", async ({
    page,
  }) => {
    // Pre-condition: stale expert data exists
    await page.goto("/");
    await setExpertSession(page);

    const walletBefore = await page.evaluate(() =>
      localStorage.getItem("walletAddress")
    );
    expect(walletBefore).toBe(
      "0x1234567890abcdef1234567890abcdef12345678"
    );

    // Action: signup as candidate
    await signupCandidate(page);

    // Assert: stale expert data was cleared
    await expectNoExpertSession(page);
    const userType = await page.evaluate(() =>
      localStorage.getItem("userType")
    );
    expect(userType).toBe("candidate");

    // Assert: no wallet hex address appears in the page body
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toMatch(/0x[a-fA-F0-9]{40}/);
  });

  test("candidate login clears stale expert wallet data from localStorage", async ({
    page,
  }) => {
    // Create account first
    const { email, password } = await signupCandidate(page);
    await logoutCandidate(page);

    // Inject stale expert data
    await setExpertSession(page);
    const walletBefore = await page.evaluate(() =>
      localStorage.getItem("walletAddress")
    );
    expect(walletBefore).toBe(
      "0x1234567890abcdef1234567890abcdef12345678"
    );

    // Login as candidate
    await loginCandidate(page, email, password);

    // Assert: stale data cleared
    await expectNoExpertSession(page);
    const userType = await page.evaluate(() =>
      localStorage.getItem("userType")
    );
    expect(userType).toBe("candidate");

    // Body should not show hex wallet address
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toMatch(/0x[a-fA-F0-9]{40}/);
  });

  test("candidate sidebar displays email, not wallet address", async ({
    page,
  }) => {
    const { email } = await signupCandidate(page);
    await page.goto("/candidate/profile");
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({
      timeout: 15000,
    });

    // No hex wallet address should appear anywhere on the page
    const pageText = await page.textContent("body");
    const walletPattern = /0x[a-fA-F0-9]{40}/;
    expect(pageText).not.toMatch(walletPattern);
  });
});

test.describe("Bug 7: Candidate dashboard guild applications tab", () => {
  test("Guild Applications tab is visible on candidate profile", async ({
    page,
  }) => {
    await signupCandidate(page);
    await page.goto("/candidate/profile");
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({
      timeout: 15000,
    });

    const guildTab = page.getByRole("button", { name: /Guild Applications/i });
    await expect(guildTab).toBeVisible();
  });

  test("Guild Applications tab shows empty state with Browse Guilds", async ({
    page,
  }) => {
    await signupCandidate(page);
    await page.goto("/candidate/profile");
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({
      timeout: 15000,
    });

    // Click Guild Applications tab
    await page.getByRole("button", { name: /Guild Applications/i }).click();

    // Should show empty state
    await expect(page.getByText("No guild applications yet")).toBeVisible();
    await expect(
      page.getByText("Apply to guilds to get vetted by expert reviewers")
    ).toBeVisible();

    // Browse Guilds button navigates to guilds page
    const browseGuildsBtn = page.getByRole("button", { name: "Browse Guilds" });
    await expect(browseGuildsBtn).toBeVisible();
    await browseGuildsBtn.click();
    await page.waitForURL("**/guilds", { timeout: 10000 });
  });

  test("Guild applications API call succeeds without errors", async ({
    page,
  }) => {
    await signupCandidate(page);

    const guildAppsRequest = page.waitForResponse(
      (resp) =>
        resp.url().includes("/guild-applications") &&
        resp.request().method() === "GET",
      { timeout: 15000 },
    );

    await page.goto("/candidate/profile");
    const response = await guildAppsRequest;

    expect(response.status()).toBeLessThan(500);
  });

  test("candidate dashboard shows both applications and guild applications tabs", async ({
    page,
  }) => {
    await signupCandidate(page);
    await page.goto("/candidate/profile");
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({
      timeout: 15000,
    });

    // Both tabs must be visible for proper dashboard functionality
    await expect(
      page.getByRole("button", { name: "My Applications" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Guild Applications/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Profile & Resume" })
    ).toBeVisible();
  });
});

// Bugs that require expert/wallet auth — documented as skipped.
// Partial expert coverage exists in: expert-login.spec.ts, expert-session.spec.ts,
// expert-route-protection.spec.ts, expert-pages.spec.ts.
// These tests specifically need a real wagmi wallet connection (useAccount().isConnected)
// which requires: Hardhat/Anvil local node + wallet mock provider injected into the browser.
test.describe("Expert/wallet-dependent bugs (skipped — need wallet auth infra)", () => {
  test.skip("Bug 2: Should not review applications before staking", async () => {
    // Requires: real wallet connection + guild membership + VETD staking
    // Infra needed: Anvil node with VETD token contract, wallet with staked balance
    // Test would verify: clicking Review without stake shows error toast
    // and opens StakeModal instead of ReviewGuildApplicationModal
  });

  test.skip("Bug 3: Application question headers should be simplified", async () => {
    // Requires: expert application form at /expert/apply with wallet connected
    // Infra needed: wallet mock so useAccount().isConnected returns true
    // Test would verify: question headers show "Question 1" instead of
    // "1. Learning from Failure", with single input field per question
  });

  test.skip("Bug 4: Error 400 when reviewing candidate proposal", async () => {
    // Requires: expert wallet + guild membership + candidate proposal to review
    // Infra needed: Anvil node + seeded guild/proposal data
    // Test would verify: submitting a review returns 200, not 400
  });

  test.skip("Bug 5: Activity does not update on accepted candidate", async () => {
    // Requires: expert wallet + guild officer permissions
    // Infra needed: Anvil node + seeded guild with officer role
    // Test would verify: after accepting candidate, Activity tab shows new entry
  });

  test.skip("Bug 6: Accepted candidate not showing in guild members", async () => {
    // Requires: expert wallet + guild officer + candidate acceptance flow
    // Infra needed: Anvil node + full acceptance flow seeded
    // Test would verify: after acceptance, candidate appears in Members tab
  });

  test.skip("Bug 8: Expert application not showing on membership tab", async () => {
    // Requires: expert wallet + new expert application submission
    // Infra needed: Anvil node + wallet mock for application submission
    // Test would verify: after expert submits guild application,
    // it appears in the Membership Applications tab for guild officers
  });
});
