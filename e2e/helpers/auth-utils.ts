import type { Page } from "@playwright/test";

/**
 * Write candidate/company auth tokens into localStorage so guarded routes work.
 *
 * Key names mirror what the FE's auth.login() writes:
 *   - "authToken"    — primary JWT (candidate / company)
 *   - "refreshToken" — optional refresh token
 *   - "userType"     — "candidate" | "company" | "expert"
 *
 * Before setting these, the function clears the six expert/company keys that
 * could conflict with a fresh candidate session (matches the pattern in
 * signupCandidate → auth.ts:73-88).
 */
export async function setAuthToken(
  page: Page,
  token: string,
  opts?: {
    refreshToken?: string;
    userType?: "candidate" | "company" | "expert";
    candidateId?: string;
    candidateEmail?: string;
    clearConflicting?: boolean;
  },
): Promise<void> {
  await page.evaluate(
    ({ token, refreshToken, userType, candidateId, candidateEmail, clearConflicting }) => {
      if (clearConflicting) {
        window.localStorage.removeItem("walletAddress");
        window.localStorage.removeItem("expertId");
        window.localStorage.removeItem("expertEmail");
        window.localStorage.removeItem("expertStatus");
        window.localStorage.removeItem("companyAuthToken");
        window.localStorage.removeItem("companyId");
        window.localStorage.removeItem("companyEmail");
      }
      window.localStorage.setItem("authToken", token);
      if (refreshToken) window.localStorage.setItem("refreshToken", refreshToken);
      if (userType) window.localStorage.setItem("userType", userType);
      if (candidateId) window.localStorage.setItem("candidateId", candidateId);
      if (candidateEmail) window.localStorage.setItem("candidateEmail", candidateEmail);
    },
    {
      token,
      refreshToken: opts?.refreshToken,
      userType: opts?.userType,
      candidateId: opts?.candidateId,
      candidateEmail: opts?.candidateEmail,
      clearConflicting: opts?.clearConflicting ?? false,
    },
  );
}

/**
 * Pre-mark the expert onboarding tour as completed in localStorage.
 *
 * Key format mirrors `buildExpertOnboardingStorageKey` in the app:
 *   "vetted:expert-onboarding-tour:v1:<lowercased-address>"
 *
 * The value is a JSON blob with all tour events set to true so the
 * /expert/* layout's story-lab redirect skips the 16-step first-run flow.
 *
 * Uses `page.addInitScript` so the key is present before every navigation
 * that follows — important because the layout reads localStorage on first
 * paint and a post-navigation `evaluate` would race.
 */
export async function markOnboardingComplete(
  page: Page,
  walletAddress: string,
): Promise<void> {
  const key = `vetted:expert-onboarding-tour:v1:${walletAddress.toLowerCase()}`;
  const value = JSON.stringify({
    dismissed: true,
    completed: true,
    checklistDismissed: true,
    events: {
      firstReviewOpened: true,
      practiceReviewCompleted: true,
      applicationsVisited: true,
      guildsVisited: true,
      endorsementsVisited: true,
      governanceVisited: true,
      stakingExplanationViewed: true,
      commitRevealViewed: true,
      rewardsVisited: true,
      reputationVisited: true,
      notificationsVisited: true,
    },
  });
  await page.addInitScript(
    ([k, v]) => {
      try {
        window.localStorage.setItem(k, v);
      } catch {
        /* localStorage may be unavailable in some contexts; ignore */
      }
    },
    [key, value] as const,
  );
}
