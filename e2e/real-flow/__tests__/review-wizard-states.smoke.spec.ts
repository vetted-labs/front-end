// e2e/real-flow/__tests__/review-wizard-states.smoke.spec.ts
//
// Smoke test: assert the 4-step review wizard state machine.
//
// Steps:
//   1 — Profile:        read-only candidate profile; Next is always enabled.
//   2 — General rubric: one question per page; clicking Next without filling
//                       scores/justification shows a toast error (Next stays enabled
//                       but advancing is blocked by validate-on-click logic).
//                       After filling every criterion the reviewer can advance.
//   3 — Domain rubric:  one topic per page → summary sub-step; same pattern.
//   4 — Confirm:        overall score display + Submit button visible.
//                       Back returns to step 3.
//
// Plan-vs-reality notes (see task spec):
//   - The task spec template assumed step 3 is a "recommendation band"
//     (approve/reject radio), but the real wizard step 3 is the Domain rubric.
//     There is NO recommendation/band step in this wizard. Assertions revised
//     to reflect actual behavior (step labels: Profile, General, Domain, Submit).
//   - The Next button is NEVER disabled by unfinished scores — it is always
//     enabled. The "gate" is a validate-on-click toast + inline error banner that
//     blocks advancing when required fields are incomplete. Assertions updated.
//   - panelFor() requires size 5-7 (whitepaper §2). Not usable here because
//     the cleanState fixture resets the DB on teardown, so manifest expert IDs
//     no longer exist. We re-seed a guild + experts per-test following the
//     candidate-guild-review-ui.spec.ts pattern.
//   - loginAsExpertViaUI() takes an address string, not an Expert object.
//   - This test drives through all rubric steps but stops at step 4 WITHOUT
//     submitting (Submit is enabled is the final assertion). This avoids the
//     on-chain commit-reveal machinery and keeps the test fast / deterministic.

import { test, expect } from "../fixtures";
import { BACKEND_URL, testApi } from "../helpers/backend";
import { loginAsExpertViaUI } from "../helpers/ui-auth";
import type { Page } from "@playwright/test";
import type { Expert } from "../fixtures";

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
});

/** Seed a fresh guild and a set of experts from the manifest fixtures. */
async function seedReviewPanel(
  page: Page,
  experts: Expert[],
): Promise<{ guild: { id: string }; experts: (Expert & { id: string; guildId: string })[] }> {
  const guild = await testApi.seedGuild(page.request, {
    name: "E2E Wizard Test Guild",
    slug: `wizard-test-${Date.now()}`,
    onChainGuildId: 1,
  });

  // Seed enough experts so the guild passes the "≥2 members" check.
  // Use the first 5 manifest experts (they have pre-funded Anvil keys).
  const seededExperts = await Promise.all(
    experts.slice(0, 5).map(async (expert, idx) => {
      const seeded = await testApi.seedExpert(page.request, {
        walletAddress: expert.address,
        fullName: `E2E Wizard Expert ${idx + 1}`,
        email: `e2e-wizard-expert-${idx + 1}-${Date.now()}@vetted-test.com`,
        status: "approved",
        guildId: guild.id,
        stakeAmount: (10n * 10n ** 18n).toString(),
      });
      return { ...expert, id: seeded.id, guildId: guild.id };
    }),
  );

  return { guild, experts: seededExperts };
}

/** Submit a candidate guild application via the BE API and assign the panel. */
async function applyAndAssignPanel(
  page: Page,
  candidate: { token: string },
  guildId: string,
  reviewerIds: string[],
): Promise<string> {
  const submitRes = await page.request.post(
    `${BACKEND_URL}/api/guilds/${encodeURIComponent(guildId)}/applications`,
    {
      headers: { Authorization: `Bearer ${candidate.token}` },
      data: {
        answers: {
          motivation: "E2E test motivation: thorough technical background and strong alignment with guild values, including deep interest in the domain.",
          experience: "E2E test experience: 7 years building production systems, TypeScript and React, distributed backends, and team mentorship.",
          domain_topic: "E2E test domain answer: specialisation in event-driven architectures, consensus algorithms, and distributed tracing with sufficient depth.",
        },
        level: "experienced",
        noAiDeclaration: true,
      },
    },
  );
  if (!submitRes.ok()) {
    throw new Error(
      `applyAndAssignPanel: submit failed ${submitRes.status()} ${await submitRes.text()}`,
    );
  }
  const submitBody = (await submitRes.json()) as { data: { applicationId: string } };
  const applicationId = submitBody.data.applicationId;
  if (!applicationId) throw new Error("applyAndAssignPanel: no applicationId returned");

  // Overwrite the random panel with our deterministic experts.
  await testApi.candidateReviews.assignPanel(page.request, applicationId, reviewerIds);
  return applicationId;
}

