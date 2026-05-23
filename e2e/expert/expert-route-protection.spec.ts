import { test, expect } from "@playwright/test";
import { signupCandidate } from "../helpers/auth";
import { setExpertSession } from "../helpers/expert-auth";

test.describe("Expert route protection", () => {
  test("unauthenticated user accessing /expert/dashboard gets redirected", async ({
    page,
  }) => {
    await test.step("unauthenticated user navigates directly to the expert dashboard", async () => {
      await page.goto("/expert/dashboard", { waitUntil: "networkidle" });
    });

    await test.step("app redirects the user away from the expert dashboard", async () => {
      // Expert dashboard has a 2s debounce before redirect — wait for redirect or page to settle
      // Without a wallet connection or expert session, user should not stay on dashboard
      await expect(page).not.toHaveURL(/expert\/dashboard/, { timeout: 15000 });
    });
  });

  test("candidate user accessing /expert/dashboard gets redirected", async ({
    page,
  }) => {
    await test.step("candidate signs in with a clean session", async () => {
      await signupCandidate(page);
    });

    await test.step("candidate navigates directly to the expert dashboard", async () => {
      await page.goto("/expert/dashboard", { waitUntil: "networkidle" });
    });

    await test.step("app redirects the candidate away from the expert dashboard", async () => {
      // Candidate should be redirected away from expert dashboard
      await expect(page).not.toHaveURL(/expert\/dashboard/, { timeout: 15000 });
    });
  });

  test("company user accessing /expert/voting does not crash", async ({
    page,
  }) => {
    await test.step("company auth session is established in localStorage", async () => {
      // Navigate to app to get a page context
      await page.goto("/", { waitUntil: "networkidle" });

      // Set company auth manually to test cross-role access
      await page.evaluate(() => {
        localStorage.setItem("userType", "company");
        localStorage.setItem("authToken", "fake-token");
      });
    });

    await test.step("company user navigates to the expert voting route", async () => {
      await page.goto("/expert/voting", { waitUntil: "networkidle" });
    });

    await test.step("the page renders without crashing", async () => {
      // Page should not crash — verify body has content
      const bodyText = await page.textContent("body");
      expect(bodyText).toBeTruthy();
    });
  });

  test("/expert/withdrawals renders the staking portfolio for a seeded expert", async ({
    page,
  }) => {
    await test.step("expert session is seeded in localStorage", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page);
    });

    await test.step("expert navigates to the withdrawals page", async () => {
      await page.goto("/expert/withdrawals", { waitUntil: "networkidle" });
    });

    await test.step("the withdrawals page shows the staking portfolio", async () => {
      // In E2E mode useExpertAccount treats the seeded localStorage walletAddress
      // as a connected wallet, so the page renders the portfolio (not the
      // "Wallet Not Connected" gate, which only appears with no expert session).
      await expect(
        page.getByRole("heading", { name: "Withdrawals", level: 1 }),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Total staked").first()).toBeVisible();
    });
  });

  test("/expert/withdrawals shows 'Wallet Not Connected' without an expert session", async ({
    page,
  }) => {
    await test.step("visitor opens the withdrawals page with no expert session", async () => {
      await page.goto("/expert/withdrawals", { waitUntil: "networkidle" });
    });

    await test.step("the withdrawals page prompts to connect a wallet", async () => {
      // With no wagmi wallet and no localStorage expert session, useExpertAccount
      // returns no address, so the wallet gate is shown.
      await expect(
        page.getByText("Wallet Not Connected"),
      ).toBeVisible({ timeout: 15000 });
    });
  });
});
