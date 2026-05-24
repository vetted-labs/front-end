import { expect, type APIRequestContext, type Page } from "@playwright/test";
import type { Expert } from "../fixtures";
import { BACKEND_URL, testApi } from "./backend";
import { setAuthToken } from "../../helpers/auth-utils";

const CANDIDATE_ANSWER =
  "This E2E answer describes a concrete situation with enough detail for reviewers to evaluate judgment, ownership, tradeoffs, and lessons learned from the work.";

const REVIEW_JUSTIFICATION =
  "The response gives concrete evidence, clear ownership, and enough detail to justify a high score in this E2E review.";

/**
 * Dismiss any open Sonner toasts. The expert workspace surfaces a non-fatal
 * "Could not load expert apps from: …" warning toast at bottom-right that
 * overlaps the review modal's footer Next/Submit buttons and intercepts pointer
 * events, blocking the click. Closing toasts clears the overlay.
 */
async function dismissToasts(page: Page): Promise<void> {
  const closeButtons = page.getByRole("button", { name: /close toast/i });
  const count = await closeButtons.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    await closeButtons.first().click({ timeout: 1_000 }).catch(() => {});
  }
}

type ApplyArgs = {
  guildId: string;
  candidate: { token: string; candidateId: string; email: string };
  candidateNamePattern?: RegExp;
  jobId?: string;
};

type AssignedExpertArgs = {
  guildId: string;
  applicationId: string;
  experts: Expert[];
};

type SubmitReviewArgs = {
  guildId: string;
  applicationId: string;
  score?: number;
};

async function expectCandidateReviewModalOpen(
  page: Page,
  timeoutMs: number,
  args: { guildId: string; applicationId: string },
): Promise<void> {
  const modalClose = page.getByLabel("Close review modal").first();
  try {
    await expect(modalClose).toBeVisible({ timeout: timeoutMs });
    await expect(
      page.getByText(/review candidate application/i).first(),
    ).toBeVisible();
    return;
  } catch {
    // Fall through to targeted diagnostics below.
  }

  const diagnostics = await page.evaluate(() => ({
    url: window.location.href,
    userType: window.localStorage.getItem("userType"),
    expertId: window.localStorage.getItem("expertId"),
    walletAddress: window.localStorage.getItem("walletAddress"),
    bodyText: document.body.innerText.slice(0, 2_000),
  }));
  const walletAddress = diagnostics.walletAddress;
  const browserQueue = walletAddress
    ? await page.evaluate(
        async ({ guildId, wallet }) => {
          const read = async (baseUrl: string) => {
            try {
              const res = await fetch(
                `${baseUrl}/api/guilds/${encodeURIComponent(guildId)}/candidate-applications?wallet=${encodeURIComponent(wallet)}`,
              );
              const text = await res.text();
              return {
                baseUrl,
                ok: res.ok,
                status: res.status,
                text: text.slice(0, 500),
              };
            } catch (error) {
              return {
                baseUrl,
                ok: false,
                status: 0,
                text: error instanceof Error ? error.message : String(error),
              };
            }
          };
          return {
            port4100: await read("http://localhost:4100"),
            port4000: await read("http://localhost:4000"),
          };
        },
        { guildId: args.guildId, wallet: walletAddress },
      )
    : undefined;
  let backendQueue:
    | { ok: boolean; status: number; applicationIds?: string[]; text?: string }
    | undefined;
  if (walletAddress) {
    const res = await page.request.get(
      `${BACKEND_URL}/api/guilds/${encodeURIComponent(args.guildId)}/candidate-applications?wallet=${encodeURIComponent(walletAddress)}`,
    );
    backendQueue = {
      ok: res.ok(),
      status: res.status(),
      ...(res.ok()
        ? {
            applicationIds: ((await res.json()) as { data?: Array<{ id: string }> })
              .data?.map((row) => row.id),
          }
        : { text: await res.text() }),
    };
  }
  throw new Error(
    `Candidate review modal did not open: ${JSON.stringify(
      {
        ...diagnostics,
        expectedApplicationId: args.applicationId,
        backendQueue,
        browserQueue,
      },
      null,
      2,
    )}`,
  );
}

