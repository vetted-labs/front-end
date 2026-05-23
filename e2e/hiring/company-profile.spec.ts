import { test, expect } from "@playwright/test";
import { signupCompany } from "../helpers/company-auth";

/**
 * The company profile lives at /dashboard/company-profile in the redesigned IA
 * (linked from the company sidebar). It renders inside the dashboard AppShell,
 * so sidebar navigation (e.g. back to Dashboard) is available here.
 *
 * useRequireAuth("company") reads the shared AuthContext token (authToken), so
 * no localStorage token-copy workaround is needed anymore.
 */
const PROFILE_PATH = "/dashboard/company-profile";

test.describe("Company profile page", () => {
  test("loads profile page with company information", async ({ page }) => {
    let companyName: string;

    await test.step("company signs up", async () => {
      ({ companyName } = await signupCompany(page));
    });

    await test.step("company navigates to the profile page and it finishes loading", async () => {
      await page.goto(PROFILE_PATH, { waitUntil: "domcontentloaded" });
      // The company name renders as the profile hero heading once loaded.
      await expect(
        page.getByRole("heading", { name: companyName! })
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test("can navigate back to the dashboard from the sidebar", async ({ page }) => {
    await test.step("company signs up and navigates to the profile page", async () => {
      await signupCompany(page);
      await page.goto(PROFILE_PATH, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: "Basics" })
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("company clicks the Dashboard sidebar link and returns to the dashboard", async () => {
      await page.getByRole("link", { name: "Dashboard", exact: true }).click();
      await page.waitForURL("**/dashboard", { timeout: 10000 });
    });
  });

  test("shows logo controls with an Upload logo button", async ({ page }) => {
    await test.step("company signs up and navigates to the profile page", async () => {
      await signupCompany(page);
      await page.goto(PROFILE_PATH, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: "Basics" })
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("an Upload logo button is visible", async () => {
      await expect(
        page.getByRole("button", { name: "Upload logo" })
      ).toBeVisible();
    });
  });

  test("shows company information sections with Edit profile button", async ({ page }) => {
    await test.step("company signs up and navigates to the profile page", async () => {
      await signupCompany(page);
      await page.goto(PROFILE_PATH, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: "Basics" })
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("Basics and About sections are visible with an Edit profile button", async () => {
      await expect(page.getByRole("heading", { name: "Basics" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Edit profile" })
      ).toBeVisible();
    });
  });

  test("enters edit mode and shows form fields", async ({ page }) => {
    await test.step("company signs up and navigates to the profile page", async () => {
      await signupCompany(page);
      await page.goto(PROFILE_PATH, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("button", { name: "Edit profile" })
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("company clicks Edit profile to enter edit mode", async () => {
      await page.getByRole("button", { name: "Edit profile" }).click();
    });

    await test.step("Save changes and Cancel buttons are visible in edit mode", async () => {
      await expect(
        page.getByRole("button", { name: /Save changes/i })
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /Cancel/i })).toBeVisible();
    });
  });

  test("edits profile and saves changes", async ({ page }) => {
    await test.step("company signs up and navigates to the profile page", async () => {
      await signupCompany(page);
      await page.goto(PROFILE_PATH, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("button", { name: "Edit profile" })
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("company enters edit mode and updates the description", async () => {
      await page.getByRole("button", { name: "Edit profile" }).click();

      const descriptionField = page.getByPlaceholder("Tell us about your company...");
      await descriptionField.fill("Updated via E2E test");
    });

    await test.step("company saves the changes and the profile is updated successfully", async () => {
      await page.getByRole("button", { name: /Save changes/i }).click();

      await expect(page.getByText("Profile updated successfully!")).toBeVisible({
        timeout: 10000,
      });

      // Should exit edit mode
      await expect(
        page.getByRole("button", { name: "Edit profile" })
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test("cancel button discards changes", async ({ page }) => {
    await test.step("company signs up and navigates to the profile page", async () => {
      await signupCompany(page);
      await page.goto(PROFILE_PATH, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("button", { name: "Edit profile" })
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("company enters edit mode then clicks Cancel", async () => {
      await page.getByRole("button", { name: "Edit profile" }).click();
      await page.getByRole("button", { name: /Cancel/i }).click();
    });

    await test.step("edit mode is exited without saving and Edit profile button returns", async () => {
      await expect(
        page.getByRole("button", { name: "Edit profile" })
      ).toBeVisible();
    });
  });

  test("shows Account section with member-since and last-updated", async ({ page }) => {
    await test.step("company signs up and navigates to the profile page", async () => {
      await signupCompany(page);
      await page.goto(PROFILE_PATH, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: "Account" })
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("Account section shows member-since and last-updated fields", async () => {
      await expect(page.getByText("Member since")).toBeVisible();
      await expect(page.getByText("Last updated")).toBeVisible();
    });
  });

  test("redirects to login when not authenticated", async ({ page }) => {
    await test.step("unauthenticated visitor attempts to open the company profile page", async () => {
      await page.goto(PROFILE_PATH, { waitUntil: "networkidle" });
    });

    await test.step("visitor is redirected to the company login page", async () => {
      await page.waitForURL(/auth\/login.*type=company/, { timeout: 15000 });
    });
  });
});
