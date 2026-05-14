#!/usr/bin/env tsx
// e2e/real-flow/experiments/run-experiment.ts
//
// Volume / experiment harness — parameterised driver that runs N candidate
// review panels, diffs every finalized result against the oracle, and emits a
// run report.
//
// Usage:
//   BACKEND_URL=http://localhost:4100 npm run e2e:experiment -- \
//     --applications=20 --mode=hybrid --uiSampleRate=0.1 --distribution=realistic
//
// For full parameter docs see e2e/real-flow/experiments/README.md.
//
// DIV-001 awareness
// -----------------
// Candidate guild-applications submitted via the UI guild-apply endpoint
// (POST /api/guilds/{id}/applications) land in Pipeline C (simple majority).
// They do NOT create a candidate_proposal and therefore cannot be driven through
// the IQR/commit-reveal Pipeline B. This is tracked in
// docs/testing/PROTOCOL_DIVERGENCES.md as DIV-001.
//
// The harness runs Pipeline C at volume (POST /api/guilds/{id}/applications →
// expert reviews via POST /api/candidate-proposals/{id}/review → expire-and-
// finalize). The IQR oracle is irrelevant here; this harness uses the correct
// PIPELINE_C oracle (simple majority). When DIV-001 is fixed and uiSampleRate
// is raised, the driver will exercise the UI path end-to-end with no harness
// changes required.

import path from "node:path";
import { makePanelScores, type ScoreDistribution } from "./distributions";
import {
  buildReport,
  writeReport,
  type ApplicationResult,
  type ExperimentRun,
} from "./report";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";
const CRON_SECRET =
  process.env.CRON_SECRET ?? "dev-cron-secret-pad-to-32-chars-minimum-length";

// A vote is "approve" when the normalized score >= the approval threshold.
const APPROVAL_THRESHOLD_PCT = 60; // §4 in constants.ts → protocol.config.ts

// On-screen score buttons for the rubric wizard (1–10), mapped to API values.
// The harness sends the raw overall_score as the integer 0–100 and lets the
// backend derive the vote. (Verified from candidate-proposal-review.service.ts
// line ~170: vote = finalOverallScore >= 60 ? "approve" : "reject").

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string, fallback: string) => {
    const entry = args.find((a) => a.startsWith(`${flag}=`));
    return entry ? entry.split("=")[1] : fallback;
  };
  return {
    applications: Number(get("--applications", "20")),
    guilds: Number(get("--guilds", "1")),
    distribution: get("--distribution", "realistic") as ScoreDistribution,
    mode: get("--mode", "hybrid") as "hybrid" | "ui-soak",
    uiSampleRate: Number(get("--uiSampleRate", "0")),
    panelSize: Number(get("--panelSize", "5")),
    seed: Number(get("--seed", String(Date.now() % 100_000))),
  };
}

// ---------------------------------------------------------------------------
// Manifest helpers
// ---------------------------------------------------------------------------

type ManifestExpert = {
  id: string;
  address: string;
  privateKey: string;
  guildId: string;
};

type ManifestGuild = {
  id: string;
  name: string;
  onChainGuildId: string;
};

type Manifest = {
  guilds: ManifestGuild[];
  experts: ManifestExpert[];
};

function loadManifest(): Manifest {
  const p = path.resolve(
    __dirname,
    "../bootstrap/manifest.json",
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(p) as Manifest;
}

function expertsForGuild(manifest: Manifest, guildId: string): ManifestExpert[] {
  return manifest.experts.filter((e) => e.guildId === guildId);
}

// ---------------------------------------------------------------------------
// HTTP helpers (pure fetch — no Playwright needed outside the UI slice)
// ---------------------------------------------------------------------------

async function backendPost<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`POST ${path} → ${res.status} ${text}`);
  }
   
  return (JSON.parse(text) as { data: T }).data;
}

