import { Page } from "@playwright/test";
import { setAuthToken } from "./auth-utils";

interface CandidateCredentials {
  email: string;
  password: string;
  token: string;
  candidateId: string;
  fullName: string;
}

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

// Expert session helpers moved to ./expert-auth.ts

/**
 * Creates a fresh candidate account with a unique email.
 *
 * Hits the BE signup API directly + writes the resulting auth state into
 * localStorage. Skips the FE signup form to avoid coupling tests to its
 * required-field set + button-disabled state machine. Faster and more
 * deterministic than driving the form.
 */
export async function signupCandidate(
  page: Page,
): Promise<CandidateCredentials> {
  const timestamp = Date.now();
  const email = `e2e-${timestamp}@vetted-test.com`;
  const password = "TestPass123!";
  const fullName = `E2E User ${timestamp}`;

  // Land on the app first so localStorage writes target the right origin.
  await page.goto("/auth/signup?type=candidate", {
    waitUntil: "domcontentloaded",
  });

  // Hit the candidate signup endpoint directly.
  const res = await page.request.post(`${BACKEND_URL}/api/candidates`, {
    data: {
      fullName,
      email,
      password,
      phone: "",
      headline: "E2E Tester",
      experienceLevel: "mid",
      socialLinks: [
        {
          platform: "linkedin",
          label: "LinkedIn",
          url: `https://linkedin.com/in/e2e-${timestamp}`,
        },
      ],
    },
  });
  if (!res.ok()) {
    throw new Error(
      `signupCandidate failed: ${res.status()} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as {
    data: {
      token: string;
      refreshToken?: string;
      candidate: { id: string; email: string };
    };
  };
  const { token, refreshToken, candidate } = body.data;

  // Leave the signup page before writing auth; its mount effect intentionally
  // clears token auth and can race with direct localStorage setup.
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // Mirror what the FE's auth.login() writes so guarded routes work.
  await setAuthToken(page, token, {
    refreshToken,
    userType: "candidate",
    candidateId: candidate.id,
    candidateEmail: candidate.email,
    clearConflicting: true,
  });

  return { email, password, token, candidateId: candidate.id, fullName };
}

/**
 * Logs in an existing candidate account.
 */
export async function loginCandidate(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/auth/login?type=candidate", {
    waitUntil: "domcontentloaded",
  });

  // Wait for React to hydrate
  await page
    .getByPlaceholder("you@example.com")
    .waitFor({ state: "visible", timeout: 30000 });

  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("Enter your password").fill(password);

  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  await page.waitForURL("**/candidate/dashboard", { timeout: 15000 });
}

/**
 * Logs out by clearing browser auth state and returning to candidate login.
 *
 * Most E2E specs are not testing the logout button itself; direct cleanup keeps
 * setup deterministic even while React is re-rendering the sidebar.
 */
export async function logoutCandidate(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("companyAuthToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("candidateId");
    localStorage.removeItem("candidateEmail");
    localStorage.removeItem("companyId");
    localStorage.removeItem("companyEmail");
    localStorage.removeItem("userType");
  });
  await page.goto("/auth/login?type=candidate", {
    waitUntil: "domcontentloaded",
  });
}
