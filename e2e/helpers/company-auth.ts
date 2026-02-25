import { Page, expect } from "@playwright/test";

interface CompanyCredentials {
  email: string;
  password: string;
  companyName: string;
}

/**
 * Creates a fresh company account with a unique email.
 * Returns credentials for re-login.
 */
export async function signupCompany(page: Page): Promise<CompanyCredentials> {
  const timestamp = Date.now();
  const email = `e2e-company-${timestamp}@vetted-test.com`;
  const password = "TestPass123!";
  const companyName = `E2E Corp ${timestamp}`;

  await page.goto("/auth/signup?type=company", { waitUntil: "networkidle" });

  // Wait for React to hydrate and render the form
  await page.getByPlaceholder("Acme Inc.").waitFor({ state: "visible", timeout: 30000 });

  // Fill company signup form
  await page.getByPlaceholder("Acme Inc.").fill(companyName);
  await page.getByPlaceholder("https://example.com").fill("https://e2e-test.com");
  await page.getByPlaceholder("you@example.com").fill(email);

  // Password fields
  await page.getByPlaceholder("Min. 6 characters").fill(password);
  await page.getByPlaceholder("Repeat password").fill(password);

  // Submit
  await page.getByRole("button", { name: "Create Account" }).click();

  // Wait for redirect to company dashboard
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  return { email, password, companyName };
}

/**
 * Logs in an existing company account.
 */
export async function loginCompany(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/auth/login?type=company", { waitUntil: "networkidle" });

  // Wait for React to hydrate
  await page.getByPlaceholder("you@example.com").waitFor({ state: "visible", timeout: 30000 });

  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("Enter your password").fill(password);

  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

/**
 * Logs out the current company user via sidebar.
 */
export async function logoutCompany(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Logout" }).click();
  await page.waitForURL(/\/(auth\/(signup|login)|$)/, { timeout: 10000 });
}
