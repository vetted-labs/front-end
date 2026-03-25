import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";

test.describe("Candidate full journey", () => {
  test("candidate signs up and lands on dashboard", async ({ page }) => {
    await signupCandidate(page);

    // Verify redirect to candidate dashboard
    expect(page.url()).toContain("/candidate/dashboard");

    // Verify welcome heading with the candidate name
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: /Welcome back, E2E/ }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("candidate can navigate to all sidebar pages", async ({ page }) => {
    await signupCandidate(page);
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Navigate to Applications via sidebar
    await page.getByRole("link", { name: "Applications" }).first().click();
    await page.waitForTimeout(2000);
    const bodyText1 = await page.textContent("body");
    expect(bodyText1).toBeTruthy();
    expect(bodyText1!.length).toBeGreaterThan(50);

    // Navigate to Guilds via sidebar
    await page.getByRole("link", { name: "Guilds" }).first().click();
    await page.waitForTimeout(2000);
    const bodyText2 = await page.textContent("body");
    expect(bodyText2).toBeTruthy();
    expect(bodyText2!.length).toBeGreaterThan(50);

    // Navigate to Messages via sidebar
    await page.getByRole("link", { name: "Messages" }).first().click();
    await page.waitForTimeout(2000);
    const bodyText3 = await page.textContent("body");
    expect(bodyText3).toBeTruthy();
    expect(bodyText3!.length).toBeGreaterThan(50);

    // Navigate to Notifications via sidebar
    await page.getByRole("link", { name: "Notifications" }).first().click();
    await page.waitForTimeout(2000);
    const bodyText4 = await page.textContent("body");
    expect(bodyText4).toBeTruthy();
    expect(bodyText4!.length).toBeGreaterThan(50);

    // Navigate to Profile via sidebar
    await page.getByRole("link", { name: "Profile" }).first().click();
    await page.waitForTimeout(2000);
    const bodyText5 = await page.textContent("body");
    expect(bodyText5).toBeTruthy();
    expect(bodyText5!.length).toBeGreaterThan(50);

    // Navigate back to Dashboard via sidebar
    await page.getByRole("link", { name: "Dashboard" }).first().click();
    await page.waitForTimeout(2000);
    await expect(
      page.getByRole("heading", { name: /Welcome back, E2E/ }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("candidate can browse jobs from dashboard", async ({ page }) => {
    await signupCandidate(page);
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Navigate to browse jobs page
    await page.goto("/browse/jobs", { waitUntil: "networkidle" });

    // Verify the search input renders
    await expect(
      page.getByPlaceholder(/Role, company|search/i).first(),
    ).toBeVisible({ timeout: 15000 });

    // Verify the page has content (no blank screen)
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(100);
  });

  test("candidate profile shows correct info after signup", async ({ page }) => {
    await signupCandidate(page);

    // Navigate to profile page
    await page.goto("/candidate/profile", { waitUntil: "networkidle" });
    await expect(page.getByText("Loading your dashboard...")).toBeHidden({ timeout: 15000 });

    // Verify the candidate's name appears (contains "E2E User")
    await expect(page.getByText(/E2E User/).first()).toBeVisible({ timeout: 15000 });

    // Verify the "Profile & Resume" tab exists
    await expect(
      page.getByRole("button", { name: "Profile & Resume" }),
    ).toBeVisible();
  });
});
