import { test, expect } from "../../fixtures";

// The candidate signup form lives at /auth/signup?type=candidate.
// Required fields: Full Name, Current Occupation, LinkedIn URL, Email,
// Password, Confirm (password), TOS checkbox.
// Submit button label: "Create Account" (disabled until TOS is checked).
// On success the FE redirects to /candidate/dashboard.

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4100";

test("candidate signs up via UI and lands on dashboard", async ({
  page,
  request,
  cleanState: _cleanState,
}) => {
  void _cleanState;

  const timestamp = Date.now();
  const email = `cand-${timestamp}@e2e.local`;
  const password = "Pa55w0rd!Test";
  const fullName = "Test Candidate";

  await test.step("candidate fills the signup form", async () => {
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

    // TOS checkbox must be checked — submit button is disabled without it.
    await page.getByRole("checkbox").check();

    await page.getByRole("button", { name: /create account/i }).click();
  });

  await test.step("dashboard renders with the candidate's name", async () => {
    await page.waitForURL(/\/candidate\/dashboard/, { timeout: 30_000 });
    await expect(page.getByText(/test candidate/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  await test.step("backend persisted the account — login should now succeed", async () => {
    const res = await request.post(`${BACKEND_URL}/api/candidates/login`, {
      data: { email, password },
    });
    expect(res.status()).toBe(200);
  });
});
