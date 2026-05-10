import { Page } from "@playwright/test";

interface CandidateCredentials {
  email: string;
  password: string;
  token: string;
  candidateId: string;
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
export async function signupCandidate(page: Page): Promise<CandidateCredentials> {
  const timestamp = Date.now();
  const email = `e2e-${timestamp}@vetted-test.com`;
  const password = "TestPass123!";

  // Land on the app first so localStorage writes target the right origin.
  await page.goto("/auth/signup?type=candidate", { waitUntil: "domcontentloaded" });

  // Hit the candidate signup endpoint directly.
  const res = await page.request.post(`${BACKEND_URL}/api/candidates`, {
    data: {
      fullName: `E2E User ${timestamp}`,
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
    throw new Error(`signupCandidate failed: ${res.status()} ${await res.text()}`);
  }
  const body = (await res.json()) as {
    data: {
      token: string;
      refreshToken?: string;
      candidate: { id: string; email: string };
    };
  };
  const { token, refreshToken, candidate } = body.data;

  // Mirror what the FE's auth.login() writes so guarded routes work.
  await page.evaluate(
    ({ token, refreshToken, candidate }) => {
      localStorage.setItem("authToken", token);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("userType", "candidate");
      localStorage.setItem("candidateId", candidate.id);
      localStorage.setItem("candidateEmail", candidate.email);
    },
    { token, refreshToken, candidate },
  );

  return { email, password, token, candidateId: candidate.id };
}

/**
 * Logs in an existing candidate account.
 */
export async function loginCandidate(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/auth/login?type=candidate", { waitUntil: "domcontentloaded" });

  // Wait for React to hydrate
  await page.getByPlaceholder("you@example.com").waitFor({ state: "visible", timeout: 30000 });

  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("Enter your password").fill(password);

  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  await page.waitForURL("**/candidate/dashboard", { timeout: 15000 });
}

/**
 * Logs out by clicking the sidebar Logout button.
 */
export async function logoutCandidate(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Logout" }).click();
  // After logout, the app may redirect to "/" or "/auth/login" or "/auth/signup"
  await page.waitForURL(/\/(auth\/(signup|login)|$)/, { timeout: 10000 });
}
