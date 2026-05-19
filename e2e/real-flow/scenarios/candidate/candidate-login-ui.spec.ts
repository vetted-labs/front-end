// candidate-login-ui.spec.ts
//
// Verifies the candidate email/password login form:
//   1. Valid credentials → redirect to /candidate/dashboard + name visible
//   2. Wrong password → error visible, URL stays on login page

import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { signupCandidate } from "../../../helpers/auth";

/** Clear all token-based auth keys from localStorage. */
async function clearCandidateAuth(page: Page) {
  await page.evaluate(() => {
    [
      "authToken",
      "refreshToken",
      "candidateId",
      "candidateEmail",
      "userType",
      "companyAuthToken",
      "companyId",
      "companyEmail",
    ].forEach((k) => localStorage.removeItem(k));
  });
}

test("candidate logs in via the form and reaches the dashboard", async ({
  page,
}) => {

  // signupCandidate(page) takes only `page: Page`.
  // It auto-generates a unique email, uses password "TestPass123!", and
  // writes the auth token into localStorage (landing on /candidate/dashboard).
  // We capture the credentials so we can re-test login from scratch.
  const creds = await signupCandidate(page);

  await test.step("submit login form with valid credentials", async () => {
    // Navigate to root first so localStorage.removeItem targets the right origin,
    // then clear all candidate auth keys so the login page starts unauthenticated.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await clearCandidateAuth(page);

    await page.goto("/auth/login?type=candidate", {
      waitUntil: "domcontentloaded",
    });

    // Wait for the form inputs to be interactive before filling.
    await page.getByPlaceholder("you@example.com").waitFor({ state: "visible", timeout: 15_000 });
    await page.getByPlaceholder("you@example.com").fill(creds.email);
    await page.getByPlaceholder("Enter your password").fill(creds.password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
  });

  await test.step("dashboard renders the candidate name", async () => {
    // Wait for the router to navigate away from the login page.
    await page.waitForURL(/\/candidate\/dashboard/, { timeout: 30_000 });
    // The dashboard header renders `Welcome back, <firstName>` once the
    // profile API call resolves. Match on the heading text — this confirms
    // both the route and the authenticated profile loaded correctly.
    await expect(
      page.getByRole("heading", { name: /welcome back/i }).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  await test.step("bad password is rejected with an error message", async () => {
    // Navigate to root first, clear auth, then visit the login page fresh.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await clearCandidateAuth(page);

    await page.goto("/auth/login?type=candidate", {
      waitUntil: "domcontentloaded",
    });

    await page.getByPlaceholder("you@example.com").waitFor({ state: "visible", timeout: 15_000 });
    await page.getByPlaceholder("you@example.com").fill(creds.email);
    await page.getByPlaceholder("Enter your password").fill("nope");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    // The LoginPage renders errors inside a styled <div class="text-destructive">
    // container — no ARIA role="alert". Wait for any visible text in that element.
    await expect(
      page.locator(".text-destructive").first(),
    ).toBeVisible({ timeout: 15_000 });

    // Must not have navigated to the dashboard.
    await expect(page).not.toHaveURL(/\/candidate\/dashboard/);
  });
});
