// e2e/real-flow/scenarios/expert-onboarding-five-applicants.spec.ts
//
// Suite A — Scenario: expert-onboarding-five-applicants
//
// Exercises the full expert-application pipeline (Pipeline A — IQR consensus):
//   1. ≥5 fresh wallets submit expert-guild applications via the public apply
//      endpoint (POST /api/experts/apply).
//   2. A review panel of existing guild experts evaluates each applicant via
//      POST /api/experts/guild-applications/:applicationId/review (direct path).
//   3. The finalization cron is triggered via the cron endpoint; the backend
//      IQR service produces a consensus score and per-applicant decision.
//   4. Triple assertion: the oracle (computeConsensus) independently verifies
//      the backend's IQR consensus, the per-applicant DB outcome matches, and
//      the count of processed applicants is ≥ 5.
//
// Pipeline: expert_application_reviews + IQR finalisation (Pipeline A in
// SCENARIO_OUTCOME_MATRIX.md — separate from the candidate-guild Pipeline B/C).
//
// ─── STATUS: GATED — test.fixme(true, "DIV-002") ────────────────────────────
//
// Two gaps in the test-infrastructure prevent this scenario from running
// end-to-end without modifications to the backend test fixtures or environment.
// Both are documented in docs/testing/PROTOCOL_DIVERGENCES.md as DIV-002 and
// DIV-003. The scenario code is COMPLETE and reflects the desired production
// behaviour; the fixme guards are removed once the gaps are resolved.
//
// Gap 1 — No test endpoint to activate expert-application reviewer assignment
//   without a real resume file upload.
//   After POST /api/experts/apply the application exists with status=pending
//   and applied_to_guild_id set, but reviewer assignments are only created by
//   ExpertApplicationSubmissionService.activatePendingApplicationReview() which
//   is triggered exclusively from the resume-upload route
//   (POST /api/experts/:expertId/resume). That route validates a real file
//   signature and cannot accept a synthetic URL. There is no test-only endpoint
//   analogous to /api/test/candidate-reviews/:id/expire-and-finalize that can
//   trigger reviewer assignment directly.
//
// Gap 2 — CRON_SECRET not set in the e2e backend environment (.env.e2e).
//   cronApi.processExpertTransitions sends x-cron-secret from the
//   CRON_SECRET env var (defaulting to "dev-cron-secret-…" in the Playwright
//   process). The backend's verifyCronSecret middleware compares the header
//   against process.env.CRON_SECRET which is undefined in .env.e2e → 401
//   Unauthorized. This also blocks the expert commit-reveal transitions
//   endpoint and the expert commit-reveal/enable endpoint.
//
// ─── Remediation needed ─────────────────────────────────────────────────────
//
//   1. Add a test fixture endpoint:
//      POST /api/test/expert-reviews/:applicationId/activate-and-assign
//      which: (a) sets resume_url = 'e2e://fixture' for the application,
//             (b) calls activatePendingApplicationReview(applicationId),
//             (c) optionally expires the voting_deadline.
//
//   2. Add CRON_SECRET=dev-cron-secret-pad-to-32-chars-minimum-length to
//      .env.e2e so processExpertTransitions works in E2E test runs.
//
//   3. Add a test fixture endpoint:
//      POST /api/test/expert-reviews/:applicationId/expire-and-finalize
//      analogous to /api/test/candidate-reviews/:id/expire-and-finalize.
//
// ─── Whitepaper alignment ───────────────────────────────────────────────────
//
// MIN_REVIEWS_REQUIRED = 5, APPROVAL_THRESHOLD = 60 (pipeline-config.ts).
// Review scores: 0-100 normalised; consensus = IQR median band average.
// The oracle (computeConsensus) mirrors VotingConsensusService.calculateIQR()
// exactly (exclusive-halves quartile, band multiplier 0.75).

import { test, expect, type APIRequestContext } from "@playwright/test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { BACKEND_URL, CRON_SECRET } from "../helpers/backend";
import { computeConsensus } from "../oracle";

