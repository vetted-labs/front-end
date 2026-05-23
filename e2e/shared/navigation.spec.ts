import { test, expect } from "@playwright/test";
import { signupCandidate } from "../helpers/auth";
import { signupCompany } from "../helpers/company-auth";

test.describe("Navigation and route protection", () => {
  test("unauthenticated user accessing /candidate/profile gets redirected to login", async ({
    page,
  }) => {
    await test.step("unauthenticated user navigates directly to the candidate profile", async () => {
      await page.goto("/candidate/profile", { waitUntil: "networkidle" });
    });

    await test.step("app redirects the user to the candidate login page", async () => {
      // App redirects to login (not signup)
      await page.waitForURL(/auth\/login.*type=candidate/, { timeout: 15000 });
    });
  });

  test("unauthenticated user accessing /dashboard gets redirected to login", async ({
    page,
  }) => {
    await test.step("unauthenticated user navigates directly to the company dashboard", async () => {
      await page.goto("/dashboard", { waitUntil: "networkidle" });
    });

    await test.step("app redirects the user to the company login page", async () => {
      await page.waitForURL(/auth\/login.*type=company/, { timeout: 15000 });
    });
  });

  test("candidate user accessing /dashboard gets redirected to candidate dashboard", async ({
    page,
  }) => {
    await test.step("candidate signs in with a clean session", async () => {
      await signupCandidate(page);
    });

    await test.step("candidate navigates to the company dashboard", async () => {
      // Try to access company dashboard
      await page.goto("/dashboard", { waitUntil: "networkidle" });
    });

    await test.step("app redirects the candidate to their own dashboard", async () => {
      // useRequireAuth redirects a wrong-type candidate to /candidate/dashboard
      await page.waitForURL(/candidate\/dashboard/, { timeout: 15000 });
    });
  });

  test("company user accessing /candidate/profile gets redirected to dashboard", async ({
    page,
  }) => {
    await test.step("company user signs in with a clean session", async () => {
      await signupCompany(page);
    });

    await test.step("company user navigates to the candidate profile route", async () => {
      // Try to access candidate profile
      await page.goto("/candidate/profile", { waitUntil: "networkidle" });
    });

    await test.step("app redirects the company user back to the company dashboard", async () => {
      // Should redirect to company dashboard
      await page.waitForURL(/dashboard/, { timeout: 15000 });
    });
  });

  test("login page links to signup and vice versa", async ({ page }) => {
    await test.step("user opens the candidate login page", async () => {
      // Login page should have "Sign up" link
      await page.goto("/auth/login?type=candidate", { waitUntil: "networkidle" });
      await page.getByPlaceholder("you@example.com").waitFor({ state: "visible", timeout: 30000 });
    });

    await test.step("user clicks Sign up and lands on the signup page", async () => {
      const signUpLink = page.getByRole("button", { name: "Sign up" });
      await expect(signUpLink).toBeVisible();
      await signUpLink.click();
      await page.waitForURL(/auth\/signup/, { timeout: 10000 });
    });

    await test.step("the signup page shows the Sign in link back to login", async () => {
      // Signup page should have "Sign in" link
      await page.getByPlaceholder("John Doe").waitFor({ state: "visible", timeout: 30000 });
      const signInLink = page.getByRole("button", { name: "Sign in" });
      await expect(signInLink).toBeVisible();
    });
  });

  test("homepage loads without critical errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await test.step("user visits the homepage", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
    });

    await test.step("the homepage has content and no critical console errors", async () => {
      // Page should have content
      const bodyText = await page.textContent("body");
      expect(bodyText?.length).toBeGreaterThan(0);

      // Filter out non-critical errors
      const criticalErrors = consoleErrors.filter(
        (err) =>
          !err.includes("Content Security Policy") &&
          !err.includes("favicon") &&
          !err.includes("third-party") &&
          !err.includes("hydration") &&
          !err.includes("warning")
      );
      expect(criticalErrors).toHaveLength(0);
    });
  });

  // UX GAP (flagged 2026-05-22): the redesigned login page uses a split-screen
  // layout with no top nav, so — unlike the signup page (AuthPageLayout) — it has
  // no "Back to Home" affordance. Parked until product decides whether login
  // should regain a home link for consistency. See COVERAGE_GAP_MAP.md.
  test.skip("Back to Home link on login page navigates to homepage", async ({
    page,
  }) => {
    await test.step("user opens the candidate login page", async () => {
      await page.goto("/auth/login?type=candidate", { waitUntil: "networkidle" });
      await page.getByPlaceholder("you@example.com").waitFor({ state: "visible", timeout: 30000 });
    });

    await test.step("user clicks Back to Home and lands on the homepage", async () => {
      await page.getByText("Back to Home").click();
      await page.waitForURL(/^http:\/\/localhost:\d+\/?$/, { timeout: 10000 });
    });
  });

  test("Back to Home link on signup page navigates to homepage", async ({
    page,
  }) => {
    await test.step("user opens the candidate signup page", async () => {
      await page.goto("/auth/signup?type=candidate", { waitUntil: "networkidle" });
      await page.getByPlaceholder("John Doe").waitFor({ state: "visible", timeout: 30000 });
    });

    await test.step("user clicks Back to Home and lands on the homepage", async () => {
      await page.getByText("Back to Home").click();
      await page.waitForURL(/^http:\/\/localhost:\d+\/?$/, { timeout: 10000 });
    });
  });
});