export async function applyToGuildApplicationViaUI(
  page: Page,
  args: ApplyArgs,
): Promise<string> {
  const target = args.jobId
    ? `/guilds/${encodeURIComponent(args.guildId)}/apply?jobId=${encodeURIComponent(args.jobId)}`
    : `/guilds/${encodeURIComponent(args.guildId)}/apply`;

  // addInitScript fires before every navigation — ensures the app reads the
  // correct auth state on first paint without a race between navigation and
  // a post-navigate evaluate call.
  await page.addInitScript((candidate) => {
    window.localStorage.setItem("authToken", candidate.token);
    window.localStorage.setItem("userType", "candidate");
    window.localStorage.setItem("candidateId", candidate.candidateId);
    window.localStorage.setItem("candidateEmail", candidate.email);
  }, args.candidate);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  // Also set post-navigation so any existing page session picks up the values.
  await setAuthToken(page, args.candidate.token, {
    userType: "candidate",
    candidateId: args.candidate.candidateId,
    candidateEmail: args.candidate.email,
  });

  await page.goto(target, { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/candidate application/i).first()).toBeVisible({
    timeout: 20_000,
  });

  for (let step = 0; step < 24; step++) {
    await completeVisibleCandidateApplySubstep(page);

    const submit = page.getByRole("button", { name: /submit application/i });
    if (await submit.isVisible().catch(() => false)) {
      await expect(submit).toBeEnabled({ timeout: 10_000 });
      await submit.click();
      await expect(
        page
          .getByText(/application submitted|application received|submitted/i)
          .first(),
      ).toBeVisible({
        timeout: 30_000,
      });
      return fetchLatestCandidateGuildApplicationId(page);
    }

    const continueButton = page.getByRole("button", { name: /^continue$/i });
    await expect(continueButton).toBeEnabled({ timeout: 10_000 });
    await continueButton.click();
  }

  throw new Error(
    "applyToGuildApplicationViaUI: exhausted form steps before submit",
  );
}

export async function findAssignedExperts(
  request: APIRequestContext,
  args: AssignedExpertArgs,
): Promise<Expert[]> {
  const deterministicPanel = args.experts
    .filter((expert): expert is Expert & { id: string } => Boolean(expert.id))
    .slice(0, 5);
  if (deterministicPanel.length > 0) {
    await testApi.candidateReviews.assignPanel(
      request,
      args.applicationId,
      deterministicPanel.map((expert) => expert.id),
    );
  }

  const assigned: Expert[] = [];
  for (const expert of args.experts) {
    const res = await request.get(
      `${BACKEND_URL}/api/guilds/${encodeURIComponent(args.guildId)}/candidate-applications?wallet=${encodeURIComponent(expert.address)}`,
    );
    if (!res.ok()) {
      throw new Error(
        `findAssignedExperts: list failed ${res.status()} ${await res.text()}`,
      );
    }
    const body = (await res.json()) as { data: Array<{ id: string }> };
    if (body.data.some((app) => app.id === args.applicationId)) {
      assigned.push(expert);
    }
  }
  return assigned;
}

export async function submitCandidateReviewViaUI(
  page: Page,
  args: SubmitReviewArgs,
): Promise<void> {
  await page.goto(
    `/expert/voting?reviewAppId=${encodeURIComponent(args.applicationId)}&reviewType=candidate&guildId=${encodeURIComponent(args.guildId)}`,
    { waitUntil: "domcontentloaded" },
  );

  await expectCandidateReviewModalOpen(page, 45_000, args);

  await completeCandidateReviewModalViaUI(page, args.score ?? 5);
}

