// e2e/real-flow/helpers/ui-review.ts
//
// 4-step rubric wizard driver for the ReviewGuildApplicationModal.
//
// Pre-conditions (caller is responsible):
//   - The page is navigated to a route that shows the review modal open, OR
//     the expert is logged in and the driver navigates to the queue to open it.
//   - In practice, the driver opens the modal itself via the expert voting
//     queue so callers only need to be logged in as an assigned expert.
//
// The wizard has NO data-testid attributes. Selectors are derived from a code
// trace of src/components/guild/review/ and confirmed against the live UI:
//
//   Step 1 – Profile/Materials: read-only; footer has "Cancel" + "Next"
//   Step 2 – General rubric:   one question at a time; field anchor is
//             `id="review-field-general-{questionId}"`; score buttons are
//             plain <button> children with integer text; justification
//             textarea has `id="review-justification-general-{questionId}"`
//   Step 3 – Domain rubric:    one topic at a time; field anchor is
//             `id="review-field-domain-{topicId}"`; ScoreButtons same pattern;
//             justification `id="review-justification-domain-{topicId}"`;
//             summary sub-step shows `id="review-field-overall-redflags"`
//             and `id="review-field-overall-score"`; optional overall feedback
//             textarea matched by placeholder text
//   Step 4 – Confirm & submit: "Submit Review" / "Submit Commitment" button;
//             on success the modal shows "Review Submitted" / "Commitment
//             Submitted" / "Practice Complete" heading
//
// The driver returns BEFORE the on-chain commit resolves (it clicks Submit and
// waits only for the success heading, not for chain confirmation). Scenarios
// that need the txHash can extend this pattern by polling the BE.

import { test, expect, type Page } from "@playwright/test";
import { BACKEND_URL } from "./backend";

export type RubricScoreBand = "high" | "mid" | "low";

export interface SubmitRubricReviewOptions {
  /**
   * Score band applied to every general-rubric criterion.
   *   "high" → last (max) score button
   *   "mid"  → middle score button
   *   "low"  → first non-zero score button (index 1)
   */
  generalScore: RubricScoreBand;
  /**
   * Score band applied to every domain-rubric topic.
   * Domain topics use a 0-5 scale; "high"=5, "mid"=3, "low"=1.
   */
  domainScore: RubricScoreBand;
  /**
   * Justification text written into every required textarea.
   * Must be ≥30 characters (JUSTIFICATION_MIN_CHARS from shared.tsx).
   */
  justification: string;
  /**
   * Optional red-flag checkbox labels to tick in the domain summary sub-step.
   * Defaults to [] (no deductions flagged).
   */
  redFlags?: string[];
  /**
   * Optional overall feedback text for the domain summary sub-step.
   * If omitted the textarea is left blank (it is optional per the UI).
   */
  overallFeedback?: string;
  /**
   * Maximum time (ms) to wait for the review modal to appear on the queue
   * page. Defaults to 30 000.
   */
  modalTimeoutMs?: number;
}

