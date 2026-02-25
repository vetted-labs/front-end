import { test, expect } from "@playwright/test";
import { signupCompany, loginCompany, logoutCompany } from "./helpers/company-auth";

test.describe("Company authentication", () => {
  test("signs up a new company and lands on dashboard", async ({ page }) => {
    const { email, companyName } = await signupCompany(page);

    // Verify we're on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify auth state in localStorage
    const userType = await page.evaluate(() => localStorage.getItem("userType"));
    expect(userType).toBe("company");

    // Verify token was stored
    const token = await page.evaluate(() => localStorage.getItem("authToken"));
    expect(token).toBeTruthy();
  });

  test("logs in an existing company", async ({ page }) => {
    // First create the account
    const { email, password } = await signupCompany(page);
    await logoutCompany(page);

    // Now log in
    await loginCompany(page, email, password);

    await expect(page).toHaveURL(/\/dashboard/);

    const userType = await page.evaluate(() => localStorage.getItem("userType"));
    expect(userType).toBe("company");
  });

  test("shows error for duplicate company email on signup", async ({ page }) => {
    const { email } = await signupCompany(page);
    await logoutCompany(page);

    // Try to sign up again with same email
    await page.goto("/auth/signup?type=company", { waitUntil: "networkidle" });
    await page.getByPlaceholder("Acme Inc.").waitFor({ state: "visible", timeout: 30000 });

    await page.getByPlaceholder("Acme Inc.").fill("Duplicate Corp");
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("Min. 6 characters").fill("TestPass123!");
    await page.getByPlaceholder("Repeat password").fill("TestPass123!");

    await page.getByRole("button", { name: "Create Account" }).click();

    // Should show duplicate email error
    await expect(page.getByText("already registered")).toBeVisible({ timeout: 10000 });
  });

  test("shows error for invalid login credentials", async ({ page }) => {
    await page.goto("/auth/login?type=company", { waitUntil: "networkidle" });
    await page.getByPlaceholder("you@example.com").waitFor({ state: "visible", timeout: 30000 });

    await page.getByPlaceholder("you@example.com").fill("nonexistent@vetted-test.com");
    await page.getByPlaceholder("Enter your password").fill("WrongPassword1!");

    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    // Should show error message
    await expect(
      page.getByText(/Invalid credentials|Account not found|Something went wrong/)
    ).toBeVisible({ timeout: 10000 });
  });

  test("validates required fields on company signup", async ({ page }) => {
    await page.goto("/auth/signup?type=company", { waitUntil: "networkidle" });
    await page.getByPlaceholder("Acme Inc.").waitFor({ state: "visible", timeout: 30000 });

    // Try to submit with empty form
    await page.getByRole("button", { name: "Create Account" }).click();

    // Should show validation errors
    await expect(page.getByText(/required/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("toggles between candidate and company signup", async ({ page }) => {
    await page.goto("/auth/signup?type=candidate", { waitUntil: "networkidle" });
    await page.getByPlaceholder("John Doe").waitFor({ state: "visible", timeout: 30000 });

    // Candidate-specific fields should be visible
    await expect(page.getByPlaceholder("John Doe")).toBeVisible();
    await expect(page.getByPlaceholder("Senior Software Engineer")).toBeVisible();

    // Switch to company
    await page.getByText("Employer").click();
    await page.waitForURL(/type=company/);

    // Company-specific fields should now be visible
    await expect(page.getByPlaceholder("Acme Inc.")).toBeVisible({ timeout: 5000 });
  });
});
