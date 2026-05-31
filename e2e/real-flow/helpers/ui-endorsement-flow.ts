import { expect, type APIRequestContext, type Page } from "@playwright/test";
import type { Expert, TestContextRegistry } from "../fixtures";
import { BACKEND_URL, testApi } from "./backend";
import { recordHireOutcome, reportPerformanceIssue } from "./endorsement";
import { loginAsExpertViaUI } from "./ui-auth";
import { attachWallet } from "./wallet-injection";

/**
 * Dismiss any open Sonner toasts. The endorsements marketplace surfaces
 * non-fatal "Failed to load applications" / "Couldn't load earnings" error
 * toasts at bottom-right (Sonner default position + closeButton). The endorse
 * modal's full-width submit button sits at the bottom of the centered modal, so
 * a bottom-right toast can overlap the button and intercept the pointer event,
 * blocking the click. Closing toasts clears the overlay before we click.
 */
async function dismissToasts(page: Page): Promise<void> {
  const closeButtons = page.getByRole("button", { name: /close toast/i });
  const count = await closeButtons.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    await closeButtons
      .first()
      .click({ timeout: 1_000 })
      .catch(() => {});
  }
}

export type CompanyFixture = {
  id: string;
  token: string;
  name: string;
};

export type EndorsementTarget = {
  guildApplicationId: string;
  jobApplicationId: string;
  jobId: string;
  candidateId: string;
};

export type ExpertRewardRow = {
  id: string;
  expert_id: string;
  hire_outcome_id: string;
  status: string;
  total_reward: string;
  immediate_reward: string;
  locked_reward: string;
  locked_forfeited?: boolean;
  locked_released?: boolean;
  hire_outcome?: string;
};

export async function createActiveJob(
  request: APIRequestContext,
  company: CompanyFixture,
  guildName: string,
): Promise<string> {
  const job = await testApi.seedJob(request, {
    companyId: company.id,
    title: `E2E Endorsed Role ${Date.now()}`,
    guild: guildName,
    status: "active",
  });
  return job.jobId;
}

export async function fetchEndorsementTarget(
  request: APIRequestContext,
  candidateToken: string,
  guildApplicationId: string,
): Promise<EndorsementTarget> {
  const res = await request.get(
    `${BACKEND_URL}/api/candidates/me/guild-applications`,
    {
      headers: { Authorization: `Bearer ${candidateToken}` },
    },
  );
  if (!res.ok()) {
    throw new Error(
      `fetchEndorsementTarget failed: ${res.status()} ${await res.text()}`,
    );
  }

  const body = (await res.json()) as {
    data: Array<{
      id: string;
      jobId?: string | null;
      candidateId?: string | null;
      candidate_id?: string | null;
      jobApplicationId?: string | null;
    }>;
  };
  const row = body.data.find((app) => app.id === guildApplicationId);
  if (!row)
    throw new Error(`Guild application ${guildApplicationId} was not returned`);
  if (
    !row.jobId ||
    !row.jobApplicationId ||
    !(row.candidateId ?? row.candidate_id)
  ) {
    throw new Error(
      `Guild application ${guildApplicationId} is not fully linked to a job application: ${JSON.stringify(row)}`,
    );
  }

  return {
    guildApplicationId,
    jobApplicationId: row.jobApplicationId,
    jobId: row.jobId,
    candidateId: row.candidateId ?? row.candidate_id!,
  };
}

export async function createCandidateJobApplication(
  request: APIRequestContext,
  candidateToken: string,
  args: {
    jobId: string;
    candidateId: string;
  },
): Promise<EndorsementTarget> {
  const res = await request.post(`${BACKEND_URL}/api/applications`, {
    headers: { Authorization: `Bearer ${candidateToken}` },
    data: {
      jobId: args.jobId,
      candidateId: args.candidateId,
      coverLetter:
        "This E2E candidate is applying to a second role after guild approval so the endorsement slashing branch can be verified.",
      resumeUrl: "https://example.com/e2e-resume.pdf",
      screeningAnswers: [],
    },
  });
  if (!res.ok()) {
    throw new Error(
      `createCandidateJobApplication failed: ${res.status()} ${await res.text()}`,
    );
  }

  const body = (await res.json()) as {
    data: {
      id: string;
      jobId?: string;
      job_id?: string;
      candidateId?: string;
      candidate_id?: string;
    };
  };

  return {
    guildApplicationId: "",
    jobApplicationId: body.data.id,
    jobId: body.data.jobId ?? body.data.job_id ?? args.jobId,
    candidateId:
      body.data.candidateId ?? body.data.candidate_id ?? args.candidateId,
  };
}