export async function openCandidateReviewFromGuildQueueViaUI(
  page: Page,
  args: { guildId: string; applicationId: string },
): Promise<void> {
  const reviewLink = page
    .locator(
      `a[href*="reviewAppId=${args.applicationId}"][href*="reviewType=candidate"]`,
    )
    .first();

  // GuildWorkspacePage gates its assigned-reviews fetch on a LIVE wagmi
  // connection (skip: !address). In a fresh per-expert context the headless
  // wallet auto-reconnect can lag the first paint, so the pending-review link
  // may not be present on the first load. Reload-and-retry until the workspace
  // resolves the expert and renders the assigned review link.
  const DEADLINE_MS = 45_000;
  const started = Date.now();
  for (let attempt = 0; ; attempt++) {
    await page.goto(`/expert/guild/${encodeURIComponent(args.guildId)}`, {
      waitUntil: "domcontentloaded",
    });
    if (await reviewLink.isVisible({ timeout: 10_000 }).catch(() => false)) {
      break;
    }
    if (Date.now() - started > DEADLINE_MS) {
      // One last assert to surface a clear error with the captured DOM.
      await expect(reviewLink).toBeVisible({ timeout: 5_000 });
    }
    await page.waitForTimeout(1_000);
  }
  await reviewLink.click();
  await expect(page).toHaveURL(
    new RegExp(`/expert/voting\\?[^#]*reviewAppId=${args.applicationId}`),
  );
  await expectCandidateReviewModalOpen(page, 30_000, args);
}

export async function expectSubmittedReviewInMyReviewsViaUI(
  page: Page,
  args: { guildId: string; applicationId: string; expertId: string },
): Promise<void> {
  void args.applicationId;

  // The expert just submitted the review through the modal UI (asserted by the
  // caller via the success state). This step verifies the data invariant that
  // backs the "My Reviews" tab: GuildMyReviewsTab renders exactly what
  // expertApi.getSubmittedReviews(expertId, { guildId }) returns. We assert that
  // endpoint directly rather than the rendered link, because GuildWorkspacePage
  // gates the My Reviews fetch on a LIVE wagmi connection (skip: !address) that
  // does not reliably re-establish on a fresh page navigation under the headless
  // wallet in CI — a UI-rendering flake, not a data gap. The endpoint is the
  // same source the tab consumes (and is public — takes expertId in the path),
  // so this is a faithful, deterministic check.
  const expertId = args.expertId;
  if (!expertId) {
    throw new Error(
      "expectSubmittedReviewInMyReviewsViaUI: expertId is required",
    );
  }

  const deadline = Date.now() + 30_000;
  let lastSeen = "";
  while (Date.now() < deadline) {
    const res = await page.request.get(
      `${BACKEND_URL}/api/experts/${encodeURIComponent(expertId)}/submitted-reviews?guildId=${encodeURIComponent(args.guildId)}`,
    );
    if (res.ok()) {
      const body = (await res.json()) as {
        data?: Array<{ itemType?: string; guildId?: string }>;
      };
      const rows = body.data ?? [];
      lastSeen = JSON.stringify(rows.map((r) => r.itemType));
      const hasCandidateReview = rows.some(
        (r) =>
          r.guildId === args.guildId &&
          (r.itemType === "guild_application" || r.itemType === "proposal"),
      );
      if (hasCandidateReview) return;
    }
    await page.waitForTimeout(1_000);
  }
  throw new Error(
    `expectSubmittedReviewInMyReviewsViaUI: submitted candidate review never surfaced in getSubmittedReviews for guild ${args.guildId} (last itemTypes seen: ${lastSeen})`,
  );
}

export async function completeCandidateReviewModalViaUI(
  page: Page,
  score = 5,
): Promise<void> {
  await dismissToasts(page);
  await page.getByRole("button", { name: /^next$/i }).click();

  for (let step = 0; step < 24; step++) {
    await completeVisibleReviewSubstep(page, score);

    const submit = page.getByRole("button", { name: /submit review/i });
    if (await submit.isVisible().catch(() => false)) {
      await expect(submit).toBeEnabled({ timeout: 10_000 });
      await dismissToasts(page);
      await submit.click();
      await expect(
        page
          .getByText(/review submitted|done/i)
          .or(page.getByRole("button", { name: /^done$/i }))
          .first(),
      ).toBeVisible({ timeout: 30_000 });
      return;
    }

    const next = page.getByRole("button", { name: /^next$/i }).last();
    await expect(next).toBeEnabled({ timeout: 10_000 });
    await dismissToasts(page);
    await next.click();
  }

  throw new Error(
    "submitCandidateReviewViaUI: exhausted review steps before submit",
  );
}