export interface SubmitRubricReviewResult {
  submitted: boolean;
  /** Overall score read from the success step's "Overall Score" display. 0 if unavailable. */
  normalizedScore: number;
  /** On-chain tx hash from the success step, if present (commit-reveal flow). */
  txHash?: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Map a score band to a button index within a ScoreButtons group.
 * ScoreButtons renders buttons 0..max. We skip index 0 for "low" (that's the
 * "not scored" sentinel) and pick a useful non-zero value.
 */
function bandToIndex(band: RubricScoreBand, max: number): number {
  if (band === "high") return max;
  if (band === "mid") return Math.max(1, Math.round(max / 2));
  return 1; // low
}

/**
 * Click all ScoreButtons groups within `container` using the desired band.
 * Each group is a sibling set of plain <button> elements whose text is a
 * non-negative integer (0, 1, 2, …). We find those groups by scanning for
 * divs whose direct children are ALL buttons with numeric text.
 */
async function clickScoreButtonsInContainer(
  page: Page,
  containerId: string,
  band: RubricScoreBand,
): Promise<void> {
  await page.locator(`#${containerId}`).evaluate(
    (root, scoreBand) => {
      const divs = Array.from(root.querySelectorAll<HTMLElement>("div"));
      const groups = divs
        .map((div) => {
          const children = Array.from(div.children) as HTMLElement[];
          const buttons = children.filter(
            (el): el is HTMLButtonElement => el instanceof HTMLButtonElement,
          );
          // A valid ScoreButtons group has ≥2 buttons, starts at "0", and all
          // labels are non-negative integers.
          if (
            buttons.length < 2 ||
            buttons[0]?.textContent?.trim() !== "0" ||
            !buttons.every((b) => /^\d+$/.test(b.textContent?.trim() ?? ""))
          ) {
            return null;
          }
          return buttons;
        })
        .filter((g): g is HTMLButtonElement[] => g !== null);

      for (const buttons of groups) {
        const max = buttons.length - 1;
        let targetIndex: number;
        if (scoreBand === "high") targetIndex = max;
        else if (scoreBand === "mid") targetIndex = Math.max(1, Math.round(max / 2));
        else targetIndex = 1;
        const btn = buttons[targetIndex] ?? buttons[max];
        btn?.click();
      }
    },
    band,
  );
}

/**
 * Navigate to the expert voting queue, click the first "Review" button in the
 * Candidate Reviews tab, and wait for the modal to open.
 */
async function openFirstReviewModal(
  page: Page,
  timeoutMs: number,
): Promise<void> {
  await page.goto("/expert/voting", { waitUntil: "domcontentloaded" });

  // Switch to Candidate Reviews tab (may be labelled "Candidate Reviews" or
  // similar — use a role matcher so we're not sensitive to exact copy).
  const candidateTab = page
    .getByRole("button", { name: /candidate reviews/i })
    .or(page.getByRole("tab", { name: /candidate reviews/i }))
    .first();
  if (await candidateTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await candidateTab.click();
  }

  // Click the first visible "Review" button to open the modal.
  await expect(
    page.getByRole("button", { name: /^review$/i }).first(),
  ).toBeVisible({ timeout: timeoutMs });
  await page.getByRole("button", { name: /^review$/i }).first().click();

  // Wait for the modal's close button (aria-label="Close review modal" per
  // the existing smoke tests and the modal's onClose handler).
  await expect(
    page.getByLabel("Close review modal").first(),
  ).toBeVisible({ timeout: timeoutMs });
}

// ─── Main exported driver ─────────────────────────────────────────────────────

/**
 * Walk the 4-step rubric wizard from the expert voting queue and submit.
 *
 * Call this after `loginAsExpertViaUI` — the expert must already be logged in.
 * The driver opens the review modal itself by navigating to /expert/voting and
 * clicking the first queued Candidate Review.
 *
 * Each wizard step is wrapped in a `test.step()` so watch-mode shows progress.
 *
 * Returns `{ submitted, normalizedScore, txHash? }`.
 */
export async function submitRubricReviewViaUI(
  page: Page,
  opts: SubmitRubricReviewOptions,
): Promise<SubmitRubricReviewResult> {
  const {
    generalScore,
    domainScore,
    justification,
    redFlags: flagLabels = [],
    overallFeedback,
    modalTimeoutMs = 30_000,
  } = opts;

  // Ensure justification is long enough for the required minimum (30 chars).
  const safeJustification =
    justification.length >= 30
      ? justification
      : justification.padEnd(30, " from the candidate's responses.");

  // ─────────────────────────────────────────────────────────────────────────
  // Step 0: Open the review modal from the expert voting queue.
  // ─────────────────────────────────────────────────────────────────────────
  await test.step("expert opens the candidate review modal from the voting queue", async () => {
    await openFirstReviewModal(page, modalTimeoutMs);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Step 1 – Profile/Materials: read-only display; click Next.
  // ─────────────────────────────────────────────────────────────────────────
  await test.step("wizard step 1 — profile and materials (read-only)", async () => {
    // The first step shows the applicant's profile. Footer has a Next button.
    // No data entry required — just advance.
    const nextBtn = page.getByRole("button", { name: /^next$/i }).first();
    await expect(nextBtn).toBeEnabled({ timeout: modalTimeoutMs });
    await nextBtn.click();
    // Wait for step 2 to render — a general rubric field anchor should appear.
    await expect(
      page.locator('[id^="review-field-general-"]').first(),
    ).toBeVisible({ timeout: modalTimeoutMs });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Step 2 – General rubric: one question per page; paginate through all.
  // ─────────────────────────────────────────────────────────────────────────
  await test.step("wizard step 2 — general rubric questions", async () => {
    for (let iteration = 0; iteration < 30; iteration++) {
      // The visible general rubric question's field anchor
      const visibleCard = page
        .locator('[id^="review-field-general-"]:visible')
        .first();

      if (!(await visibleCard.isVisible({ timeout: 5_000 }).catch(() => false))) {
        // No more general cards — we advanced to step 3.
        break;
      }

      // Extract the question id from the container's id attribute.
      const cardId = await visibleCard.getAttribute("id");
      // cardId is "review-field-general-{questionId}"
      const questionId = cardId?.replace("review-field-general-", "") ?? "";

      // Click score buttons inside this card using the desired band.
      if (cardId) {
        await clickScoreButtonsInContainer(page, cardId, generalScore);
      }

      // Fill the justification textarea (id = review-justification-general-{questionId}).
      const justAreaId = questionId
        ? `review-justification-general-${questionId}`
        : "";
      if (justAreaId) {
        const justArea = page.locator(`#${justAreaId}`);
        if (await justArea.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await justArea.fill(safeJustification);
        }
      } else {
        // Fallback: fill the first visible textarea in the card.
        const textarea = visibleCard.locator("textarea").first();
        if (await textarea.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await textarea.fill(safeJustification);
        }
      }

      // Advance: click the last (primary) Next button in the footer.
      const nextBtn = page.getByRole("button", { name: /^next$/i }).last();
      await expect(nextBtn).toBeEnabled({ timeout: 10_000 });
      await nextBtn.click();

      // Small pause so React state settles before the next iteration's
      // visibility check. Using a waitFor on the card changing is more robust
      // but adds selector complexity — 100ms is cheap and reliable here.
      await page.waitForTimeout(200);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Step 3 – Domain rubric: one topic per page, then summary sub-step.
  // ─────────────────────────────────────────────────────────────────────────
  await test.step("wizard step 3 — domain rubric topics", async () => {
    for (let iteration = 0; iteration < 30; iteration++) {
      // Check if we've landed on the domain summary sub-step (red flags +
      // overall score visible, no per-topic card).
      const redFlagSection = page.locator(
        '#review-field-overall-redflags',
      );
      const isDomainSummary = await redFlagSection
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (isDomainSummary) {
        // Summary sub-step: tick any requested red flags.
        for (const flagLabel of flagLabels) {
          const flagCheckbox = page
            .getByRole("checkbox", { name: new RegExp(flagLabel, "i") })
            .first();
          if (
            await flagCheckbox.isVisible({ timeout: 2_000 }).catch(() => false)
          ) {
            await flagCheckbox.check();
          }
        }

        // Fill overall feedback if provided.
        if (overallFeedback) {
          const feedbackTextarea = page
            .getByPlaceholder(/share your reasoning and any feedback/i)
            .first();
          if (
            await feedbackTextarea
              .isVisible({ timeout: 3_000 })
              .catch(() => false)
          ) {
            await feedbackTextarea.fill(overallFeedback);
          }
        }

        // Advance from summary to step 4 (confirm).
        const nextBtn = page.getByRole("button", { name: /^next$/i }).last();
        await expect(nextBtn).toBeEnabled({ timeout: 10_000 });
        await nextBtn.click();
        break;
      }

      // Per-topic card visible?
      const visibleTopicCard = page
        .locator('[id^="review-field-domain-"]:visible')
        .first();

      const isTopicCard = await visibleTopicCard
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (!isTopicCard) {
        // Neither a topic card nor the summary — likely no domain topics.
        // The modal may have advanced to step 4 already. Break out.
        break;
      }

      // Extract topic id from the card's id.
      const topicCardId = await visibleTopicCard.getAttribute("id");
      // topicCardId is "review-field-domain-{topicId}"

      // Click the ScoreButtons in the topic card.
      if (topicCardId) {
        await clickScoreButtonsInContainer(page, topicCardId, domainScore);
      }

      // Fill the domain justification textarea.
      const topicId = topicCardId?.replace("review-field-domain-", "") ?? "";
      const domainJustAreaId = topicId
        ? `review-justification-domain-${topicId}`
        : "";
      if (domainJustAreaId) {
        const domainJustArea = page.locator(`#${domainJustAreaId}`);
        if (
          await domainJustArea.isVisible({ timeout: 3_000 }).catch(() => false)
        ) {
          await domainJustArea.fill(safeJustification);
        }
      } else {
        const textarea = visibleTopicCard.locator("textarea").first();
        if (
          await textarea.isVisible({ timeout: 3_000 }).catch(() => false)
        ) {
          await textarea.fill(safeJustification);
        }
      }

      // Advance to next topic or to the summary.
      const nextBtn = page.getByRole("button", { name: /^next$/i }).last();
      await expect(nextBtn).toBeEnabled({ timeout: 10_000 });
      await nextBtn.click();
      await page.waitForTimeout(200);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Step 4 – Confirm & submit.
  // ─────────────────────────────────────────────────────────────────────────
  let submittedScore = 0;
  let txHash: string | undefined;

  await test.step("wizard step 4 — confirm and submit the review", async () => {
    // The confirm step shows "Confirm your review" heading and a breakdown.
    // Wait for it to render (the heading comes from ReviewConfirmStep).
    await expect(
      page.getByText(/confirm your review/i).first(),
    ).toBeVisible({ timeout: modalTimeoutMs });

    // Click "Submit Review" or "Submit Commitment" (commit-reveal phase).
    // Both are rendered by ReviewNavigation on step 4 with step4Mode="confirm".
    const submitBtn = page
      .getByRole("button", { name: /submit review|submit commitment/i })
      .first();
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
    await submitBtn.click();

    // Wait for the success state: "Review Submitted" / "Commitment Submitted"
    // / "Practice Complete" heading from ReviewSuccessStep.
    await expect(
      page
        .getByText(/review submitted|commitment submitted|practice complete/i)
        .first(),
    ).toBeVisible({ timeout: 60_000 });

    // Extract the overall score from the success panel's display
    // ("Overall Score" label + the value next to it). The ReviewSuccessStep
    // renders `overallScore` next to the "Overall Score" text.
    const overallScoreText = await page
      .locator(
        'text="Overall Score" >> xpath=following-sibling::* | xpath=parent::*/following-sibling::*',
      )
      .first()
      .textContent()
      .catch(() => null);

    if (overallScoreText) {
      const match = overallScoreText.match(/\d+/);
      if (match) submittedScore = parseInt(match[0], 10);
    }

    // Try to read the score from the structured element (bold number next to
    // "Overall Score" in the score breakdown table).
    if (submittedScore === 0) {
      // Alternative: find the large bold number near "Overall Score"
      const scoreEl = page.locator(
        ':text("Overall Score") ~ * span, :text("Overall Score") + span',
      );
      const scoreVal = await scoreEl.first().textContent().catch(() => null);
      if (scoreVal) {
        const m = scoreVal.match(/(\d+)/);
        if (m) submittedScore = parseInt(m[1], 10);
      }
    }

    // If we still don't have a score, use a broad scrape: find the biggest
    // number in the success panel that looks like a score (0-200 range).
    if (submittedScore === 0) {
      const panelText = await page
        .locator('[class*="space-y-6"]')
        .first()
        .textContent()
        .catch(() => "");
      const allNums = (panelText ?? "").match(/\b(\d{1,3})\b/g) ?? [];
      for (const n of allNums) {
        const v = parseInt(n, 10);
        if (v > 0 && v <= 200) {
          submittedScore = v;
          break;
        }
      }
    }

    // Try to read the on-chain txHash from the "View on Etherscan" link.
    const etherscanLink = page.locator('a[href*="etherscan.io/tx/"]').first();
    if (await etherscanLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const href = await etherscanLink.getAttribute("href");
      if (href) {
        const txMatch = href.match(/0x[0-9a-fA-F]{64}/);
        if (txMatch) txHash = txMatch[0];
      }
    }

    // Also check the mono text block that shows the hash verbatim.
    if (!txHash) {
      const monoBlock = page.locator("p.font-mono").first();
      if (
        await monoBlock.isVisible({ timeout: 1_000 }).catch(() => false)
      ) {
        const text = await monoBlock.textContent().catch(() => "");
        const m = (text ?? "").match(/0x[0-9a-fA-F]{64}/);
        if (m) txHash = m[0];
      }
    }
  });

  return {
    submitted: true,
    normalizedScore: submittedScore,
    txHash,
  };
}

// Re-export BACKEND_URL so callers can import both from one place.
export { BACKEND_URL };
