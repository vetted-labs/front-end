import type { Page } from "@playwright/test";
import type { Expert } from "../fixtures";
import { testApi } from "../helpers/backend";
import { attachWallet } from "../helpers/wallet-injection";
import { loginAsExpertViaUI } from "../helpers/ui-auth";
import { submitCandidateReviewViaUI } from "../helpers/ui-candidate-review-flow";

export async function approveCandidateGuildApplicationViaUI(
  basePage: Page,
  args: {
    reviewers: Expert[];
    guildId: string;
    applicationId: string;
  },
): Promise<void> {
  const majorityThreshold = Math.floor(args.reviewers.length / 2) + 1;
  for (const reviewer of args.reviewers.slice(0, majorityThreshold)) {
    await reviewApplicationAsExpert(basePage, reviewer, {
      guildId: args.guildId,
      applicationId: args.applicationId,
      score: 5,
    });
  }

  await testApi.candidateReviews.expireAndFinalize(basePage.request, args.applicationId);
}

async function reviewApplicationAsExpert(
  basePage: Page,
  reviewer: Expert,
  args: { guildId: string; applicationId: string; score: number },
): Promise<void> {
  const browser = basePage.context().browser();
  if (!browser) throw new Error("reviewApplicationAsExpert: browser handle unavailable");

  const reviewContext = await browser.newContext({
    baseURL: new URL(basePage.url()).origin,
    bypassCSP: true,
  });
  const reviewPage = await reviewContext.newPage();
  try {
    await reviewPage.goto("/", { waitUntil: "domcontentloaded" });
    await reviewPage.evaluate(() => {
      window.localStorage.removeItem("authToken");
      window.localStorage.removeItem("candidateId");
      window.localStorage.removeItem("candidateEmail");
      window.localStorage.removeItem("userType");
    });
    await attachWallet(reviewPage, reviewer.privateKey, {
      rpcUrl: process.env.ANVIL_RPC_URL,
    });
    await loginAsExpertViaUI(reviewPage, reviewer.address);
    await submitCandidateReviewViaUI(reviewPage, {
      guildId: args.guildId,
      applicationId: args.applicationId,
      score: args.score,
    });
  } finally {
    await reviewContext.close().catch(() => undefined);
  }
}
