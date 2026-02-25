import { Page, expect } from "@playwright/test";

interface CandidateCredentials {
  email: string;
  password: string;
}

// Expert session helpers moved to ./expert-auth.ts

/**
 * Creates a fresh candidate account with a unique email.
 * Returns credentials for re-login.
 */
export async function signupCandidate(page: Page): Promise<CandidateCredentials> {
  const timestamp = Date.now();
  const email = `e2e-${timestamp}@vetted-test.com`;
  const password = "TestPass123!";

  await page.goto("/auth/signup?type=candidate", { waitUntil: "networkidle" });

  // Wait for React to hydrate and render the form
  await page.getByPlaceholder("John Doe").waitFor({ state: "visible", timeout: 30000 });

  // Fill signup form
  await page.getByPlaceholder("John Doe").fill(`E2E User ${timestamp}`);
  await page.getByPlaceholder("Senior Software Engineer").fill("E2E Tester");
  await page.getByPlaceholder("you@example.com").fill(email);

  // Password fields
  await page.getByPlaceholder("Min. 6 characters").fill(password);
  await page.getByPlaceholder("Repeat password").fill(password);

  // Submit
  await page.getByRole("button", { name: "Create Account" }).click();

  // Wait for redirect to candidate profile
  await page.waitForURL("**/candidate/profile", { timeout: 15000 });

  return { email, password };
}

/**
 * Logs in an existing candidate account.
 */
export async function loginCandidate(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/auth/login?type=candidate", { waitUntil: "networkidle" });

  // Wait for React to hydrate
  await page.getByPlaceholder("you@example.com").waitFor({ state: "visible", timeout: 30000 });

  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("Enter your password").fill(password);

  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  await page.waitForURL("**/candidate/profile", { timeout: 15000 });
}

/**
 * Logs out by clicking the sidebar Logout button.
 */
export async function logoutCandidate(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Logout" }).click();
  // After logout, the app may redirect to "/" or "/auth/login" or "/auth/signup"
  await page.waitForURL(/\/(auth\/(signup|login)|$)/, { timeout: 10000 });
}
