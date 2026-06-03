import { Page, Route } from "@playwright/test";

/**
 * Default quest state (VET-115 MILESTONE-ONLY model). Specific quests are the primary
 * list (no per-quest VETD); the 3 Bonus quests carry fixed rewards 10/10/30.
 */
export const MOCK_QUESTS_RESPONSE = {
  specific: [
    {
      id: "q-review",
      slug: "specific-review-candidate",
      title: "Review a candidate application",
      description: "Score a candidate against the guild rubric.",
      category: "specific",
      questType: "verifiable",
      actionType: "candidate_review",
      actionMeta: null,
      guildId: null,
      rewardAmount: 0,
      reputationReward: 5,
      requiresVerification: true,
      repeatable: true,
      sortOrder: 10,
      myStatus: null,
      myCompletionId: null,
    },
    {
      id: "q-answer",
      slug: "specific-answer-question",
      title: "Answer an expertise question",
      description: "Write a high-quality answer in your field.",
      category: "specific",
      questType: "text_answer",
      actionType: "expertise_answer",
      actionMeta: null,
      guildId: null,
      rewardAmount: 0,
      reputationReward: 3,
      requiresVerification: true,
      repeatable: true,
      sortOrder: 20,
      myStatus: "approved",
      myCompletionId: "c-answer",
    },
  ],
  bonus: [
    {
      id: "q-follow-x",
      slug: "general-follow-x",
      title: "Follow Vetted Protocol on X",
      description: "Follow @VettedProtocol on Twitter/X.",
      category: "bonus",
      questType: "one_time",
      actionType: "social_follow",
      actionMeta: { platform: "x" },
      guildId: null,
      rewardAmount: 10,
      reputationReward: 1,
      requiresVerification: false,
      repeatable: false,
      sortOrder: 100,
      myStatus: null,
      myCompletionId: null,
    },
    {
      id: "q-follow-li",
      slug: "general-follow-linkedin",
      title: "Follow Vetted on LinkedIn",
      description: "Follow Vetted on LinkedIn.",
      category: "bonus",
      questType: "one_time",
      actionType: "social_follow",
      actionMeta: { platform: "linkedin" },
      guildId: null,
      rewardAmount: 10,
      reputationReward: 1,
      requiresVerification: false,
      repeatable: false,
      sortOrder: 110,
      myStatus: null,
      myCompletionId: null,
    },
    {
      id: "q-bug",
      slug: "general-report-bug",
      title: "Report a bug",
      description: "Found a bug? Briefly explain how it occurred and attach a screenshot.",
      category: "bonus",
      questType: "verifiable",
      actionType: "bug_report",
      actionMeta: null,
      guildId: null,
      rewardAmount: 30,
      reputationReward: 5,
      requiresVerification: true,
      repeatable: true,
      sortOrder: 120,
      myStatus: null,
      myCompletionId: null,
    },
  ],
  guilds: [] as Array<{ id: string; name: string; role: string }>,
  streak: {
    completedQuestsCount: 3,
    approvedSharedAnswersCount: 1,
    streak1Required: 10,
    streak2Required: 5,
    streak1Eligible: false,
    streak2Eligible: false,
    streak1Vetd: 500,
    streak2Vetd: 300,
    totalAllocation: 0,
  },
  summary: { completedBonus: 0, totalBonus: 3 },
  isReviewer: false,
};

export const MOCK_REFERRAL = { code: "abc123def456", status: "pending", referrals: [] as unknown[] };

/** Approved expert-feed posts returned by GET /api/quests/feed-posts (VET-115 part 2). */
export const MOCK_FEED_POSTS = [
  {
    id: "fp-1",
    questId: "q-answer",
    expertiseField: "Engineering",
    answerText: "Use a circuit breaker to fail fast when a downstream dependency is unhealthy.",
    upvoteCount: 7,
    hasUpvoted: false,
    author: { id: "e-1", name: "Ada Lovelace" },
    createdAt: "2026-05-30T10:00:00.000Z",
    approvalStatus: "approved",
  },
  {
    id: "fp-2",
    questId: "q-answer-2",
    expertiseField: "Product",
    answerText: "Anchor the roadmap on the activation metric, not vanity sign-ups.",
    upvoteCount: 3,
    hasUpvoted: true,
    author: { id: "e-2", name: "Grace Hopper" },
    createdAt: "2026-05-31T12:00:00.000Z",
    approvalStatus: "approved",
  },
] as const;

