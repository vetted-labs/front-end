import { Page, Route } from "@playwright/test";

/** Default quest state for an approved expert with no guild memberships. */
export const MOCK_QUESTS_RESPONSE = {
  general: [
    {
      id: "q-follow",
      slug: "general-follow-x",
      title: "Follow Vetted Protocol on X",
      description: "Follow @VettedProtocol on Twitter/X.",
      category: "general",
      questType: "one_time",
      actionType: "social_follow",
      actionMeta: { platform: "x" },
      guildId: null,
      rewardAmount: 5,
      reputationReward: 1,
      requiresVerification: false,
      repeatable: false,
      sortOrder: 10,
      myStatus: null,
      myCompletionId: null,
    },
    {
      id: "q-bug",
      slug: "general-report-bug",
      title: "Report a bug",
      description: "Found a bug? Briefly explain how it occurred and attach a screenshot.",
      category: "general",
      questType: "verifiable",
      actionType: "bug_report",
      actionMeta: null,
      guildId: null,
      rewardAmount: 20,
      reputationReward: 5,
      requiresVerification: true,
      repeatable: true,
      sortOrder: 40,
      myStatus: null,
      myCompletionId: null,
    },
    {
      id: "q-post",
      slug: "general-post-x",
      title: "Post on X about Vetted",
      description: "Make a post on X mentioning Vetted.",
      category: "general",
      questType: "verifiable",
      actionType: "social_post",
      actionMeta: { platform: "x" },
      guildId: null,
      rewardAmount: 15,
      reputationReward: 3,
      requiresVerification: true,
      repeatable: false,
      sortOrder: 30,
      myStatus: "approved",
      myCompletionId: "c-post",
    },
    {
      id: "q-ref",
      slug: "general-refer-expert",
      title: "Refer an expert",
      description: "Refer an expert with great judgment.",
      category: "general",
      questType: "referral",
      actionType: "referral",
      actionMeta: null,
      guildId: null,
      rewardAmount: 15,
      reputationReward: 3,
      requiresVerification: true,
      repeatable: true,
      sortOrder: 60,
      myStatus: null,
      myCompletionId: null,
    },
  ],
  specific: [] as unknown[],
  guilds: [] as Array<{ id: string; name: string; role: string }>,
  streak: {
    currentDay: 0,
    claimedToday: false,
    canClaim: true,
    nextDay: 1,
    longestStreak: 0,
    schedule: [10, 10, 15, 10, 15, 20, 30],
  },
  summary: { completedGeneral: 1, totalGeneral: 4 },
  isReviewer: false,
};

export const MOCK_REFERRAL = { code: "abc123def456", status: "pending", referrals: [] as unknown[] };

export interface QuestMockCalls {
  claim: number;
  complete: number;
  submit: number;
  review: number;
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
}

/**
 * Mocks the entire /api/quests surface through one route handler and returns a
 * mutable `calls` counter so specs can assert which endpoints were hit.
 */
export async function setupQuestMocks(page: Page, opts: QuestMockOpts = {}): Promise<QuestMockCalls> {
  const fixture = opts.fixture ?? MOCK_QUESTS_RESPONSE;
  const calls: QuestMockCalls = { claim: 0, complete: 0, submit: 0, review: 0 };

  await page.route("**/api/quests**", (route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();

    if (pathname.endsWith("/streak/claim") && method === "POST") {
      calls.claim++;
      return fulfill(route, { day: 1, reward: 10, currentDay: 1, longestStreak: 1 });
    }
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
    if (/\/quests\/[^/]+\/complete$/.test(pathname) && method === "POST") {
      calls.complete++;
      return fulfill(route, {
        id: "c-done",
        questId: "q-follow",
        status: "completed",
        rewarded: true,
        rewardAmount: 5,
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
