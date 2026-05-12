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
  reset: (req: APIRequestContext) => postJson<{ truncated: number }>(req, "/api/test/reset"),
  drain: (req: APIRequestContext) => postJson<void>(req, "/api/test/drain"),
  seedGuild: (req: APIRequestContext, body: { name: string; slug: string; onChainGuildId: number }) =>
    postJson<{ id: string; slug: string; on_chain_guild_id: number }>(req, "/api/test/seed/guild", body),
  seedExpert: (
    req: APIRequestContext,
    body: { walletAddress: string; fullName: string; email: string; status?: string; guildId?: string; stakeAmount?: string },
  ) => postJson<{ id: string }>(req, "/api/test/seed/expert", body),
  endorsement: {
    processRetention: (req: APIRequestContext) =>
      postJson<unknown>(req, "/api/test/endorsement/process-retention"),
    expireDisputes: (req: APIRequestContext) =>
      postJson<unknown>(req, "/api/test/endorsement/expire-disputes"),
    drainBlockchainOps: (req: APIRequestContext) =>
      postJson<unknown>(req, "/api/test/endorsement/drain-blockchain-ops"),
  },
};

export const cronApi = {
  processExpertTransitions: (req: APIRequestContext) =>
    postJson<unknown>(req, "/api/experts/guild-applications/commit-reveal/process-transitions", undefined, {
      "x-cron-secret": CRON_SECRET,
    }),
  processProposalTransitions: (req: APIRequestContext) =>
    postJson<unknown>(req, "/api/proposals/commit-reveal/process-transitions", undefined, {
      "x-cron-secret": CRON_SECRET,
    }),
  /**
   * Trigger commit-reveal enablement on a freshly created proposal. The BE
   * writes `blockchain_session_id` and queues a `create_vetting_session` op
   * in the pending_blockchain_ops outbox. Pair with `drainBlockchainOps`.
   */
  enableCommitReveal: (req: APIRequestContext, proposalId: string) =>
    postJson<unknown>(req, `/api/proposals/${proposalId}/commit-reveal/enable`, undefined, {
      "x-cron-secret": CRON_SECRET,
    }),
  /**
   * Run a single blockchain-ops cron tick to drain pending on-chain ops
   * (create_vetting_session, distributeSingleReward, etc.). Reuses the
   * endorsement test endpoint since it drives the same singleton cron.
   */
  drainBlockchainOps: (req: APIRequestContext) =>
    postJson<unknown>(req, "/api/test/endorsement/drain-blockchain-ops"),
};