export async function placeEndorsementViaUI(
  basePage: Page,
  expert: Expert,
  args: {
    guildId: string;
    applicationId: string;
    amountVetd: string;
    candidateNamePattern?: RegExp;
    testContexts?: TestContextRegistry;
  },
): Promise<void> {
  const browser = basePage.context().browser();
  if (!browser)
    throw new Error("placeEndorsementViaUI: browser handle unavailable");

  const origin = new URL(basePage.url()).origin;
  const context =
    args.testContexts?.register(
      await browser.newContext({
        baseURL: origin,
        bypassCSP: true,
      }),
    ) ??
    (await browser.newContext({
      baseURL: origin,
      bypassCSP: true,
    }));
  const page = await context.newPage();

  try {
    await attachWallet(page, expert.privateKey, {
      rpcUrl: process.env.ANVIL_RPC_URL,
    });
    await loginAsExpertViaUI(page, expert.address);
    const providerSource = await page.evaluate(() => {
      const win = window as typeof window & {
        __hwProvider?: unknown;
        __vettedHeadlessProvider?: unknown;
      };
      if (win.ethereum === win.__hwProvider) return "playwright";
      if (win.ethereum === win.__vettedHeadlessProvider) return "browser";
      if (win.__hwProvider) return "playwright-present";
      if (win.__vettedHeadlessProvider) return "browser-present";
      return "unknown";
    });
    if (providerSource !== "playwright") {
      throw new Error(
        `Expected Playwright wallet provider, got ${providerSource}`,
      );
    }
    await page.goto(
      `/expert/endorsements?guildId=${encodeURIComponent(args.guildId)}&applicationId=${encodeURIComponent(args.applicationId)}`,
      { waitUntil: "domcontentloaded" },
    );

    if (args.candidateNamePattern) {
      await expect(
        page.getByText(args.candidateNamePattern).first(),
      ).toBeVisible({
        timeout: 30_000,
      });
    }

    const modal = page
      .locator('[data-tour-target="expert-endorse-modal"]')
      .first();
    if (!(await modal.isVisible({ timeout: 30_000 }).catch(() => false))) {
      await page
        .locator('[data-tour-target="expert-endorsement-candidate-bid-cta"]')
        .first()
        .click();
      await expect(modal).toBeVisible({ timeout: 15_000 });
    }

    await openStakeStep(page);

    const amountInput = page
      .locator(
        '[data-tour-target="expert-endorse-amount-input"] input[type="number"]',
      )
      .first();
    await expect(amountInput).toBeVisible({ timeout: 15_000 });
    await amountInput.fill(args.amountVetd);

    const submit = page
      .locator('[data-tour-target="expert-endorse-submit-button"]')
      .first();
    await expect(submit).toBeEnabled({ timeout: 10_000 });
    // Clear any bottom-right error toasts that can overlap the modal's
    // full-width submit button and intercept the click (same class of bug as
    // the review-modal footer; see dismissToasts docstring).
    await dismissToasts(page);
    await submit.click();

    const progressMessage = page
      .getByText(/endorsement confirmed/i)
      .or(page.getByText(/waiting for confirmation/i))
      .or(page.getByText(/placing endorsement/i))
      .first();
    try {
      await expect(progressMessage).toBeVisible({ timeout: 30_000 });
    } catch (error) {
      const modalText = await modal.innerText().catch(() => "<modal missing>");
      throw new Error(
        `Endorsement did not progress after clicking submit. Modal text:\n${modalText}`,
        { cause: error },
      );
    }
    await expect(page.getByText(/endorsement confirmed/i).first()).toBeVisible({
      timeout: 60_000,
    });
  } finally {
    await context.close().catch(() => undefined);
  }
}

export async function waitForSyncedEndorsement(
  request: APIRequestContext,
  expert: Expert,
  applicationId: string,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const res = await request.get(
          `${BACKEND_URL}/api/blockchain/endorsements/expert/${expert.address}`,
        );
        if (!res.ok()) return false;
        const body = (await res.json()) as {
          data: Array<{
            application_id?: string;
            applicationId?: string;
            application?: { id?: string };
          }>;
        };
        return body.data.some(
          (row) =>
            (row.application_id ?? row.applicationId ?? row.application?.id) ===
            applicationId,
        );
      },
      { timeout: 30_000, intervals: [1000, 2000, 3000] },
    )
    .toBe(true);
}

export async function expectExpertEarningsShowsEndorsement(
  basePage: Page,
  expert: Expert,
  candidateNamePattern: RegExp,
  testContexts?: TestContextRegistry,
): Promise<void> {
  const page = await openExpertPage(
    basePage,
    expert,
    "/expert/earnings",
    testContexts,
  );
  try {
    await expect(
      page.getByRole("heading", { name: /^earnings$/i }),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.locator('[data-tour-target="expert-earnings-summary"]').first(),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/endorsement reward/i).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(candidateNamePattern).first()).toBeVisible({
      timeout: 30_000,
    });
  } finally {
    await page
      .context()
      .close()
      .catch(() => undefined);
  }
}

