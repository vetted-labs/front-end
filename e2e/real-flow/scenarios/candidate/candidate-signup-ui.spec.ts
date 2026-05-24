import { test, expect } from "../../fixtures";
import type { Page } from "@playwright/test";

// The candidate signup form lives at /auth/signup?type=candidate.
// Required fields: Full Name, Current Occupation, LinkedIn URL, Email,
// Password, Confirm (password), TOS checkbox.
// Submit button label: "Create Account" (disabled until TOS is checked).
// On success the FE redirects to /candidate/dashboard.

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4100";

async function fillAndExpect(
  page: Page,
  placeholder: string,
  value: string,
): Promise<void> {
  const field = page.getByPlaceholder(placeholder);
  await field.waitFor({ state: "visible", timeout: 15_000 });
  await field.fill(value);
  await expect(field).toHaveValue(value, { timeout: 15_000 });
}

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
    await page.addInitScript(() => {
      try {
        for (const key of Object.keys(window.localStorage)) {
          if (key.startsWith("vetted:draft:signup:")) {
            window.localStorage.removeItem(key);
          }
        }
        window.sessionStorage.removeItem("vetted:anon-tab-id");
      } catch {
        // The script runs again once the app origin is available.
      }
    });
    await page.goto("/auth/signup?type=candidate", {
      waitUntil: "domcontentloaded",
    });

    // Wait for React to hydrate the form before interacting.
    await page.getByPlaceholder("John Doe").waitFor({ state: "visible", timeout: 15_000 });
    await page.waitForTimeout(750);

    await fillAndExpect(page, "John Doe", fullName);
    await fillAndExpect(page, "Senior Software Engineer", "E2E Tester");
    await fillAndExpect(
      page,
      "https://linkedin.com/in/yourname",
      `https://linkedin.com/in/e2e-${timestamp}`,
    );
    await fillAndExpect(page, "you@example.com", email);
    await fillAndExpect(page, "Min. 6 characters", password);
    await fillAndExpect(page, "Repeat password", password);

    // TOS checkbox must be checked — submit button is disabled without it.
    await page.getByRole("checkbox").check();
    await fillAndExpect(page, "John Doe", fullName);
    await fillAndExpect(page, "Senior Software Engineer", "E2E Tester");
    await fillAndExpect(
      page,
      "https://linkedin.com/in/yourname",
      `https://linkedin.com/in/e2e-${timestamp}`,
    );
    await fillAndExpect(page, "you@example.com", email);

    await page.getByRole("button", { name: /create account/i }).click();
  });

  await test.step("dashboard renders with the candidate's name", async () => {
    await page.waitForURL(/\/candidate\/dashboard/, { timeout: 30_000 });
    await expect(page.getByText(/welcome back, test/i)).toBeVisible({
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
