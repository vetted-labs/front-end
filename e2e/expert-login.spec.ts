import { test, expect } from "@playwright/test";

test.describe("Expert login page", () => {
  test("login page has 3 user type tabs (Job Seeker, Employer, Expert)", async ({
    page,
  }) => {
    await page.goto("/auth/login", { waitUntil: "networkidle" });

    await expect(page.getByText("Job Seeker")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Employer")).toBeVisible();
    await expect(page.getByText("Expert")).toBeVisible();
  });

  test("expert tab renders wallet connection subtitle", async ({ page }) => {
    await page.goto("/auth/login?type=expert", { waitUntil: "networkidle" });

    await expect(
      page.getByText("connect your wallet to get started", { exact: false }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("expert tab shows wallet connector buttons", async ({ page }) => {
    await page.goto("/auth/login?type=expert", { waitUntil: "networkidle" });

    // Wait for connectors to mount (wagmi hydration)
    await expect(
      page.getByText("connect your wallet to get started", { exact: false }),
    ).toBeVisible({ timeout: 15000 });

    // MetaMask and Coinbase Wallet connector buttons should be rendered
    await expect(page.getByText("MetaMask")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Coinbase Wallet")).toBeVisible();
  });

  test("'Apply to become an expert' link navigates to /expert/apply", async ({
    page,
  }) => {
    await page.goto("/auth/login?type=expert", { waitUntil: "networkidle" });

    const applyLink = page.getByText("Apply to become an expert");
    await expect(applyLink).toBeVisible({ timeout: 15000 });

    await applyLink.click();
    await page.waitForURL("**/expert/apply", { timeout: 10000 });
  });

  test("switching tabs changes form type (Expert has no email field, Job Seeker has email field)", async ({
    page,
  }) => {
    await page.goto("/auth/login?type=expert", { waitUntil: "networkidle" });

    // Expert tab: no email input, wallet connectors instead
    await expect(
      page.getByText("connect your wallet to get started", { exact: false }),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByPlaceholder("you@example.com")).toBeHidden();

    // Switch to Job Seeker
    await page.getByText("Job Seeker").click();
    await page.waitForURL(/type=candidate/);

    // Job Seeker tab: email field visible
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible({
      timeout: 10000,
    });
  });

  test("signup page does NOT have Expert tab", async ({ page }) => {
    await page.goto("/auth/signup", { waitUntil: "networkidle" });

    await expect(page.getByText("Job Seeker")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Employer")).toBeVisible();

    // Expert tab should not exist on signup — experts apply, not signup
    const expertTabs = page.locator("button", { hasText: "Expert" });
    await expect(expertTabs).toHaveCount(0);
  });
});