// VET-99 merged the standalone /expert/endorsements/history route into the main
// Endorsements page. Outcomes now surface in the "Active Endorsements" area: a
// not-hired endorsement keeps the "Not Hired — 10% Slashed" badge on its rich
// row, and hired outcomes live behind the "Hired" filter tab.
export async function expectExpertHistoryShowsSlashedEndorsement(
  basePage: Page,
  expert: Expert,
  candidateNamePattern: RegExp,
  testContexts?: TestContextRegistry,
): Promise<void> {
  const page = await openExpertPage(
    basePage,
    expert,
    "/expert/endorsements",
    testContexts,
  );
  try {
    await expect(
      page.getByRole("heading", { name: /active endorsements/i }).first(),
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(candidateNamePattern).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/not hired.*10% slashed/i).first()).toBeVisible(
      {
        timeout: 30_000,
      },
    );
  } finally {
    await page
      .context()
      .close()
      .catch(() => undefined);
  }
}

export async function expectExpertHistoryShowsHiredEndorsement(
  basePage: Page,
  expert: Expert,
  candidateNamePattern: RegExp,
  testContexts?: TestContextRegistry,
): Promise<void> {
  const page = await openExpertPage(
    basePage,
    expert,
    "/expert/endorsements",
    testContexts,
  );
  try {
    await expect(
      page.getByRole("heading", { name: /active endorsements/i }).first(),
    ).toBeVisible({
      timeout: 30_000,
    });
    // Switch to the "Hired" filter tab (VET-99) before asserting the outcome.
    await page.getByRole("button", { name: /^hired \(/i }).first().click();
    await expect(page.getByText(candidateNamePattern).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/^hired$/i).first()).toBeVisible({
      timeout: 30_000,
    });
  } finally {
    await page
      .context()
      .close()
      .catch(() => undefined);
  }
}

export async function fetchExpertRewards(
  request: APIRequestContext,
  expertId: string,
  authToken: string,
): Promise<ExpertRewardRow[]> {
  const res = await request.get(
    `${BACKEND_URL}/api/endorsements/rewards/${expertId}`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
    },
  );
  if (!res.ok())
    throw new Error(
      `fetchExpertRewards failed: ${res.status()} ${await res.text()}`,
    );
  const body = (await res.json()) as { data: ExpertRewardRow[] };
  return body.data;
}

export async function recordHiredOutcomeAndForfeitLockedReward(
  request: APIRequestContext,
  companyToken: string,
  target: EndorsementTarget,
): Promise<void> {
  await recordHireOutcome(request, companyToken, {
    applicationId: target.jobApplicationId,
    candidateId: target.candidateId,
    jobId: target.jobId,
    outcome: "hired",
    finalCompensation: 100_000,
  });
  await reportPerformanceIssue(
    request,
    companyToken,
    target.jobApplicationId,
    "E2E retention issue after hire outcome.",
    2,
  );
}

export async function recordHiredOutcomeAndReleaseLockedReward(
  request: APIRequestContext,
  companyToken: string,
  target: EndorsementTarget,
): Promise<void> {
  await recordHireOutcome(request, companyToken, {
    applicationId: target.jobApplicationId,
    candidateId: target.candidateId,
    jobId: target.jobId,
    outcome: "hired",
    finalCompensation: 100_000,
  });
  await testApi.endorsement.markRetentionReady(request, {
    applicationId: target.jobApplicationId,
  });
  await testApi.endorsement.processRetention(request);
}

export async function recordNotHiredOutcome(
  request: APIRequestContext,
  companyToken: string,
  target: EndorsementTarget,
): Promise<void> {
  await recordHireOutcome(request, companyToken, {
    applicationId: target.jobApplicationId,
    candidateId: target.candidateId,
    jobId: target.jobId,
    outcome: "not_hired",
  });
}

async function openStakeStep(page: Page): Promise<void> {
  const amountInput = page
    .locator(
      '[data-tour-target="expert-endorse-amount-input"] input[type="number"]',
    )
    .first();
  if (await amountInput.isVisible().catch(() => false)) return;

  for (let i = 0; i < 4; i++) {
    const next = page.getByRole("button", { name: /^next$/i }).last();
    if (!(await next.isVisible().catch(() => false))) break;
    await expect(next).toBeEnabled({ timeout: 10_000 });
    await next.click();
    if (await amountInput.isVisible().catch(() => false)) return;
  }

  throw new Error(
    "openStakeStep: endorsement amount input never became visible",
  );
}

async function openExpertPage(
  basePage: Page,
  expert: Expert,
  path: string,
  testContexts?: TestContextRegistry,
): Promise<Page> {
  const browser = basePage.context().browser();
  if (!browser) throw new Error("openExpertPage: browser handle unavailable");

  const origin = new URL(basePage.url()).origin;
  const context =
    testContexts?.register(
      await browser.newContext({
        baseURL: origin,
        bypassCSP: true,
      }),
    ) ??
    (await browser.newContext({
      baseURL: origin,
      bypassCSP: true,
    }));
  const page = await context.newPage();
  await attachWallet(page, expert.privateKey, {
    rpcUrl: process.env.ANVIL_RPC_URL,
  });
  await loginAsExpertViaUI(page, expert.address);
  await page.goto(path, { waitUntil: "domcontentloaded" });
  return page;
}