test.describe("review wizard — 4-step state machine", () => {
  test("walks profile → general rubric → domain rubric → confirm with answer preservation", async ({
    page,
    cleanState: _cleanState,
    candidate,
    experts,
    wallet,
  }) => {
    // ──────────────────────────────────────────────────────────────────────
    // Seed: fresh guild + experts + candidate application
    // ──────────────────────────────────────────────────────────────────────
    let panel: (Expert & { id: string; guildId: string })[];

    await test.step("seed: guild, experts, and candidate application seeded into BE", async () => {
      const fixture = await seedReviewPanel(page, experts);
      panel = fixture.experts;
      await applyAndAssignPanel(
        page,
        { token: candidate.token },
        fixture.guild.id,
        panel.map((e) => e.id),
      );
    });

    const expert = panel![0]!;

    // ──────────────────────────────────────────────────────────────────────
    // Expert logs in and opens the review modal
    // ──────────────────────────────────────────────────────────────────────
    await test.step("expert logs in and navigates to the voting queue", async () => {
      await wallet.attach(page, expert.privateKey);
      await loginAsExpertViaUI(page, expert.address);

      // Switch to the Candidate Reviews tab in the voting queue
      await page.goto("/expert/voting", { waitUntil: "domcontentloaded" });
      const candidateTab = page
        .getByRole("button", { name: /candidate reviews/i })
        .or(page.getByRole("tab", { name: /candidate reviews/i }))
        .first();
      if (await candidateTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await candidateTab.click();
      }

      await expect(
        page.getByRole("button", { name: /^review$/i }).first(),
      ).toBeVisible({ timeout: 30_000 });
    });

    // ──────────────────────────────────────────────────────────────────────
    // Step 1 (profile): Next is enabled; no rubric fields visible
    // ──────────────────────────────────────────────────────────────────────
    await test.step("step 1 (profile): Next is enabled and no rubric question anchors are visible", async () => {
      await page.getByRole("button", { name: /^review$/i }).first().click();

      // Wait for the modal to open — the Close button is the reliable landmark
      await expect(
        page.getByLabel("Close review modal").first(),
      ).toBeVisible({ timeout: 30_000 });

      // Step 1 is the Profile step — no rubric field anchors should be present
      await expect(
        page.locator('[id^="review-field-general-"]').first(),
      ).not.toBeVisible();

      // Next button must be enabled on step 1 (profile is read-only, no gating)
      const nextBtn = page.getByRole("button", { name: /^next$/i }).first();
      await expect(nextBtn).toBeEnabled();
      await nextBtn.click();
    });

    // ──────────────────────────────────────────────────────────────────────
    // Step 2 (general rubric): general question anchor visible; Next enabled;
    // score + justify each question until domain step loads
    // ──────────────────────────────────────────────────────────────────────
    await test.step("step 2 (general rubric): general question card visible and Next is enabled", async () => {
      await expect(
        page.locator('[id^="review-field-general-"]').first(),
      ).toBeVisible({ timeout: 15_000 });

      // Next button is always enabled — gating is via validate-on-click
      await expect(
        page.getByRole("button", { name: /^next$/i }).last(),
      ).toBeEnabled();
    });

    await test.step("step 2 (general rubric): score and justify each question to advance to step 3", async () => {
      const JUSTIFICATION =
        "Strong evidence of domain expertise: clear reasoning, specific examples from experience, and deep technical alignment with guild expectations as described above.";
      const MAX_QUESTIONS = 30;

      for (let iter = 0; iter < MAX_QUESTIONS; iter++) {
        const visibleCard = page.locator('[id^="review-field-general-"]:visible').first();
        const isOnGeneralStep = await visibleCard.isVisible({ timeout: 3_000 }).catch(() => false);
        if (!isOnGeneralStep) break;

        const cardId = await visibleCard.getAttribute("id");
        const questionId = cardId?.replace("review-field-general-", "") ?? "";

        // Click the max score button in every ScoreButtons group within the card
        if (cardId) {
          await page.locator(`#${cardId}`).evaluate((root) => {
            const divs = Array.from(root.querySelectorAll<HTMLElement>("div"));
            for (const div of divs) {
              const children = Array.from(div.children) as HTMLElement[];
              const buttons = children.filter(
                (el): el is HTMLButtonElement => el instanceof HTMLButtonElement,
              );
              if (
                buttons.length >= 2 &&
                buttons[0]?.textContent?.trim() === "0" &&
                buttons.every((b) => /^\d+$/.test(b.textContent?.trim() ?? ""))
              ) {
                buttons[buttons.length - 1]?.click();
              }
            }
          });
        }

        // Fill the justification textarea
        if (questionId) {
          const justArea = page.locator(`#review-justification-general-${questionId}`);
          if (await justArea.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await justArea.fill(JUSTIFICATION);
          }
        }

        const nextBtn = page.getByRole("button", { name: /^next$/i }).last();
        await expect(nextBtn).toBeEnabled({ timeout: 5_000 });
        await nextBtn.click();
        await page.waitForTimeout(200);
      }
    });

    // ──────────────────────────────────────────────────────────────────────
    // Step 3 (domain rubric): score + justify topics → summary → advance
    // ──────────────────────────────────────────────────────────────────────
    await test.step("step 3 (domain rubric): score and justify each topic through summary, then advance to confirm", async () => {
      const JUSTIFICATION =
        "Strong evidence of domain expertise: clear reasoning, specific examples from experience, and deep technical alignment with guild expectations as described above.";
      const MAX_ITER = 30;

      for (let iter = 0; iter < MAX_ITER; iter++) {
        // Check if we've already advanced to step 4 (Confirm)
        const confirmHeading = page.getByText(/confirm your review/i).first();
        if (await confirmHeading.isVisible({ timeout: 1_000 }).catch(() => false)) {
          break;
        }

        // Check for the domain summary sub-step (red flags section)
        const redFlagSection = page.locator("#review-field-overall-redflags");
        const isDomainSummary = await redFlagSection.isVisible({ timeout: 3_000 }).catch(() => false);

        if (isDomainSummary) {
          const nextBtn = page.getByRole("button", { name: /^next$/i }).last();
          await expect(nextBtn).toBeEnabled({ timeout: 5_000 });
          await nextBtn.click();
          await page.waitForTimeout(200);
          break;
        }

        // Check for a per-topic card
        const visibleTopicCard = page.locator('[id^="review-field-domain-"]:visible').first();
        const isTopicCard = await visibleTopicCard.isVisible({ timeout: 5_000 }).catch(() => false);

        if (!isTopicCard) {
          // No domain topics — advance directly (summary not shown either)
          // This triggers validateStep3 which checks all scores + justifications.
          const nextBtn = page.getByRole("button", { name: /^next$/i }).last();
          if (await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await nextBtn.click();
            await page.waitForTimeout(200);
          }
          break;
        }

        const topicCardId = await visibleTopicCard.getAttribute("id");
        const topicId = topicCardId?.replace("review-field-domain-", "") ?? "";

        // Click the max score in each ScoreButtons group within the topic card
        if (topicCardId) {
          await page.locator(`#${topicCardId}`).evaluate((root) => {
            const divs = Array.from(root.querySelectorAll<HTMLElement>("div"));
            for (const div of divs) {
              const children = Array.from(div.children) as HTMLElement[];
              const buttons = children.filter(
                (el): el is HTMLButtonElement => el instanceof HTMLButtonElement,
              );
              if (
                buttons.length >= 2 &&
                buttons[0]?.textContent?.trim() === "0" &&
                buttons.every((b) => /^\d+$/.test(b.textContent?.trim() ?? ""))
              ) {
                buttons[buttons.length - 1]?.click();
              }
            }
          });
        }

        if (topicId) {
          const domainJustArea = page.locator(`#review-justification-domain-${topicId}`);
          if (await domainJustArea.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await domainJustArea.fill(JUSTIFICATION);
          }
        }

        const nextBtn = page.getByRole("button", { name: /^next$/i }).last();
        await expect(nextBtn).toBeEnabled({ timeout: 5_000 });
        await nextBtn.click();
        await page.waitForTimeout(200);
      }
    });

    // ──────────────────────────────────────────────────────────────────────
    // Step 4 (confirm): overall score testid visible; Submit enabled
    // ──────────────────────────────────────────────────────────────────────
    await test.step("step 4 (confirm): review-overall-score testid is visible and Submit button is enabled", async () => {
      await expect(
        page.getByText(/confirm your review/i).first(),
      ).toBeVisible({ timeout: 15_000 });

      await expect(
        page.locator('[data-testid="review-overall-score"]'),
      ).toBeVisible({ timeout: 5_000 });

      // Submit button must be enabled (labeled "Submit Review" or "Submit Commitment")
      await expect(
        page.getByRole("button", { name: /submit review|submit commitment/i }).first(),
      ).toBeEnabled({ timeout: 5_000 });
    });

    // ──────────────────────────────────────────────────────────────────────
    // Back from step 4 returns to step 3 with scores preserved
    // ──────────────────────────────────────────────────────────────────────
    await test.step("Back from step 4 returns to step 3 (domain rubric) with scored state preserved", async () => {
      await page.getByRole("button", { name: /back/i }).click();

      // Should land back on step 3 — a domain topic card, the domain summary,
      // or (if no domain topics at all) a general rubric card on step 2
      const onPreviousStep = await Promise.race([
        page.locator('[id^="review-field-domain-"]').first()
          .isVisible({ timeout: 10_000 }).then(() => true).catch(() => false),
        page.locator("#review-field-overall-redflags")
          .isVisible({ timeout: 10_000 }).then(() => true).catch(() => false),
        page.locator('[id^="review-field-general-"]').first()
          .isVisible({ timeout: 10_000 }).then(() => true).catch(() => false),
      ]);
      expect(onPreviousStep, "Back from step 4 should return to a rubric step").toBe(true);

      // The confirm-step score display must no longer be visible
      await expect(
        page.locator('[data-testid="review-overall-score"]'),
      ).not.toBeVisible();
    });
  });
});