export interface QuestMockCalls {
  complete: number;
  submit: number;
  review: number;
  share: number;
  upvote: number;
  feedReview: number;
}

function fulfill(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data }),
  });
}

interface QuestMockOpts {
  fixture?: typeof MOCK_QUESTS_RESPONSE;
  pending?: unknown[];
  referral?: typeof MOCK_REFERRAL;
  /** Approved feed posts for GET /api/quests/feed-posts. */
  feedPosts?: ReadonlyArray<(typeof MOCK_FEED_POSTS)[number]>;
  /** Pending feed posts for the team review queue (GET /feed-posts/pending). */
  pendingFeedPosts?: unknown[];
  /** When true, POST /api/quests/:id/share-to-feed responds 409 (already shared). */
  shareConflict?: boolean;
}

/**
 * Mocks the entire /api/quests surface through one route handler and returns a
 * mutable `calls` counter so specs can assert which endpoints were hit.
 */
export async function setupQuestMocks(page: Page, opts: QuestMockOpts = {}): Promise<QuestMockCalls> {
  const fixture = opts.fixture ?? MOCK_QUESTS_RESPONSE;
  const feedPosts = opts.feedPosts ?? MOCK_FEED_POSTS;
  const calls: QuestMockCalls = {
    complete: 0,
    submit: 0,
    review: 0,
    share: 0,
    upvote: 0,
    feedReview: 0,
  };

  await page.route("**/api/quests**", (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();

    // VET-115: daily streak claim (POST /streak/claim) is REMOVED. GET /streak now
    // returns the two-milestone StreakProgress.
    if (pathname.endsWith("/streak") && method === "GET") {
      return fulfill(route, fixture.streak);
    }
    if (pathname.endsWith("/submissions/pending")) {
      return fulfill(route, opts.pending ?? []);
    }
    if (/\/submissions\/[^/]+\/review$/.test(pathname) && method === "POST") {
      calls.review++;
      return fulfill(route, { id: "c-review", status: "approved" });
    }
    // ── Expert feed (VET-115 part 2) ──────────────────────────────────────
    // Team review queue: GET /feed-posts/pending.
    if (pathname.endsWith("/feed-posts/pending") && method === "GET") {
      return fulfill(route, opts.pendingFeedPosts ?? []);
    }
    // Review a shared answer: POST /feed-posts/:id/review.
    if (/\/feed-posts\/[^/]+\/review$/.test(pathname) && method === "POST") {
      calls.feedReview++;
      return fulfill(route, { id: "fp-1", approvalStatus: "approved" });
    }
    // Toggle upvote: POST /feed-posts/:id/votes.
    if (/\/feed-posts\/[^/]+\/votes$/.test(pathname) && method === "POST") {
      calls.upvote++;
      return fulfill(route, { upvoteCount: 8, voted: true });
    }
    // Public approved feed: GET /feed-posts.
    if (pathname.endsWith("/feed-posts") && method === "GET") {
      return fulfill(route, feedPosts);
    }
    // Share an answer to the feed: POST /:questId/share-to-feed.
    if (/\/quests\/[^/]+\/share-to-feed$/.test(pathname) && method === "POST") {
      calls.share++;
      if (opts.shareConflict) {
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "Already shared" }),
        });
      }
      return fulfill(route, { id: "fp-new", approvalStatus: "pending" });
    }
    if (/\/quests\/[^/]+\/complete$/.test(pathname) && method === "POST") {
      calls.complete++;
      return fulfill(route, {
        id: "c-done",
        questId: "q-follow-x",
        status: "completed",
        rewarded: true,
        rewardAmount: 10,
      });
    }
    if (/\/quests\/[^/]+\/submit$/.test(pathname) && method === "POST") {
      calls.submit++;
      return fulfill(route, { id: "c-sub", status: "submitted" });
    }
    if (pathname.endsWith("/referrals")) {
      return fulfill(route, opts.referral ?? MOCK_REFERRAL);
    }
    // GET /api/quests (list) + any fallback
    return fulfill(route, fixture);
  });

  return calls;
}
