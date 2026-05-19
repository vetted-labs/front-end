import { test, expect } from "../../fixtures";

test("candidate signup with 500 from BE keeps user on form with error", async ({
  page,
  cleanState,
}) => {
  void cleanState;

  await test.step("intercept signup endpoint with 500 error", async () => {
    await page.route("**/api/candidates", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      } else {
        route.continue();
      }
    });
  });

  const timestamp = Date.now();
  const email = `crash-${timestamp}@e2e.local`;
  const password = "Pa55w0rd!Test";
  const fullName = "Crash Test";

  await test.step("fill signup form with valid data", async () => {
    await page.goto("/auth/signup?type=candidate", {
      waitUntil: "domcontentloaded",
    });

    // Wait for React to hydrate the form before interacting.
    await page.getByPlaceholder("John Doe").waitFor({ state: "visible", timeout: 15_000 });

    await page.getByPlaceholder("John Doe").fill(fullName);
    await page
      .getByPlaceholder("Senior Software Engineer")
      .fill("E2E Tester");
    await page
      .getByPlaceholder("https://linkedin.com/in/yourname")
      .fill(`https://linkedin.com/in/e2e-${timestamp}`);
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("Min. 6 characters").fill(password);
    await page.getByPlaceholder("Repeat password").fill(password);

    // TOS checkbox must be checked.
    await page.getByRole("checkbox").check();
  });

  await test.step("submit form and observe error surface", async () => {
    await page.getByRole("button", { name: /create account/i }).click();

    // Error should appear on the page
    await expect(page.locator(".text-destructive").first()).toBeVisible({
      timeout: 15_000,
    });

    // User should still be on the signup page, not redirected
    await expect(page).toHaveURL(/\/auth\/signup/);
  });

  await test.step("form fields retain their values", async () => {
    // Verify the form wasn't cleared or reset
    await expect(page.getByPlaceholder("John Doe")).toHaveValue(fullName);
    await expect(page.getByPlaceholder("you@example.com")).toHaveValue(email);
  });
});
