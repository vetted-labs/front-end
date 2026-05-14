// e2e/real-flow/helpers/backend.ts
import type { APIRequestContext } from "@playwright/test";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";
export const CRON_SECRET =
  process.env.CRON_SECRET ?? "dev-cron-secret-pad-to-32-chars-minimum-length";

async function postJson<T>(
  request: APIRequestContext,
  path: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await request.post(`${BACKEND_URL}${path}`, {
    data: body ?? {},
    headers: { "Content-Type": "application/json", ...headers },
  });
  if (!res.ok()) {
    throw new Error(`POST ${path} failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).data as T;
}

export const testApi = {
  reset: (req: APIRequestContext) =>
    postJson<{ truncated: number }>(req, "/api/test/reset"),
  drain: (req: APIRequestContext) => postJson<void>(req, "/api/test/drain"),
  seedGuild: (
    req: APIRequestContext,
    body: { name: string; slug: string; onChainGuildId: number },
  ) =>
    postJson<{ id: string; slug: string; on_chain_guild_id: `0x${string}` }>(
      req,
      "/api/test/seed/guild",
      body,
    ),
  seedCompany: (
    req: APIRequestContext,
    body: { name: string; email?: string; walletAddress?: string },
  ) =>
    postJson<{
      id: string;
      name: string;
      email: string;
      wallet_address: string | null;
      token: string;
    }>(req, "/api/test/seed/company", body),
  seedJob: (
    req: APIRequestContext,
    body: { companyId: string; title: string; guild: string; status?: string },
  ) => postJson<{ jobId: string }>(req, "/api/test/seed/job", body),
  seedExpert: (
    req: APIRequestContext,
    body: {
      walletAddress: string;
      fullName: string;
      email: string;
      status?: string;
      guildId?: string;
      stakeAmount?: string;
    },
  ) => postJson<{ id: string }>(req, "/api/test/seed/expert", body),
  seedExpertToken: (req: APIRequestContext, body: { expertId: string }) =>
    postJson<{ id: string; wallet_address: string; token: string }>(
      req,
      "/api/test/seed/expert-token",
      body,
    ),
  endorsement: {
    processRetention: (req: APIRequestContext) =>
      postJson<unknown>(req, "/api/test/endorsement/process-retention"),
    markRetentionReady: (
      req: APIRequestContext,
      body: { applicationId: string },
    ) =>
      postJson<{
        id: string;
        application_id: string;
        retention_deadline: string;
      }>(req, "/api/test/endorsement/retention-ready", body),
    expireDisputes: (req: APIRequestContext) =>
      postJson<unknown>(req, "/api/test/endorsement/expire-disputes"),
    drainBlockchainOps: (req: APIRequestContext) =>
      postJson<unknown>(req, "/api/test/endorsement/drain-blockchain-ops"),
    rewardDistributorAdmin: async (req: APIRequestContext) => {
      const res = await req.get(
        `${BACKEND_URL}/api/test/endorsement/reward-distributor-admin`,
      );
      if (!res.ok()) {
        throw new Error(
          `GET /api/test/endorsement/reward-distributor-admin failed: ${res.status()} ${await res.text()}`,
        );
      }
      const body = (await res.json()) as {
        data: {
          backendWallet: `0x${string}`;
          owner: `0x${string}`;
          pendingOwner: `0x${string}`;
        };
      };
      return body.data;
    },
    acceptRewardDistributorOwnership: (req: APIRequestContext) =>
      postJson<{ owner: `0x${string}`; txHash: `0x${string}` | null }>(
        req,
        "/api/test/endorsement/reward-distributor-admin/accept-ownership",
      ),
    slashingRecords: async (
      req: APIRequestContext,
      params: { applicationId?: string; expertId?: string },
    ) => {
      const q = new URLSearchParams();
      if (params.applicationId) q.set("applicationId", params.applicationId);
      if (params.expertId) q.set("expertId", params.expertId);
      const res = await req.get(
        `${BACKEND_URL}/api/test/endorsement/slashing-records?${q.toString()}`,
      );
      if (!res.ok()) {
        throw new Error(
          `GET /api/test/endorsement/slashing-records failed: ${res.status()} ${await res.text()}`,
        );
      }
      const body = (await res.json()) as {
        data: Array<{
          id: string;
          expert_id: string;
          wallet_address: string;
          slash_amount: string;
          slash_percentage: number;
          reason: string;
          related_id: string;
          related_type: string;
        }>;
      };
      return body.data;
    },
  },
  candidateReviews: {
    expireAndFinalize: (req: APIRequestContext, applicationId: string) =>
      postJson<{
        finalization: { processed: number; succeeded: number; failed: number };
        application: { id: string; status: string; review_count: number };
        assignments: Array<{
          reviewer_id: string;
          has_reviewed: boolean;
          forfeited: boolean;
          wallet_address: string;
          reputation_score: number;
        }>;
        reputationLog: Array<{
          expert_id: string;
          event_type: string;
          amount: number;
          reason: string;
        }>;
      }>(
        req,
        `/api/test/candidate-reviews/${applicationId}/expire-and-finalize`,
      ),
  },
};

export const cronApi = {
  processExpertTransitions: (req: APIRequestContext) =>
    postJson<unknown>(
      req,
      "/api/experts/guild-applications/commit-reveal/process-transitions",
      undefined,
      {
        "x-cron-secret": CRON_SECRET,
      },
    ),
  processProposalTransitions: (req: APIRequestContext) =>
    postJson<unknown>(
      req,
      "/api/proposals/commit-reveal/process-transitions",
      undefined,
      {
        "x-cron-secret": CRON_SECRET,
      },
    ),
  /**
   * Trigger commit-reveal enablement on a freshly created proposal. The BE
   * writes `blockchain_session_id` and queues a `create_vetting_session` op
   * in the pending_blockchain_ops outbox. Pair with `drainBlockchainOps`.
   */
  enableCommitReveal: (req: APIRequestContext, proposalId: string) =>
    postJson<unknown>(
      req,
      `/api/proposals/${proposalId}/commit-reveal/enable`,
      undefined,
      {
        "x-cron-secret": CRON_SECRET,
      },
    ),
  /**
   * Run a single blockchain-ops cron tick to drain pending on-chain ops
   * (create_vetting_session, distributeSingleReward, etc.). Reuses the
   * endorsement test endpoint since it drives the same singleton cron.
   */
  drainBlockchainOps: (req: APIRequestContext) =>
    postJson<unknown>(req, "/api/test/endorsement/drain-blockchain-ops"),
};
