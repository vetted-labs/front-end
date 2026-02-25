import { test, expect } from "@playwright/test";
import { signupCandidate, loginCandidate, logoutCandidate } from "./helpers/auth";
import { signupCompany } from "./helpers/company-auth";
import {
  MOCK_EXPERT,
  setExpertSession,
  clearExpertSession,
  expectExpertSession,
  expectNoExpertSession,
} from "./helpers/expert-auth";

test.describe("Expert session management via localStorage", () => {
  test("setExpertSession correctly sets all 3 localStorage keys", async ({
    page,
  }) => {
    await page.goto("/");
    await setExpertSession(page);
    await expectExpertSession(page);
  });

  test("clearExpertSession removes all expert keys", async ({ page }) => {
    await page.goto("/");
    await setExpertSession(page);
    await expectExpertSession(page);

    await clearExpertSession(page);
    await expectNoExpertSession(page);

    // userType should also be cleared
    const userType = await page.evaluate(() =>
      localStorage.getItem("userType"),
    );
    expect(userType).toBeNull();
  });

  test("candidate signup clears pre-existing expert session", async ({
    page,
  }) => {
    await page.goto("/");
    await setExpertSession(page);
    await expectExpertSession(page);

    // Signup as candidate — should clear expert data
    await signupCandidate(page);

    await expectNoExpertSession(page);
    const userType = await page.evaluate(() =>
      localStorage.getItem("userType"),
    );
    expect(userType).toBe("candidate");
  });

  test("candidate login clears pre-existing expert session", async ({
    page,
  }) => {
    // Create account first
    const { email, password } = await signupCandidate(page);
    await logoutCandidate(page);

    // Inject stale expert session
    await setExpertSession(page);
    await expectExpertSession(page);

    // Login as candidate — should clear expert data
    await loginCandidate(page, email, password);

    await expectNoExpertSession(page);
    const userType = await page.evaluate(() =>
      localStorage.getItem("userType"),
    );
    expect(userType).toBe("candidate");
  });

  test("company signup clears pre-existing expert session", async ({
    page,
  }) => {
    await page.goto("/");
    await setExpertSession(page);
    await expectExpertSession(page);

    // Signup as company — should clear expert data
    await signupCompany(page);

    await expectNoExpertSession(page);
    const userType = await page.evaluate(() =>
      localStorage.getItem("userType"),
    );
    expect(userType).toBe("company");
  });
});