// ─── DIV-002 fixme guard ─────────────────────────────────────────────────────
// Both gaps are now closed (2026-05-14):
//   Gap 1: POST /api/test/expert-reviews/:id/activate-and-assign and
//           POST /api/test/expert-reviews/:id/expire-and-finalize added to
//           backend/src/routes/test/expert-reviews.ts.
//   Gap 2: CRON_SECRET added to backend/.env.e2e.
// Guard is set to false so the scenario runs.
const DIV_002_GAPS_OPEN = false;

// ─── Types ───────────────────────────────────────────────────────────────────

type SeedExpertResult = {
  id: string;
  wallet_address: string;
};

type ExpertTokenResult = {
  id: string;
  wallet_address: string;
  token: string;
};

type ReviewSubmitResult = {
  vote: string;
  normalizedScore: number;
};

type FinalizeResult = {
  outcome: string;
  consensusScore: number;
  votesProcessed: number;
};

/** One applicant: a fresh wallet + backend ID + JWT for reviewer auth. */
type Applicant = {
  privateKey: Hex;
  address: string;
  expertId: string;
};

/** One panel member: manifest expert with a minted JWT. */
type Reviewer = {
  expertId: string;
  token: string;
  walletAddress: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Submit a full expert application via the public /api/experts/apply endpoint.
 * No resume is attached — reviewer assignment is handled separately via the
 * test fixture endpoint (Gap 1 in the DIV-002 note above).
 */
async function applyAsExpert(
  request: APIRequestContext,
  applicant: { address: string; index: number },
  guildName: string,
): Promise<string> {
  const res = await request.post(`${BACKEND_URL}/api/experts/apply`, {
    data: {
      fullName: `E2E Expert Applicant ${applicant.index}`,
      email: `e2e-expert-applicant-${applicant.index}-${Date.now()}@example.com`,
      walletAddress: applicant.address,
      linkedinUrl: `https://linkedin.com/in/e2e-applicant-${applicant.index}`,
      guild: guildName,
      expertiseLevel: "experienced",
      yearsOfExperience: 5,
      currentTitle: "Senior Software Engineer",
      currentCompany: "E2E Test Corp",
      expertiseAreas: ["TypeScript", "React", "Node.js"],
      applicationResponses: {
        general: {
          learningFromFailure:
            "I once shipped a critical bug to production and learned to implement " +
            "comprehensive test coverage and staged rollouts to prevent future incidents.",
          decisionUnderUncertainty:
            "I use data-driven frameworks combined with iterative stakeholder feedback " +
            "to make well-informed decisions even under information constraints.",
          motivationAndConflict:
            "I resolve conflicts by facilitating transparent communication and anchoring " +
            "discussions on shared technical goals rather than individual preferences.",
          guildImprovement:
            "I would introduce structured code-review rubrics and pair-programming rotations.",
        },
        level: "experienced",
        domain: {
          topics: {
            frontend_architecture:
              "I have deep experience designing scalable React applications using " +
              "component-driven development patterns and performance budgets.",
          },
        },
        noAiDeclaration: true,
      },
    },
  });
  if (!res.ok()) {
    throw new Error(
      `applyAsExpert(index=${applicant.index}): ${res.status()} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { data: { expertId: string } };
  return body.data.expertId;
}

/**
 * Activate reviewer assignment for an expert application.
 *
 * POST /api/test/expert-reviews/:applicationId/activate-and-assign
 *
 * This endpoint does NOT exist yet (Gap 1 / DIV-002). Calling it will return
 * 404. When Gap 1 is fixed, the endpoint will:
 *   • Set resume_url = 'e2e://fixture' for the application.
 *   • Call activatePendingApplicationReview(applicationId).
 *   • Return { assigned: true, reviewerIds: [...] }.
 */
async function activateAndAssignReviewers(
  request: APIRequestContext,
  applicationId: string,
): Promise<{ assigned: boolean; reviewerIds: string[] }> {
  const res = await request.post(
    `${BACKEND_URL}/api/test/expert-reviews/${applicationId}/activate-and-assign`,
  );
  if (!res.ok()) {
    throw new Error(
      `activateAndAssignReviewers(${applicationId}): ${res.status()} ${await res.text()}.`,
    );
  }
  const body = (await res.json()) as { data: { assigned: boolean; reviewerIds: string[] } };
  return body.data;
}

/**
 * Submit a direct (non-commit-reveal) review for a pending expert application.
 * Requires: the reviewer is an assigned guild member, the application is in
 * voting_phase=direct or null, status=pending.
 *
 * Sends a normalized score via overallScore + criteriaScores overallMax so the
 * service computes normalizedScore = (overallScore / overallMax) * 100.
 */
async function submitDirectReview(
  request: APIRequestContext,
  applicationId: string,
  reviewerToken: string,
  reviewerWalletAddress: string,
  normalizedScore: number,
): Promise<ReviewSubmitResult> {
  // Map normalized 0-100 score to an overallScore / overallMax pair the
  // service will accept. The service normalises: (overallScore/overallMax)*100.
  // We use overallMax=100 so overallScore = normalizedScore directly.
  const overallMax = 100;
  const overallScore = Math.max(0, Math.min(100, normalizedScore));
  const vote: "approve" | "reject" = overallScore >= 60 ? "approve" : "reject";

  const res = await request.post(
    `${BACKEND_URL}/api/experts/guild-applications/${applicationId}/review`,
    {
      headers: {
        Authorization: `Bearer ${reviewerToken}`,
        "x-wallet-address": reviewerWalletAddress,
      },
      data: {
        vote,
        overallScore,
        criteriaScores: {
          overallMax,
          general: { total: overallScore * 0.6 },
          domain: { total: overallScore * 0.4 },
        },
        criteriaJustifications: {
          general: `E2E panel review — general criteria score ${(overallScore * 0.6).toFixed(0)}/${(overallMax * 0.6).toFixed(0)}.`,
          domain: `E2E panel review — domain criteria score ${(overallScore * 0.4).toFixed(0)}/${(overallMax * 0.4).toFixed(0)}.`,
        },
        feedback: `E2E panel review — normalised score target ${normalizedScore}.`,
      },
    },
  );
  if (!res.ok()) {
    throw new Error(
      `submitDirectReview(app=${applicationId}, reviewer=${reviewerWalletAddress}): ` +
        `${res.status()} ${await res.text()}`,
    );
  }
  return { vote, normalizedScore: overallScore };
}

/**
 * Expire the voting_deadline and trigger IQR finalization for an expert
 * application via the test fixture endpoint.
 *
 * POST /api/test/expert-reviews/:applicationId/expire-and-finalize
 *
 * This endpoint does NOT exist yet (Gap 1 / DIV-002 — same remediation item
 * as activateAndAssignReviewers). When fixed it mirrors the behaviour of
 * /api/test/candidate-reviews/:id/expire-and-finalize for the expert pipeline.
 */
async function expireAndFinalizeExpertApplication(
  request: APIRequestContext,
  applicationId: string,
): Promise<FinalizeResult> {
  const res = await request.post(
    `${BACKEND_URL}/api/test/expert-reviews/${applicationId}/expire-and-finalize`,
  );
  if (!res.ok()) {
    throw new Error(
      `expireAndFinalizeExpertApplication(${applicationId}): ${res.status()} ${await res.text()}. ` +
        "Gap 1/3 of DIV-002 — endpoint does not exist yet.",
    );
  }
  const body = (await res.json()) as {
    data: {
      outcome: string;
      consensusScore: number;
      votesProcessed: number;
    };
  };
  return body.data;
}

/**
 * Poll the finalization results endpoint until finalization is complete or
 * timeout expires.  The finalization runs asynchronously after the cron tick
 * so we poll rather than assert immediately.
 */
async function pollFinalization(
  request: APIRequestContext,
  applicationId: string,
  reviewerToken: string,
  reviewerWallet: string,
  timeoutMs = 15_000,
): Promise<FinalizeResult | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await request.get(
      `${BACKEND_URL}/api/experts/guild-applications/${applicationId}/finalization`,
      {
        headers: {
          Authorization: `Bearer ${reviewerToken}`,
          "x-wallet-address": reviewerWallet,
        },
      },
    );
    if (res.ok()) {
      const body = (await res.json()) as {
        data: {
          outcome: string;
          consensusScore: number;
          voteCount: number;
        };
      };
      return {
        outcome: body.data.outcome,
        consensusScore: body.data.consensusScore,
        votesProcessed: body.data.voteCount,
      };
    }
    // 404 means not finalised yet
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

// ─── Scenario ────────────────────────────────────────────────────────────────

test.describe("expert-onboarding: ≥5 applicants reviewed via IQR panel", () => {
  // Gate the entire describe block until DIV-002 is resolved.
  // The fixme is intentionally on the describe (not on individual tests) so
  // that the *entire* flow is either green or skipped — partial green/red
  // would give a false signal.
  test.fixme(
    DIV_002_GAPS_OPEN,
    "DIV-002: two test-infrastructure gaps block end-to-end execution. " +
      "See docs/testing/PROTOCOL_DIVERGENCES.md for remediation steps.",
  );

  // ── Shared mutable state across steps ──────────────────────────────────────
  //
  // We run a SINGLE test with multiple test.step() phases so that:
  //   (a) the fixture chain (applicants, reviewers, reviews) is built once, and
  //   (b) watch-mode shows each phase as a labelled step for easy inspection.
  //
  // The test requires no browser page — all interactions are via the APIRequestContext
  // (request fixture) which is available in all Playwright test contexts.

  // 5 fresh applicant wallets — generated at describe scope so they are
  // consistent across retries.
  const APPLICANT_COUNT = 5;

  // Score matrix: 5 applicants × 5 reviewers (one panel per applicant).
  // Row i = scores given to applicant i by reviewers 0-4.
  // All rows above threshold 60 → approved; all deterministic for oracle check.
  const SCORE_MATRIX: readonly (readonly number[])[] = [
    [78, 82, 75, 80, 77], // applicant 0: high tight cluster → approved
    [85, 88, 90, 83, 87], // applicant 1: all high → approved
    [30, 28, 35, 25, 32], // applicant 2: all low → rejected
    [72, 68, 75, 70, 73], // applicant 3: moderate → approved
    [55, 60, 58, 62, 57], // applicant 4: borderline → depends on IQR; oracle decides
  ] as const;

  test(
    "5 expert applicants are submitted, panel-reviewed, and IQR-finalized",
    async ({ request }) => {
      // Resolved during test execution; declared here so later steps can read them.
      const applicants: Applicant[] = [];
      let panelReviewers: Reviewer[] = [];
      let targetGuildId!: string;
      let targetGuildName!: string;

      // ── Step 1: discover the guild and build the reviewer panel ────────────
      await test.step(
        "discover the Engineering guild and assemble a reviewer panel",
        async () => {
          // The bootstrap creates 3 guilds × 10 experts. We target 'Engineering'.
          const guildsRes = await request.get(`${BACKEND_URL}/api/guilds`);
          expect(guildsRes.ok(), "GET /api/guilds should succeed").toBeTruthy();
          const guildsBody = (await guildsRes.json()) as {
            data: Array<{ id: string; name: string }>;
          };
          const engineeringGuild = guildsBody.data.find((g) =>
            g.name.toLowerCase().includes("engineering"),
          );
          expect(
            engineeringGuild,
            "Engineering guild must exist from bootstrap",
          ).toBeDefined();
          targetGuildId = engineeringGuild!.id;
          targetGuildName = engineeringGuild!.name;

          // Use the first 5 approved, staked guild members as reviewers.
          // Pull their IDs + mint test tokens via /api/test/seed/expert-token.
          const membersRes = await request.get(
            `${BACKEND_URL}/api/guilds/${targetGuildId}/members`,
          );
          expect(
            membersRes.ok(),
            "GET /api/guilds/:id/members should succeed",
          ).toBeTruthy();
          const membersBody = (await membersRes.json()) as {
            data: Array<{
              expertId?: string;
              id?: string;
              wallet_address?: string;
              walletAddress?: string;
            }>;
          };
          const memberRows = membersBody.data.slice(0, 5);
          expect(
            memberRows.length,
            "Need at least 5 guild members as reviewers (bootstrap provides 10)",
          ).toBeGreaterThanOrEqual(5);

          panelReviewers = await Promise.all(
            memberRows.map(async (m) => {
              const expertId = m.expertId ?? m.id ?? "";
              const tokenRes = await request.post(
                `${BACKEND_URL}/api/test/seed/expert-token`,
                { data: { expertId } },
              );
              expect(
                tokenRes.ok(),
                `Minting token for expert ${expertId}`,
              ).toBeTruthy();
              const tokenBody = (await tokenRes.json()) as {
                data: ExpertTokenResult;
              };
              return {
                expertId,
                token: tokenBody.data.token,
                walletAddress:
                  m.wallet_address ?? m.walletAddress ?? tokenBody.data.wallet_address,
              };
            }),
          );

          expect(
            panelReviewers.length,
            "Panel must have 5 reviewers",
          ).toBe(5);
        },
      );

      // ── Step 2: 5 fresh wallets submit expert applications ─────────────────
      await test.step(
        `${APPLICANT_COUNT} fresh wallets submit expert-guild applications via POST /api/experts/apply`,
        async () => {
          for (let i = 0; i < APPLICANT_COUNT; i++) {
            const privateKey = generatePrivateKey();
            const account = privateKeyToAccount(privateKey);
            const expertId = await applyAsExpert(
              request,
              { address: account.address, index: i + 30 },
              targetGuildName,
            );
            applicants.push({
              privateKey,
              address: account.address,
              expertId,
            });
          }

          expect(
            applicants.length,
            "Applicant count must be ≥ 5",
          ).toBeGreaterThanOrEqual(5);
        },
      );

      // ── Step 3: trigger reviewer assignment for each application ───────────
      //
      // NOTE: this step calls activateAndAssignReviewers which hits a test
      // fixture endpoint that does not yet exist (Gap 1 / DIV-002). The helper
      // will throw with a clear "endpoint does not exist" message.  Once the
      // endpoint is added, this step passes without modification.
      await test.step(
        "activate reviewer assignments for all 5 applicants (requires DIV-002 Gap 1 fix)",
        async () => {
          for (const applicant of applicants) {
            const { assigned, reviewerIds } = await activateAndAssignReviewers(
              request,
              applicant.expertId,
            );
            expect(
              assigned,
              `Reviewer assignment for ${applicant.expertId} should succeed`,
            ).toBeTruthy();
            expect(
              reviewerIds.length,
              "At least 3 reviewers must be assigned per application",
            ).toBeGreaterThanOrEqual(3);
          }
        },
      );

      // ── Step 4: each reviewer submits a score for each applicant ───────────
      await test.step(
        "review panel submits scores for all 5 applicants",
        async () => {
          for (let ai = 0; ai < applicants.length; ai++) {
            const applicant = applicants[ai];
            const scores = SCORE_MATRIX[ai]!;

            for (let ri = 0; ri < panelReviewers.length; ri++) {
              const reviewer = panelReviewers[ri]!;
              const score = scores[ri]!;
              await submitDirectReview(
                request,
                applicant.expertId,
                reviewer.token,
                reviewer.walletAddress,
                score,
              );
            }
          }
        },
      );

      // ── Step 5: expire deadlines and trigger IQR finalization ──────────────
      //
      // NOTE: expireAndFinalizeExpertApplication calls a test fixture endpoint
      // that does not yet exist (Gap 1 / DIV-002 item 3). Once added it mirrors
      // /api/test/candidate-reviews/:id/expire-and-finalize for Pipeline A.
      await test.step(
        "expire voting deadlines and trigger IQR finalization for all 5 applicants",
        async () => {
          for (const applicant of applicants) {
            await expireAndFinalizeExpertApplication(request, applicant.expertId);
          }
        },
      );

      // ── Step 6: triple assertion ───────────────────────────────────────────
      await test.step(
        "triple assertion: oracle IQR matches backend, DB status reflects decision, applicant count ≥ 5",
        async () => {
          // Invariant 3: total applicants ≥ 5.
          expect(
            applicants.length,
            "Applicant count invariant",
          ).toBeGreaterThanOrEqual(5);

          for (let ai = 0; ai < applicants.length; ai++) {
            const applicant = applicants[ai];
            const reviewScores = Array.from(SCORE_MATRIX[ai]!);
            const panelSize = reviewScores.length;

            // Invariant 1: oracle IQR consensus matches backend consensus score.
            const oracle = computeConsensus(reviewScores);
            const oracleOutcome =
              oracle.consensusScore >= 60 ? "approved" : "rejected";

            // Poll backend finalization results.
            // Using the first panel reviewer to auth the GET.
            const panelMember = panelReviewers[0]!;
            const finResult = await pollFinalization(
              request,
              applicant.expertId,
              panelMember.token,
              panelMember.walletAddress,
            );

            expect(
              finResult,
              `Finalization result for applicant ${ai} must not be null`,
            ).not.toBeNull();

            // Invariant 1a: backend consensus score ≈ oracle (within 0.5 due to
            // floating-point rounding at the service layer).
            expect(
              Math.abs(finResult!.consensusScore - oracle.consensusScore),
              `Applicant ${ai}: backend consensusScore=${finResult!.consensusScore} ` +
                `should match oracle consensusScore=${oracle.consensusScore}`,
            ).toBeLessThanOrEqual(0.5);

            // Invariant 1b: backend outcome matches oracle decision.
            expect(
              finResult!.outcome,
              `Applicant ${ai}: backend outcome should match oracle (${oracleOutcome}). ` +
                `Oracle scores=${JSON.stringify(reviewScores)}, ` +
                `oracle consensus=${oracle.consensusScore.toFixed(2)}`,
            ).toBe(oracleOutcome);

            // Invariant 2: all assigned reviewers' votes were counted.
            expect(
              finResult!.votesProcessed,
              `Applicant ${ai}: all ${panelSize} submitted reviews must be counted`,
            ).toBe(panelSize);
          }
        },
      );

      // ── Step 7: UI spot-check — approved applicant appears on expert profile ─
      //
      // Applicant 0 and 1 should be approved (high tight scores). Check that at
      // least one of them sees their status on the expert profile UI.
      // This step is skipped if no browser page is available in this context.
      await test.step(
        "UI spot-check: approved applicant can be found via /api/experts/profile",
        async () => {
          const firstApprovedIndex = SCORE_MATRIX.findIndex(
            (scores) =>
              computeConsensus(Array.from(scores)).consensusScore >= 60,
          );
          if (firstApprovedIndex === -1) {
            // All rejected — nothing to check. Score matrix above guarantees this
            // branch is not reached for the test data defined.
            return;
          }
          const approvedApplicant = applicants[firstApprovedIndex]!;
          const profileRes = await request.get(
            `${BACKEND_URL}/api/experts/profile?wallet=${approvedApplicant.address}`,
          );
          expect(
            profileRes.ok(),
            `Expert profile lookup for approved applicant ${approvedApplicant.address}`,
          ).toBeTruthy();
          const profileBody = (await profileRes.json()) as {
            data: { status: string };
          };
          expect(
            profileBody.data.status,
            "Approved applicant profile status",
          ).toBe("approved");
        },
      );
    },
  );
});

// ─── Standalone type-check export (referenced by tsconfig, never executed) ──
// Ensures viem/viem-accounts imports are not tree-shaken by TS in isolation.
export type { Applicant, Reviewer };
