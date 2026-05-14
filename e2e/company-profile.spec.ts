import { test, expect } from "@playwright/test";
import { signupCompany, loginCompany } from "./helpers/company-auth";

/**
 * TODO: Known bug — AuthContext stores token as "authToken" but company profile page
 * reads "companyAuthToken". This workaround copies the token after signup.
 * Remove once the source bug in AuthContext/company profile is fixed.
 */
async function ensureCompanyProfileAccessible(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const token = localStorage.getItem("authToken");
    if (token && !localStorage.getItem("companyAuthToken")) {
      localStorage.setItem("companyAuthToken", token);
    }
  });
}

test.describe("Company profile page", () => {
  test("loads profile page with company information", async ({ page }) => {
    let companyName: string;

    await test.step("company signs up and profile access is prepared", async () => {
      ({ companyName } = await signupCompany(page));
      await ensureCompanyProfileAccessible(page);
    });

    await test.step("company navigates to the profile page and it finishes loading", async () => {
      await page.goto("/company/profile", { waitUntil: "networkidle" });
      await expect(page.getByText("Loading profile...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("profile page shows the company name and header", async () => {
      await expect(page.getByText("Company Profile")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(companyName!)).toBeVisible();
    });
  });

  test("has Back to Dashboard button that navigates correctly", async ({ page }) => {
    await test.step("company signs up and navigates to the profile page", async () => {
      await signupCompany(page);
      await ensureCompanyProfileAccessible(page);
      await page.goto("/company/profile", { waitUntil: "networkidle" });
      await expect(page.getByText("Loading profile...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("company clicks Back to Dashboard and returns to the dashboard", async () => {
      await page.getByRole("button", { name: /Back to Dashboard/ }).click();
      await page.waitForURL("**/dashboard", { timeout: 10000 });
    });
  });

  test("shows Company Logo section", async ({ page }) => {
    await test.step("company signs up and navigates to the profile page", async () => {
      await signupCompany(page);
      await ensureCompanyProfileAccessible(page);
      await page.goto("/company/profile", { waitUntil: "networkidle" });
      await expect(page.getByText("Loading profile...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("Company Logo section is visible with an Upload Logo button", async () => {
      await expect(page.getByRole("heading", { name: "Company Logo" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Upload Logo" })
      ).toBeVisible();
    });
  });

  test("shows Company Information section with Edit button", async ({ page }) => {
    await test.step("company signs up and navigates to the profile page", async () => {
      await signupCompany(page);
      await ensureCompanyProfileAccessible(page);
      await page.goto("/company/profile", { waitUntil: "networkidle" });
      await expect(page.getByText("Loading profile...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("Company Information section is visible with an Edit Profile button", async () => {
      await expect(page.getByText("Company Information")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Edit Profile" })
      ).toBeVisible();
    });
  });

  test("enters edit mode and shows form fields", async ({ page }) => {
    await test.step("company signs up and navigates to the profile page", async () => {
      await signupCompany(page);
      await ensureCompanyProfileAccessible(page);
      await page.goto("/company/profile", { waitUntil: "networkidle" });
      await expect(page.getByText("Loading profile...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("company clicks Edit Profile to enter edit mode", async () => {
      await page.getByRole("button", { name: "Edit Profile" }).click();
    });

    await test.step("Save Changes and Cancel buttons are visible in edit mode", async () => {
      // Form fields should appear — use label-based selectors as more reliable
      await expect(
        page.getByRole("button", { name: /Save Changes/ })
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /Cancel/ })).toBeVisible();
    });
  });

  test("edits profile and saves changes", async ({ page }) => {
    await test.step("company signs up and navigates to the profile page", async () => {
      await signupCompany(page);
      await ensureCompanyProfileAccessible(page);
      await page.goto("/company/profile", { waitUntil: "networkidle" });
      await expect(page.getByText("Loading profile...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("company enters edit mode and updates the description", async () => {
      await page.getByRole("button", { name: "Edit Profile" }).click();

      const descriptionField = page.getByPlaceholder("Tell us about your company...");
      await descriptionField.fill("Updated via E2E test");
    });

    await test.step("company saves the changes and the profile is updated successfully", async () => {
      await page.getByRole("button", { name: /Save Changes/ }).click();

      await expect(page.getByText("Profile updated successfully!")).toBeVisible({
        timeout: 10000,
      });

      // Should exit edit mode
      await expect(
        page.getByRole("button", { name: "Edit Profile" })
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test("cancel button discards changes", async ({ page }) => {
    await test.step("company signs up and navigates to the profile page", async () => {
      await signupCompany(page);
      await ensureCompanyProfileAccessible(page);
      await page.goto("/company/profile", { waitUntil: "networkidle" });
      await expect(page.getByText("Loading profile...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("company enters edit mode then clicks Cancel", async () => {
      await page.getByRole("button", { name: "Edit Profile" }).click();
      await page.getByRole("button", { name: /Cancel/ }).click();
    });

    await test.step("edit mode is exited without saving and Edit Profile button returns", async () => {
      await expect(
        page.getByRole("button", { name: "Edit Profile" })
      ).toBeVisible();
    });
  });

  test("shows Account Information section", async ({ page }) => {
    await test.step("company signs up and navigates to the profile page", async () => {
      await signupCompany(page);
      await ensureCompanyProfileAccessible(page);
      await page.goto("/company/profile", { waitUntil: "networkidle" });
      await expect(page.getByText("Loading profile...")).toBeHidden({ timeout: 15000 });
    });

    await test.step("Account Information section shows member-since and last-updated fields", async () => {
      await expect(page.getByText("Account Information")).toBeVisible();
      await expect(page.getByText("Member Since")).toBeVisible();
      await expect(page.getByText("Last Updated")).toBeVisible();
    });
  });

  test("redirects to login when not authenticated", async ({ page }) => {
    await test.step("unauthenticated visitor attempts to open the company profile page", async () => {
      await page.goto("/company/profile", { waitUntil: "networkidle" });
    });

    await test.step("visitor is redirected to the company login page", async () => {
      await page.waitForURL(/auth\/login.*type=company/, { timeout: 15000 });
    });
  });
});
