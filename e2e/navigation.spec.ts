import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";
import { signupCompany } from "./helpers/company-auth";

test.describe("Navigation and route protection", () => {
  test("unauthenticated user accessing /candidate/profile gets redirected to login", async ({
    page,
  }) => {
    await page.goto("/candidate/profile", { waitUntil: "networkidle" });
    // App redirects to login (not signup)
    await page.waitForURL(/auth\/login.*type=candidate/, { timeout: 15000 });
  });

  test("unauthenticated user accessing /dashboard gets redirected to login", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForURL(/auth\/login.*type=company/, { timeout: 15000 });
  });

  test("candidate user accessing /dashboard gets redirected to candidate profile", async ({
    page,
  }) => {
    await signupCandidate(page);

    // Try to access company dashboard
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    // Should redirect to candidate profile
    await page.waitForURL(/candidate\/profile/, { timeout: 15000 });
  });

  test("company user accessing /candidate/profile gets redirected to dashboard", async ({
    page,
  }) => {
    await signupCompany(page);

    // Try to access candidate profile
    await page.goto("/candidate/profile", { waitUntil: "networkidle" });

    // Should redirect to company dashboard
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  });

  test("login page links to signup and vice versa", async ({ page }) => {
    // Login page should have "Sign up" link
    await page.goto("/auth/login?type=candidate", { waitUntil: "networkidle" });
    await page.getByPlaceholder("you@example.com").waitFor({ state: "visible", timeout: 30000 });

    const signUpLink = page.getByRole("button", { name: "Sign up" });
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();
    await page.waitForURL(/auth\/signup/, { timeout: 10000 });

    // Signup page should have "Sign in" link
    await page.getByPlaceholder("John Doe").waitFor({ state: "visible", timeout: 30000 });
    const signInLink = page.getByRole("button", { name: "Sign in" });
    await expect(signInLink).toBeVisible();
  });

  test("homepage loads without critical errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/", { waitUntil: "networkidle" });

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

  test("Back to Home link on login page navigates to homepage", async ({
    page,
  }) => {
    await page.goto("/auth/login?type=candidate", { waitUntil: "networkidle" });
    await page.getByPlaceholder("you@example.com").waitFor({ state: "visible", timeout: 30000 });

    await page.getByText("Back to Home").click();
    await page.waitForURL(/^http:\/\/localhost:\d+\/?$/, { timeout: 10000 });
  });

  test("Back to Home link on signup page navigates to homepage", async ({
    page,
  }) => {
    await page.goto("/auth/signup?type=candidate", { waitUntil: "networkidle" });
    await page.getByPlaceholder("John Doe").waitFor({ state: "visible", timeout: 30000 });

    await page.getByText("Back to Home").click();
    await page.waitForURL(/^http:\/\/localhost:\d+\/?$/, { timeout: 10000 });
  });
});