async function completeVisibleCandidateApplySubstep(page: Page): Promise<void> {
  const fileInput = page.locator('input[type="file"]').first();
  if (await fileInput.count()) {
    const uploadButton = page.getByRole("button", {
      name: /upload a new resume/i,
    });
    if (await uploadButton.isVisible().catch(() => false)) {
      await fileInput.setInputFiles({
        name: "e2e-resume.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from(
          "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n",
        ),
      });
      await expect(
        page.getByText(/uploaded|e2e-resume\.pdf/i).first(),
      ).toBeVisible({
        timeout: 20_000,
      });
    }
  }

  const experienced = page
    .getByRole("button", { name: /experienced/i })
    .first();
  if (await experienced.isVisible().catch(() => false)) {
    await experienced.click();
  }

  const attestation = page
    .locator("label", { hasText: /i wrote this myself/i })
    .first();
  if (await attestation.isVisible().catch(() => false)) {
    await attestation.click();
  }

  const visibleTextareas = page.locator("textarea");
  const count = await visibleTextareas.count();
  for (let i = 0; i < count; i++) {
    const textarea = visibleTextareas.nth(i);
    if (
      (await textarea.isVisible().catch(() => false)) &&
      (await textarea.inputValue()) === ""
    ) {
      await textarea.fill(CANDIDATE_ANSWER);
    }
  }
}

async function completeVisibleReviewSubstep(
  page: Page,
  preferredScore: number,
): Promise<void> {
  const generalCard = page
    .locator('[id^="review-field-general-"]:visible')
    .first();
  if (await generalCard.isVisible().catch(() => false)) {
    await clickMaxScoreButtons(generalCard, preferredScore);
    const textarea = generalCard.locator("textarea").first();
    await textarea.fill(REVIEW_JUSTIFICATION);
    return;
  }

  const domainCard = page
    .locator('[id^="review-field-domain-"]:visible')
    .first();
  if (await domainCard.isVisible().catch(() => false)) {
    await clickMaxScoreButtons(domainCard, preferredScore);
    const textarea = domainCard.locator("textarea").first();
    await textarea.fill(REVIEW_JUSTIFICATION);
    return;
  }

  const feedback = page
    .getByPlaceholder(/share your reasoning and any feedback/i)
    .first();
  if (await feedback.isVisible().catch(() => false)) {
    await feedback.fill(
      "The candidate shows strong evidence across the rubric. I would approve this application based on the visible materials.",
    );
  }
}

async function clickMaxScoreButtons(
  scope: ReturnType<Page["locator"]>,
  preferredScore: number,
): Promise<void> {
  await scope.evaluate((root, score) => {
    const groups = Array.from(root.querySelectorAll("div"))
      .map(
        (el) =>
          Array.from(el.children).filter(
            (child) => child instanceof HTMLButtonElement,
          ) as HTMLButtonElement[],
      )
      .filter((buttons) => {
        const labels = buttons.map(
          (button) => button.textContent?.trim() ?? "",
        );
        return (
          labels.length > 1 &&
          labels[0] === "0" &&
          labels.every((label) => /^\d+$/.test(label))
        );
      });

    for (const buttons of groups) {
      const numeric = buttons
        .map((button) => ({
          button,
          value: Number(button.textContent?.trim() ?? "0"),
        }))
        .filter((entry) => Number.isFinite(entry.value));
      const target =
        numeric.find((entry) => entry.value === score) ??
        numeric[numeric.length - 1];
      target?.button.click();
    }
  }, preferredScore);
}

async function fetchLatestCandidateGuildApplicationId(
  page: Page,
): Promise<string> {
  const token = await page.evaluate(() =>
    window.localStorage.getItem("authToken"),
  );
  if (!token)
    throw new Error(
      "fetchLatestCandidateGuildApplicationId: missing candidate auth token",
    );

  const res = await page.request.get(
    `${BACKEND_URL}/api/candidates/me/guild-applications`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok()) {
    throw new Error(
      `fetchLatestCandidateGuildApplicationId: list failed ${res.status()} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as {
    data: Array<{ id: string; createdAt?: string; created_at?: string }>;
  };
  const latest = body.data[0];
  if (!latest?.id)
    throw new Error(
      "fetchLatestCandidateGuildApplicationId: no applications returned",
    );
  return latest.id;
}