async function backendGet<T>(path: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...headers },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET ${path} → ${res.status} ${text}`);
  }
   
  return (JSON.parse(text) as { data: T }).data;
}

// ---------------------------------------------------------------------------
// Candidate account creation (needed per application)
// ---------------------------------------------------------------------------

async function createCandidate(): Promise<{ token: string; candidateId: string }> {
  const ts = Date.now();
  const email = `harness-${ts}-${Math.floor(Math.random() * 10000)}@vetted-test.com`;
  const data = await backendPost<{ token: string; refreshToken?: string; candidate: { id: string } }>(
    "/api/candidates",
    {
      fullName: `Harness Candidate ${ts}`,
      email,
      password: "HarnessPass123!",
      phone: "",
      headline: "Volume Harness Test",
      experienceLevel: "mid",
      socialLinks: [{ platform: "linkedin", label: "LinkedIn", url: `https://linkedin.com/in/harness-${ts}` }],
    },
  );
  return { token: data.token, candidateId: data.candidate.id };
}

// ---------------------------------------------------------------------------
// Pipeline C application submission
// ---------------------------------------------------------------------------

async function submitGuildApplication(
  guildId: string,
  token: string,
): Promise<string> {
  // This hits POST /api/guilds/{guildId}/applications which creates a
  // candidate_guild_applications row (Pipeline C — simple majority).
  // It does NOT create a candidate_proposals row (DIV-001).
  const data = await backendPost<{ id: string; application?: { id: string } }>(
    `/api/guilds/${encodeURIComponent(guildId)}/applications`,
    {
      answers: {
        motivation:
          "Volume harness motivation answer with sufficient detail to pass minimum length validation checks.",
        experience:
          "Volume harness experience answer covering professional expertise and depth of domain knowledge.",
        domain_topic:
          "Volume harness domain answer with concrete examples and sufficient technical detail.",
      },
      level: "experienced",
      noAiDeclaration: true,
    },
    { Authorization: `Bearer ${token}` },
  );

  // BE may return the application id at top level under different key names
  // Observed: { applicationId: "...", reviewersAssigned: N, message: "..." }
  const id =
    (data as { id?: string }).id ??
    (data as { applicationId?: string }).applicationId ??
    (data as { application?: { id?: string } }).application?.id;
  if (!id) {
    throw new Error(`submitGuildApplication: no application id in response: ${JSON.stringify(data)}`);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Identify which of the given expert addresses are assigned to an application.
// Uses GET /api/guilds/{guildId}/candidate-applications?wallet={address} which
// filters to only return applications the expert is assigned to review.
// ---------------------------------------------------------------------------

async function findAssignedExperts(
  guildId: string,
  applicationId: string,
  expertAddresses: string[],
): Promise<string[]> {
  const assigned: string[] = [];
  await Promise.all(
    expertAddresses.map(async (address) => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/guilds/${encodeURIComponent(guildId)}/candidate-applications?wallet=${encodeURIComponent(address)}`,
          { method: "GET", headers: { "x-wallet-address": address } },
        );
        if (!res.ok) return;
        const body = (await res.json()) as { data: Array<{ id: string }> };
        if (body.data.some((app) => app.id === applicationId)) {
          assigned.push(address);
        }
      } catch {
        // Silently skip — expert not assigned or endpoint unavailable.
      }
    }),
  );
  return assigned;
}

// ---------------------------------------------------------------------------
// Submit expert review for Pipeline C
// (POST /api/candidate-proposals/:id/review with x-wallet-address header)
// ---------------------------------------------------------------------------

async function submitPipelineCReview(
  applicationId: string,
  expertAddress: string,
  score0to100: number,
): Promise<void> {
  const vote = score0to100 >= APPROVAL_THRESHOLD_PCT ? "approve" : "reject";
  // criteriaScores is required by the validation schema. We provide a minimal
  // rubric entry with the harness score so the backend can accept the review.
  // vote is set explicitly so the backend does not try to infer it from the ratio.
  const criteriaScores = {
    general: { total: score0to100, q1: score0to100 },
    overallMax: 100,
  };
  const criteriaJustifications = {
    general: "Volume harness automated review: score based on seeded distribution.",
  };
  await backendPost<unknown>(
    `/api/candidate-proposals/${applicationId}/review`,
    {
      vote,
      overallScore: score0to100,
      confidenceLevel: 3,
      feedback: "Volume harness automated review.",
      criteriaScores,
      criteriaJustifications,
      walletAddress: expertAddress,
    },
    { "x-wallet-address": expertAddress },
  );
}

// ---------------------------------------------------------------------------
// Pipeline C oracle: simple majority
// ---------------------------------------------------------------------------

/**
 * Predict the Pipeline C outcome from a set of scores.
 * Pipeline C maps score → vote via the 60-point threshold, then uses
 * floor(totalAssigned/2)+1 approvals to approve.
 */
function pipelineCOracle(scores: number[], totalAssigned: number): {
  oracleOutcome: "approved" | "rejected";
  oracleConsensus: number; // 1 = approved, 0 = rejected
} {
  const approvals = scores.filter((s) => s >= APPROVAL_THRESHOLD_PCT).length;
  const majorityThreshold = Math.floor(totalAssigned / 2) + 1;
  const approved = approvals >= majorityThreshold;
  return {
    oracleOutcome: approved ? "approved" : "rejected",
    oracleConsensus: approved ? 1 : 0,
  };
}

// ---------------------------------------------------------------------------
// Expire-and-finalize via test API
// ---------------------------------------------------------------------------

type FinalizeResult = {
  finalization: { processed: number; succeeded: number; failed: number };
  application: { id: string; status: string; review_count: number };
  assignments: Array<{ reviewer_id: string; has_reviewed: boolean; forfeited: boolean; wallet_address: string; reputation_score: number }>;
  reputationLog: Array<{ expert_id: string; event_type: string; amount: number; reason: string }>;
};

async function expireAndFinalize(applicationId: string): Promise<FinalizeResult> {
  return backendPost<FinalizeResult>(
    `/api/test/candidate-reviews/${applicationId}/expire-and-finalize`,
    {},
  );
}

// ---------------------------------------------------------------------------
// Drive one application through the API/chain path (Pipeline C)
// ---------------------------------------------------------------------------

type SingleRunResult = {
  applicationResult: ApplicationResult;
  skipped: boolean;
  skipReason?: string;
};

async function runOneApplication(
  appIndex: number,
  guildId: string,
  guildExperts: ManifestExpert[],
  panelSize: number,
  distribution: ScoreDistribution,
  seed: number,
  via: "api" | "ui",
): Promise<SingleRunResult> {
  const t0 = Date.now();

  // Generate panel scores upfront (seeded with a deterministic per-application seed).
  const appSeed = seed * 1000 + appIndex;
  const scoresForPanel = makePanelScores(distribution, panelSize, appSeed);

  let applicationId = "";
  try {
    // 1. Create a fresh candidate and submit the application.
    const candidate = await createCandidate();
    applicationId = await submitGuildApplication(guildId, candidate.token);

    // 2. Identify which manifest experts were actually assigned as reviewers.
    // The backend assigns from the guild's actual member list; we only have
    // private keys for manifest experts, so we identify the intersection.
    const allAddresses = guildExperts.map((e) => e.address);
    const assignedAddresses = await findAssignedExperts(guildId, applicationId, allAddresses);

    if (assignedAddresses.length === 0) {
      throw new Error(
        `No manifest experts were assigned as reviewers for application ${applicationId}. ` +
          `The backend may have assigned non-manifest experts to this guild. ` +
          `Guild: ${guildId}, Available manifest experts: ${guildExperts.length}.`,
      );
    }

    // 3. Map each assigned expert to a score from the generated distribution.
    // We use only as many scores as we have assigned reviewers.
    const reviewerScores = assignedAddresses.map((addr, i) => ({
      address: addr,
      score: scoresForPanel[i % scoresForPanel.length],
    }));

    // 4. Submit expert reviews (one per assigned reviewer).
    for (const { address, score } of reviewerScores) {
      await submitPipelineCReview(applicationId, address, score);
    }

    // 5. Expire and finalize.
    const finalizeResult = await expireAndFinalize(applicationId);
    const platformStatus = finalizeResult.application.status; // "approved" | "rejected"

    // 6. Platform consensus as a number (1=approved, 0=rejected).
    const platformConsensus = platformStatus === "approved" ? 1 : 0;

    // 7. Oracle prediction — use the ACTUAL scores we submitted.
    const actualScores = reviewerScores.map((r) => r.score);
    const totalAssigned = finalizeResult.assignments.length || reviewerScores.length;
    const { oracleConsensus } = pipelineCOracle(actualScores, totalAssigned);

    const consensusMatch = platformConsensus === oracleConsensus;

    return {
      applicationResult: {
        applicationId,
        scores: actualScores,
        platformConsensus,
        oracleConsensus,
        consensusMatch,
        via,
        durationMs: Date.now() - t0,
      },
      skipped: false,
    };
  } catch (err) {
    // Capture any per-application error without crashing the whole run.
    const errMsg = err instanceof Error ? err.message : String(err);
    const isDIV001 = errMsg.includes("candidate_proposal") || errMsg.includes("proposalId");
    return {
      applicationResult: {
        applicationId: applicationId || `error-${appIndex}`,
        scores: scoresForPanel,
        platformConsensus: -1,
        oracleConsensus: -1,
        consensusMatch: false,
        via,
        blockedBy: isDIV001 ? ["DIV-001"] : undefined,
        durationMs: Date.now() - t0,
      },
      skipped: true,
      skipReason: errMsg,
    };
  }
}

// ---------------------------------------------------------------------------
// Main experiment driver
// ---------------------------------------------------------------------------

async function main() {
  const cfg = parseArgs();
  const manifest = loadManifest();

  console.log("[harness] Vetted Volume Experiment Harness");
  console.log("[harness] Config:", JSON.stringify(cfg, null, 2));
  console.log(`[harness] Backend: ${BACKEND_URL}`);
  console.log(`[harness] Manifest: ${manifest.guilds.length} guilds, ${manifest.experts.length} experts`);

  // Pick guilds to rotate over.
  const guildsToUse = manifest.guilds.slice(0, Math.min(cfg.guilds, manifest.guilds.length));
  if (guildsToUse.length === 0) {
    throw new Error("No guilds in manifest. Run `npm run e2e:bootstrap -- 3` first.");
  }

  // Determine the UI sample rate vs API. If uiSampleRate > 0 AND the UI path
  // is blocked (DIV-001), we record it in blockedByDivergence and fall back
  // to API-only for those slots.
  const uiSlots = Math.round(cfg.uiSampleRate * cfg.applications);
  const blockedByDivergence: string[] = [];

  if (uiSlots > 0) {
    // DIV-001: the candidate-guild-UI path (Pipeline C via guild-apply form)
    // and the IQR/commit-reveal Pipeline B path are both blocked for
    // full-stack volume testing at this time. The API path we use IS the
    // same underlying endpoint the UI form would call (POST /api/guilds/{id}/applications),
    // so technically there is no meaningful distinction between "api" and "ui"
    // for Pipeline C submissions. We record DIV-001 to document that the
    // full browser-driven UI flow (rubric wizard + expert review UI) is not
    // exercised at volume.
    blockedByDivergence.push("DIV-001");
    console.log(
      `[harness] uiSampleRate=${cfg.uiSampleRate} (${uiSlots} UI slots requested). ` +
        `DIV-001: full browser-driven UI volume is not currently exercised — ` +
        `all slots run through the API path. ` +
        `This is recorded in the run report.`,
    );
  }

  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const results: ApplicationResult[] = [];
  let completed = 0;
  let uiExercised = 0;

  for (let i = 0; i < cfg.applications; i++) {
    const guild = guildsToUse[i % guildsToUse.length];
    const guildExperts = expertsForGuild(manifest, guild.id);
    if (guildExperts.length < cfg.panelSize) {
      console.warn(
        `[harness] Guild ${guild.name} has only ${guildExperts.length} experts, ` +
          `need ${cfg.panelSize}. Skipping application ${i + 1}.`,
      );
      continue;
    }

    // Determine whether this slot should use UI or API.
    // With DIV-001, all slots fall back to API.
    const isUISlot = uiSlots > 0 && i < uiSlots && !blockedByDivergence.includes("DIV-001");
    const via: "api" | "ui" = isUISlot ? "ui" : "api";

    if (i % 5 === 0 || i === cfg.applications - 1) {
      console.log(`[harness] Application ${i + 1}/${cfg.applications} — guild="${guild.name}" via=${via}`);
    }

    const result = await runOneApplication(
      i,
      guild.id,
      guildExperts,
      cfg.panelSize,
      cfg.distribution,
      cfg.seed,
      via,
    );

    if (!result.skipped) {
      results.push(result.applicationResult);
      completed++;
      if (via === "ui") uiExercised++;
    } else {
      console.warn(`[harness]   ↳ skipped (app ${i + 1}): ${result.skipReason ?? "unknown"}`);
      if (result.applicationResult.blockedBy?.includes("DIV-001")) {
        if (!blockedByDivergence.includes("DIV-001")) {
          blockedByDivergence.push("DIV-001");
        }
      }
      // Still record skipped entries (with blockedBy) for visibility
      results.push({ ...result.applicationResult, consensusMatch: false });
    }
  }

  const durationMs = Date.now() - t0;

  const run: ExperimentRun = {
    startedAt,
    finishedAt: new Date().toISOString(),
    mode: cfg.mode,
    requested: cfg.applications,
    completed,
    uiSampleRate: cfg.uiSampleRate,
    uiExercised,
    blockedByDivergence,
    results,
    durationMs,
    meta: {
      distribution: cfg.distribution,
      panelSize: cfg.panelSize,
      guildsUsed: guildsToUse.map((g) => g.name),
      seed: cfg.seed,
      backendUrl: BACKEND_URL,
    },
  };

  // Produce and write the report.
  const reportsDir = path.resolve(__dirname, "reports");
  const { jsonPath, mdPath } = writeReport(run, reportsDir);
  const { summary } = buildReport(run);

  // -------------------------------------------------------------------------
  // Print summary
  // -------------------------------------------------------------------------
  console.log("\n[harness] ─────────────────────────────────────────────────");
  console.log("[harness] Run complete");
  console.log(`[harness]   Requested:             ${summary.requested}`);
  console.log(`[harness]   Completed:             ${summary.completed}`);
  console.log(`[harness]   Skipped:               ${summary.skipped}`);
  console.log(`[harness]   Consensus mismatches:  ${summary.consensusMismatches}`);
  console.log(`[harness]   UI exercised:          ${summary.uiExercised} / ${summary.requested}`);
  console.log(`[harness]   Duration:              ${summary.wallClockSec}s`);
  console.log(`[harness]   ms/application:        ${summary.msPerApplication}`);
  if (summary.blockedByDivergence.length > 0) {
    console.log(`[harness]   Blocked by:            ${summary.blockedByDivergence.join(", ")}`);
  }
  console.log(`[harness]   Report JSON:           ${jsonPath}`);
  console.log(`[harness]   Report MD:             ${mdPath}`);

  if (summary.consensusMismatches > 0) {
    console.log("\n[harness] ⚠ CONSENSUS MISMATCHES DETECTED:");
    for (const m of summary.mismatches) {
      console.log(`  app=${m.applicationId} scores=[${m.scores}] platform=${m.platformConsensus} oracle=${m.oracleConsensus}`);
    }
  } else if (completed > 0) {
    console.log(`[harness] ✓ All ${completed} finalized applications matched the oracle.`);
  } else {
    console.log(
      "[harness] ✗ No applications were finalized. Check blockedByDivergence above.",
    );
  }

  // Extrapolation for README calibration.
  if (completed > 0) {
    const ms100 = (durationMs / completed) * 100;
    console.log(
      `\n[harness] Extrapolated 100-application run: ~${Math.round(ms100 / 1000)}s (~${(ms100 / 60000).toFixed(1)}min)`,
    );
  }

  console.log("[harness] ─────────────────────────────────────────────────\n");

  // Exit 1 on consensus mismatches to propagate as CI failure.
  if (summary.consensusMismatches > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[harness] Fatal:", err);
  process.exit(1);
});
