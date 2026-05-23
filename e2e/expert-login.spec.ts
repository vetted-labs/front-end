import { test, expect } from "@playwright/test";

test.describe("Expert login page", () => {
  test("login page has 3 user type tabs (Job Seeker, Employer, Expert)", async ({
    page,
  }) => {
    await test.step("visitor opens the login page", async () => {
      await page.goto("/auth/login", { waitUntil: "networkidle" });
    });

    await test.step("all three user type tabs are visible", async () => {
      await expect(page.getByRole("button", { name: "Job Seeker" })).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole("button", { name: "Company" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Expert" })).toBeVisible();
    });
  });

  test("expert tab renders wallet connection subtitle", async ({ page }) => {
    await test.step("visitor opens the login page on the Expert tab", async () => {
      await page.goto("/auth/login?type=expert", { waitUntil: "networkidle" });
    });

    await test.step("the wallet connection subtitle is shown on the Expert tab", async () => {
      await expect(
        page.getByText("Experts authenticate with their Web3 wallet", { exact: false }),
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test("expert tab shows a wallet connection entry point", async ({ page }) => {
    await test.step("visitor opens the login page on the Expert tab", async () => {
      await page.goto("/auth/login?type=expert", { waitUntil: "networkidle" });

      // Wait for the wallet panel to mount (wagmi hydration)
      await expect(
        page.getByText("Experts authenticate with their Web3 wallet", { exact: false }),
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("the Connect Wallet action and supported-wallets note are rendered", async () => {
      // The redesign moved individual connectors (MetaMask, Coinbase, etc.)
      // into the RainbowKit modal that this button opens. The page itself now
      // surfaces a single Connect Wallet entry point plus a supported-wallets note.
      await expect(
        page.getByRole("button", { name: /Connect Wallet/i }),
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText(/Supports MetaMask, Coinbase/i),
      ).toBeVisible();
    });
  });

  test("'Apply to become an expert' link navigates to /expert/apply", async ({
    page,
  }) => {
    await test.step("visitor opens the login page on the Expert tab", async () => {
      await page.goto("/auth/login?type=expert", { waitUntil: "networkidle" });
      await expect(page.getByText("Apply to become an expert")).toBeVisible({ timeout: 15000 });
    });

    await test.step("visitor clicks the Apply to become an expert link", async () => {
      await page.getByText("Apply to become an expert").click();
    });

    await test.step("visitor lands on the expert application page", async () => {
      await page.waitForURL("**/expert/apply", { timeout: 10000 });
    });
  });

  test("switching tabs changes form type (Expert has no email field, Job Seeker has email field)", async ({
    page,
  }) => {
    await test.step("visitor opens the login page on the Expert tab", async () => {
      await page.goto("/auth/login?type=expert", { waitUntil: "networkidle" });
      await expect(
        page.getByText("Experts authenticate with their Web3 wallet", { exact: false }),
      ).toBeVisible({ timeout: 15000 });
    });

    await test.step("Expert tab shows wallet connectors and no email field", async () => {
      await expect(page.getByPlaceholder("you@example.com")).toBeHidden();
    });

    await test.step("visitor switches to the Job Seeker tab", async () => {
      await page.getByRole("button", { name: "Job Seeker" }).click();
      await page.waitForURL(/type=candidate/);
    });

    await test.step("Job Seeker tab shows the email field", async () => {
      await expect(page.getByPlaceholder("you@example.com")).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test("signup page does NOT have Expert tab", async ({ page }) => {
    await test.step("visitor opens the signup page", async () => {
      await page.goto("/auth/signup", { waitUntil: "networkidle" });
    });

    await test.step("Job Seeker and Employer tabs are present but Expert tab is absent", async () => {
      await expect(page.getByText("Job Seeker")).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Employer")).toBeVisible();

      // Expert tab should not exist on signup — experts apply, not signup
      const expertTabs = page.locator("button", { hasText: "Expert" });
      await expect(expertTabs).toHaveCount(0);
    });
  });
});
