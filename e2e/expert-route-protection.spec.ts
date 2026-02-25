import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";
import { setExpertSession } from "./helpers/expert-auth";

test.describe("Expert route protection", () => {
  test("unauthenticated user accessing /expert/dashboard gets redirected", async ({
    page,
  }) => {
    await page.goto("/expert/dashboard", { waitUntil: "networkidle" });

    // Expert dashboard has a 2s debounce before redirect — wait for redirect or page to settle
    // Without a wallet connection or expert session, user should not stay on dashboard
    await expect(page).not.toHaveURL(/expert\/dashboard/, { timeout: 15000 });
  });

  test("candidate user accessing /expert/dashboard gets redirected", async ({
    page,
  }) => {
    await signupCandidate(page);

    await page.goto("/expert/dashboard", { waitUntil: "networkidle" });

    // Candidate should be redirected away from expert dashboard
    await expect(page).not.toHaveURL(/expert\/dashboard/, { timeout: 15000 });
  });

  test("company user accessing /expert/voting does not crash", async ({
    page,
  }) => {
    // Navigate to app to get a page context
    await page.goto("/", { waitUntil: "networkidle" });

    // Set company auth manually to test cross-role access
    await page.evaluate(() => {
      localStorage.setItem("userType", "company");
      localStorage.setItem("authToken", "fake-token");
    });

    await page.goto("/expert/voting", { waitUntil: "networkidle" });

    // Page should not crash — verify body has content
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
  });

  test("/expert/withdrawals shows 'Wallet Not Connected' with expert localStorage set", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);

    await page.goto("/expert/withdrawals", { waitUntil: "networkidle" });

    // Page should show wallet not connected message since there's no real wallet
    await expect(
      page.getByText("Wallet Not Connected"),
    ).toBeVisible({ timeout: 15000 });
  });
});
