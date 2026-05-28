// e2e/real-flow/helpers/backend.ts
import type { APIRequestContext } from "@playwright/test";

// ── Local seed-response shapes ────────────────────────────────────────────────
// Used for helpers below that do not map to an existing @/types shape.

export interface SeededGovernanceProposal {
  id: string;
  title: string;
  description: string;
  proposer_expert_id: string;
  status: string;
}

export interface SeededMessageThread {
  id: string;
  candidate_email: string;
  recruiter_name: string;
}

export interface SeededApplicant {
  id: string;
  candidate_id: string;
  job_id: string;
  status: string;
}

export interface SeededApprovedCandidate {
  job: { id: string; title: string; company_id: string };
  application: { id: string; candidate_id: string; status: string };
}

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
  /** Restore the expert pool to exactly `keepWallets` (the bootstrap manifest).
   *  experts/guild_memberships are KEPT across reset, so scenario-seeded experts
   *  accumulate and bloat the random reviewer-selection pool — call this after
   *  reset() so panel assignment deterministically draws from the manifest. */
  pruneExperts: (
    req: APIRequestContext,
    keep: Array<{
      wallet: string;
      guildId: string;
      reputationScore?: number;
      reputationInGuild?: number;
    }>,
  ) =>
    postJson<{ pruned: number; membershipsPruned: number }>(
      req,
      "/api/test/seed/prune-experts",
      { keep },
    ),
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
      role?: "recruit" | "apprentice" | "craftsman" | "officer" | "master";
    },
  ) => postJson<{ id: string }>(req, "/api/test/seed/expert", body),
  seedExpertToken: (req: APIRequestContext, body: { expertId: string }) =>
    postJson<{ id: string; wallet_address: string; token: string }>(
      req,
      "/api/test/seed/expert-token",
      body,
    ),
  /** Promote an already-seeded expert's guild_memberships.role without
   *  mutating on-chain state. Uses seedExpert with ON CONFLICT to update only
   *  the guild membership row. `fullName` defaults to the local part of the
   *  expert's email so callers don't need to supply an extra value.
   */
  promoteExpertRole: (
    req: APIRequestContext,
    body: {
      walletAddress: string;
      email: string;
      guildId: string;
      role: "officer" | "master";
      fullName?: string;
    },
  ) =>
    postJson<{ id: string }>(req, "/api/test/seed/expert", {
      walletAddress: body.walletAddress,
      email: body.email,
      fullName: body.fullName ?? body.email.split("@")[0],
      guildId: body.guildId,
      role: body.role,
    }),
  endorsement: {
    processRetention: (req: APIRequestContext) =>
      postJson<unknown>(req, "/api/test/endorsement/process-retention"),
    /** Directly assign a list of experts as arbitration panel members for a
     *  dispute, bypassing the role-based random selection that the production
     *  path uses. Needed in E2E because all bootstrapped experts have
     *  role='craftsman' and the production query requires 'officer'/'master'.
     */
    assignPanel: (
      req: APIRequestContext,
      body: { disputeId: string; expertIds: string[] },
    ) =>
      postJson<{ panelSize: number }>(
        req,
        "/api/test/endorsement/assign-panel",
        body,
      ),
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
  // ── Seed fixtures (BE endpoints under /api/test/seed/*) ───────────────────

  /** Seed a governance proposal authored by the given expert. */
  seedGovernanceProposal: (
    req: APIRequestContext,
    opts: {
      proposerExpertId: string;
      title: string;
      description?: string;
      /**
       * Voting window offset in seconds from now. Negative → already-closed
       * proposal (needed to exercise outcome/finalize). Defaults to +7 days.
       */
      votingEndsInSeconds?: number;
    },
  ): Promise<SeededGovernanceProposal> =>
    postJson<SeededGovernanceProposal>(
      req,
      "/api/test/seed/governance-proposal",
      opts,
    ),

  /** Cast a governance vote on behalf of an expert. */
  castGovernanceVote: (
    req: APIRequestContext,
    opts: {
      proposalId: string;
      expertId: string;
      choice: "for" | "against" | "abstain";
    },
  ): Promise<void> =>
    postJson<void>(req, "/api/test/seed/governance-vote", opts),

  /**
   * Finalize a governance proposal whose voting window has closed, so its
   * outcome (passed/rejected) is computed and surfaced. The production finalize
   * endpoint authenticates the caller via the X-Wallet-Address header, so pass
   * an expert's wallet address.
   */
  finalizeGovernanceProposal: (
    req: APIRequestContext,
    proposalId: string,
    wallet: string,
  ): Promise<void> =>
    postJson<void>(
      req,
      `/api/governance/proposals/${proposalId}/finalize`,
      { wallet },
      { "X-Wallet-Address": wallet },
    ),

  /** Seed a message thread between a candidate and a recruiter. */
  seedMessageThread: (
    req: APIRequestContext,
    opts: {
      candidateEmail: string;
      recruiterName: string;
      initialBody: string;
    },
  ): Promise<SeededMessageThread> =>
    postJson<SeededMessageThread>(req, "/api/test/seed/message-thread", opts),

  /** Seed in-app notifications for a candidate. */
  seedNotifications: (
    req: APIRequestContext,
    opts: {
      candidateEmail: string;
      items: Array<{ type: string; body: string }>;
    },
  ): Promise<void> =>
    postJson<void>(req, "/api/test/seed/notifications", opts),

  /** Seed in-app notifications for an expert. */
  seedExpertNotifications: (
    req: APIRequestContext,
    opts: {
      expertId: string;
      items: Array<{ type: string; body: string }>;
    },
  ): Promise<void> =>
    postJson<void>(req, "/api/test/seed/expert-notifications", opts),

  /** Seed N applicant records for a given job. */
  seedApplicantsForJob: (
    req: APIRequestContext,
    opts: { jobId: string; count: number },
  ): Promise<{ items: SeededApplicant[] }> =>
    postJson<{ items: SeededApplicant[] }>(
      req,
      "/api/test/seed/applicants-for-job",
      opts,
    ),

  /** Seed a fully-approved candidate (job + application) owned by a company. */
  seedApprovedCandidate: (
    req: APIRequestContext,
    opts: { ownerCompanyId: string },
  ): Promise<SeededApprovedCandidate> =>
    postJson<SeededApprovedCandidate>(
      req,
      "/api/test/seed/approved-candidate",
      opts,
    ),

  // ── Guild feed seed fixtures (M1.4) ───────────────────────────────────────
  //
  // These mirror the seed endpoints in backend/src/routes/test/seed-fixtures.ts.
  // Exactly one of `author*ExpertId` / `author*CandidateId` (and the voter/user
  // variants below) must be set; the backend's Zod schema enforces this via a
  // `.refine` and will 400 otherwise.

  /** Seed a guild feed post authored by an expert OR a candidate. */
  seedGuildPost: (
    req: APIRequestContext,
    opts: {
      guildId: string;
      authorExpertId?: string;
      authorCandidateId?: string;
      title: string;
      body: string;
      tag?: "discussion" | "question" | "insight" | "job_related";
      isPrivate?: boolean;
      isPinned?: boolean;
    },
  ): Promise<{ id: string; guildId: string; createdAt: string }> =>
    postJson<{ id: string; guildId: string; createdAt: string }>(
      req,
      "/api/test/seed/guild-post",
      opts,
    ),

  /** Seed a guild feed reply. Pass `parentReplyId` for nested replies. */
  seedGuildReply: (
    req: APIRequestContext,
    opts: {
      postId: string;
      authorExpertId?: string;
      authorCandidateId?: string;
      parentReplyId?: string;
      body: string;
    },
  ): Promise<{ id: string; postId: string; depth: number }> =>
    postJson<{ id: string; postId: string; depth: number }>(
      req,
      "/api/test/seed/guild-reply",
      opts,
    ),

  /** Seed an upvote on a post or reply. */
  seedGuildVote: (
    req: APIRequestContext,
    opts: {
      targetId: string;
      targetType: "post" | "reply";
      voterExpertId?: string;
      voterCandidateId?: string;
    },
  ): Promise<{ id: string }> =>
    postJson<{ id: string }>(req, "/api/test/seed/guild-vote", opts),

  /** Seed a bookmark on a post. */
  seedGuildBookmark: (
    req: APIRequestContext,
    opts: {
      postId: string;
      userExpertId?: string;
      userCandidateId?: string;
    },
  ): Promise<{ id: string }> =>
    postJson<{ id: string }>(req, "/api/test/seed/guild-bookmark", opts),

  /**
   * List in-app notifications matching the (recipient_type, recipient_id, type)
   * tuple. Drives the assertions for M2.3 storm dedup and award/reply fan-out.
   */
  listNotifications: async (
    req: APIRequestContext,
    opts: {
      recipientType: "expert" | "candidate";
      recipientId: string;
      type?: string;
    },
  ): Promise<
    Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      link: string | null;
      related_id: string | null;
      is_read: boolean;
      created_at: string;
    }>
  > => {
    const q = new URLSearchParams();
    q.set("recipientType", opts.recipientType);
    q.set("recipientId", opts.recipientId);
    if (opts.type) q.set("type", opts.type);
    const res = await req.get(
      `${BACKEND_URL}/api/test/notifications?${q.toString()}`,
    );
    if (!res.ok()) {
      throw new Error(
        `GET /api/test/notifications failed: ${res.status()} ${await res.text()}`,
      );
    }
    const body = (await res.json()) as {
      data: Array<{
        id: string;
        type: string;
        title: string;
        message: string;
        link: string | null;
        related_id: string | null;
        is_read: boolean;
        created_at: string;
      }>;
    };
    return body.data;
  },

  /**
   * Convenience wrapper for `listNotifications`: returns `{ found, row? }` where
   * `row` is the first notification matching the (recipientType, recipientId,
   * type, relatedId) tuple. Spec assertions read `result.row` for fields like
   * `link`, `title`, `is_read`. The function never throws on "not found"; it
   * just returns `{ found: false }`.
   */
  assertNotificationFor: async (
    req: APIRequestContext,
    opts: {
      recipientType: "expert" | "candidate";
      recipientId: string;
      type: string;
      relatedId?: string;
    },
  ): Promise<{
    found: boolean;
    row?: {
      id: string;
      type: string;
      title: string;
      message: string;
      link: string | null;
      related_id: string | null;
      is_read: boolean;
      created_at: string;
    };
  }> => {
    const rows = await testApi.listNotifications(req, {
      recipientType: opts.recipientType,
      recipientId: opts.recipientId,
      type: opts.type,
    });
    const row = opts.relatedId
      ? rows.find((r) => r.related_id === opts.relatedId)
      : rows[0];
    return row ? { found: true, row } : { found: false };
  },

  /**
   * Revoke an expert's refresh tokens to simulate a stale session. The current
   * access JWT is unaffected (JWT expiry is forced via page.evaluate in the
   * spec); this just ensures `attemptTokenRefresh` returns 401 and the
   * re-handshake path fires. Returns the number of refresh-token rows revoked.
   */
  expireExpertSession: (
    req: APIRequestContext,
    opts: { expertId: string },
  ): Promise<{ revoked: number }> =>
    postJson<{ revoked: number }>(
      req,
      "/api/test/expire-expert-session",
      opts,
    ),

  // ── End seed fixtures ─────────────────────────────────────────────────────

  candidateReviews: {
    /**
     * Assign a deterministic Pipeline B expert panel to a candidate guild
     * application's linked candidate_proposals row. Mirrors the expert-side
     * /api/test/expert-reviews/:id/activate-and-assign fixture. Pass explicit
     * reviewerIds (from the `panelFor` fixture) for a fully deterministic panel.
     */
    assignPanel: (
      req: APIRequestContext,
      applicationId: string,
      reviewerIds: string[],
    ) =>
      postJson<{ proposalId: string; reviewerIds: string[] }>(
        req,
        `/api/test/candidate-reviews/${applicationId}/assign-panel`,
        { reviewerIds },
      ),
    /** Record a candidate review for one assigned reviewer via the real review
     *  service (drives consensus). Used to complete the panel deterministically
     *  after the first reviewer reviews through the full UI. */
    submitReview: (
      req: APIRequestContext,
      applicationId: string,
      body: { reviewerId: string; vote?: "approve" | "reject"; overallScore?: number },
    ) =>
      postJson<unknown>(
        req,
        `/api/test/candidate-reviews/${applicationId}/submit-review`,
        body,
      ),
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
