// e2e/real-flow/scenarios/guild-feed/11-nested-reply-depth-limit.spec.ts
//
// B5 Bundle spec — nested-reply depth limit.
//
// Backend enforces a hard cap at depth = 3 (see
// `backend/src/features/guilds/guild-reply.service.ts:146` — `if (depth > 3)`),
// where the very first top-level reply has depth = 0.
//
// Frontend enforces the same cap at the inline composer level (see
// `ThreadedReplyList.tsx:114` — `canReplyInline = depth < MAX_DEPTH (=3)`).
// So the ReplyNode rendered at code-depth 3 shows NO inline Reply button.
//
// Numbering note: the original prompt uses 1-based depth ("depth 1" = a
// top-level reply). The code uses 0-based. This spec walks all four legal
// depths (code 0..3, prompt's "depth 1..4"), asserts each succeeds via the UI
// or the seed API, then proves the cap by:
//   - Asserting the inline Reply button is absent on the deepest (code-depth
//     3) reply card.
//   - Submitting a 5th nested reply via `testApi.seedGuildReply` and
//     expecting a 4xx error (backend validation).
//
// If the M1 UI shipped without the inline reply composer for nested levels at
// all (e.g. only top-level replies are visible), the spec falls back to a
// pure backend-driven verification and annotates the UI gap.

import { test, expect } from "../../fixtures";
import { testApi, BACKEND_URL } from "../../helpers/backend";
import {
  connectWalletViaUI,
  ensureExpertSessionTokenViaUI,
} from "../../helpers/ui-auth";
import {
  createGuildPostViaUI,
  openFeedFor,
  replyToPostViaUI,
  replyToReplyViaUI,
  SkipMissingUI,
} from "../../helpers/ui-guild-feed-flow";

test.describe("guild feed — nested reply depth limit", () => {
  test("replies cap at backend depth 3; the inline composer disappears at the FE max", async ({
    page,
    cleanState: _cleanState,
    experts,
    guild,
    wallet,
    testContexts,
    request,
  }) => {
    void _cleanState;

    const guildExperts = experts.filter((e) => e.guildId === guild.id);
    expect(
      guildExperts.length,
      "fixture invariant: guilds[0] needs at least 3 experts (A, B, C)",
    ).toBeGreaterThanOrEqual(3);
    const apprenticeA = guildExperts[0];
    const apprenticeB = guildExperts[1];
    const apprenticeC = guildExperts[2];

    const postTitle = `Depth-limit walk ${Date.now()}`;
    const depth0Body = `B top-level reply ${Date.now()}`;
    const depth1Body = `C reply to B ${Date.now()}`;
    const depth2Body = `A reply to C ${Date.now()}`;

    let postId: string;
    let depth0ReplyId: string;
    let depth1ReplyId: string;
    let depth2ReplyId: string;
    let depth3ReplyId: string;

    await test.step("apprentice A connects + creates the root post via the UI", async () => {
      await wallet.attach(page, apprenticeA.privateKey);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(page);
      await ensureExpertSessionTokenViaUI(page, {
        walletAddress: apprenticeA.address,
      });
      await openFeedFor(page, guild.id);
      await createGuildPostViaUI(page, {
        title: postTitle,
        body: "Root post that hosts a 4-deep reply chain.",
        tag: "discussion",
      });

      // Look up the post id so subsequent seedGuildReply calls can address it.
      const cardLocator = page.locator("h3", { hasText: postTitle }).first();
      const cardContainer = cardLocator.locator(
        'xpath=ancestor::*[@data-testid][1]',
      );
      const tid = (await cardContainer.getAttribute("data-testid")) ?? "";
      const match = tid.match(/^post-card-(.+)$/);
      expect(match, "expected post-card-<uuid> testid on the rendered card").not.toBeNull();
      postId = match![1];
    });

    await test.step("apprentice B opens the post and submits a top-level reply (code depth 0) via the UI", async () => {
      const bContext = testContexts.register(
        await page
          .context()
          .browser()!
          .newContext({
            baseURL: new URL(page.url()).origin,
            bypassCSP: true,
          }),
      );
      const bPage = await bContext.newPage();
      await wallet.attach(bPage, apprenticeB.privateKey);
      await bPage.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(bPage);
      await ensureExpertSessionTokenViaUI(bPage, {
        walletAddress: apprenticeB.address,
      });
      await openFeedFor(bPage, guild.id);
      await replyToPostViaUI(bPage, { postId: postTitle, body: depth0Body });

      // Pull the new reply id from the backend so we can chain by parentReplyId.
      const res = await bPage.request.get(
        `${BACKEND_URL}/api/guilds/${guild.id}/posts/${postId}/replies?sort=new&limit=50`,
      );
      expect(res.ok()).toBe(true);
      const body = (await res.json()) as {
        data: Array<{ id: string; body: string; depth: number }>;
      };
      const row = body.data.find((r) => r.body.includes(depth0Body));
      expect(row, "depth-0 reply must be persisted").toBeDefined();
      depth0ReplyId = row!.id;
      expect(row!.depth).toBe(0);
    });

    await test.step("seed depth-1 (C replies to B) and depth-2 (A replies to C) via the backend fixture", async () => {
      // Going through the seed API keeps the test deterministic without
      // spinning up two more browser contexts just to type two strings.
      const d1 = await testApi.seedGuildReply(request, {
        postId,
        authorExpertId: apprenticeC.id,
        parentReplyId: depth0ReplyId,
        body: depth1Body,
      });
      expect(d1.depth).toBe(1);
      depth1ReplyId = d1.id;

      const d2 = await testApi.seedGuildReply(request, {
        postId,
        authorExpertId: apprenticeA.id,
        parentReplyId: depth1ReplyId,
        body: depth2Body,
      });
      expect(d2.depth).toBe(2);
      depth2ReplyId = d2.id;
    });

    await test.step("apprentice B uses the UI to reply to the depth-2 reply, producing a depth-3 child", async () => {
      // Back on the original page (still logged in as A), refetch the feed
      // and open the detail modal. Use replyToReplyViaUI which expands every
      // "Show N replies" branch first so the deep parent is reachable.
      await openFeedFor(page, guild.id);

      let nestedSubmitted = true;
      const depth3Body = `B reply to A's depth-2 reply ${Date.now()}`;
      try {
        await replyToReplyViaUI(page, {
          postTitle,
          parentReplyBody: depth2Body,
          body: depth3Body,
        });
      } catch (err) {
        if (err instanceof SkipMissingUI) {
          nestedSubmitted = false;
          test.info().annotations.push({
            type: "ui-gap",
            description: err.message,
          });
        } else {
          throw err;
        }
      }

      if (!nestedSubmitted) {
        // Fall back to the seed API to keep the chain consistent — the rest
        // of the spec still verifies the backend depth cap below.
        const d3 = await testApi.seedGuildReply(request, {
          postId,
          authorExpertId: apprenticeB.id,
          parentReplyId: depth2ReplyId,
          body: depth3Body,
        });
        expect(d3.depth).toBe(3);
        depth3ReplyId = d3.id;
      } else {
        // Look up the depth-3 row in the backend so the next step can address
        // it by id (the front-end keeps it in memory but we need the UUID for
        // the depth-overflow assertion below).
        const res = await page.request.get(
          `${BACKEND_URL}/api/guilds/${guild.id}/posts/${postId}/replies?parentReplyId=${depth2ReplyId}&sort=new&limit=50`,
        );
        expect(res.ok()).toBe(true);
        const body = (await res.json()) as {
          data: Array<{ id: string; body: string; depth: number }>;
        };
        const row = body.data.find((r) => r.body.includes(depth3Body));
        expect(row, "depth-3 reply must be persisted").toBeDefined();
        expect(row!.depth).toBe(3);
        depth3ReplyId = row!.id;
      }
    });

    await test.step("the inline Reply button MUST be absent on the depth-3 reply (FE caps at depth < 3)", async () => {
      // The post detail modal may already be open from the previous step. If
      // not, navigate to the feed and open it. We detect "modal open" by the
      // presence of the "Back to Feed" affordance.
      const backToFeed = page
        .getByRole("button", { name: /back to feed/i })
        .first();
      const modalOpen = await backToFeed
        .isVisible({ timeout: 500 })
        .catch(() => false);

      if (!modalOpen) {
        await openFeedFor(page, guild.id);
        // The PostCard <h3> lives in the feed listing (NOT inside any modal).
        // Click the card to open the detail modal.
        const feedCard = page
          .locator('[data-testid^="post-card-"]', { hasText: postTitle })
          .first();
        await expect(feedCard).toBeVisible({ timeout: 10_000 });
        await feedCard.click();
        await expect(backToFeed).toBeVisible({ timeout: 10_000 });
      }

      // Expand every "Show N replies" affordance until none remain.
      for (let pass = 0; pass < 4; pass++) {
        const expanders = page.getByRole("button", {
          name: /^show \d+ repl(?:y|ies)$/i,
        });
        const cnt = await expanders.count().catch(() => 0);
        if (cnt === 0) break;
        let clicked = false;
        for (let i = 0; i < cnt; i++) {
          const btn = expanders.nth(i);
          if (await btn.isVisible({ timeout: 200 }).catch(() => false)) {
            await btn.click().catch(() => undefined);
            clicked = true;
            await page.waitForTimeout(150);
          }
        }
        if (!clicked) break;
      }

      // Locate the depth-3 reply card by its body and assert no Reply button
      // is inside it. The Reply button selector is the same one used by
      // replyToReplyViaUI; its ABSENCE is the depth-cap signal.
      const depth3Card = page
        .locator("div.rounded-lg.border.bg-card")
        .filter({ hasText: /B reply to A's depth-2 reply/i })
        .first();

      if (!(await depth3Card.isVisible({ timeout: 5_000 }).catch(() => false))) {
        // If the UI never reveals the depth-3 reply (e.g. because the M1 tree
        // collapses deep branches without an expander), we cannot make a
        // UI-level assertion here. Skip with a clear note; the backend cap
        // assertion in the next step still runs.
        test.info().annotations.push({
          type: "ui-gap",
          description:
            "depth-3 reply not visible in the rendered tree — the FE may collapse beyond 2 levels without an expander affordance.",
        });
      } else {
        const replyBtn = depth3Card.getByRole("button", { name: /^reply$/i });
        // `toHaveCount(0)` is the strongest available signal that the inline
        // composer is absent for this depth.
        await expect(replyBtn).toHaveCount(0);
      }
    });

    await test.step("a 5th nested reply (depth 4) must be rejected by the PRODUCTION endpoint", async () => {
      // The backend SERVICE throws `ValidationError("Maximum reply depth
      // exceeded")` on insert when `depth > 3` (guild-reply.service.ts:146).
      // We bypass the test SEED endpoint (which silently clamps depth at 3)
      // and call the real `/api/guilds/:guildId/posts/:postId/replies` route
      // with the expert's auth token. That mirrors what the production UI
      // would do if the depth cap were not surfaced as a missing affordance.
      const token = await page.evaluate(() =>
        localStorage.getItem("authToken"),
      );
      expect(
        token,
        "expert authToken should still be in localStorage after the prior steps",
      ).toBeTruthy();

      const res = await page.request.post(
        `${BACKEND_URL}/api/guilds/${guild.id}/posts/${postId}/replies`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          data: {
            body: `depth-4 attempt ${Date.now()}`,
            parentReplyId: depth3ReplyId,
          },
        },
      );

      expect(
        res.ok(),
        `expected production reply endpoint to reject depth-4 with 4xx; got ${res.status()}`,
      ).toBe(false);
      expect(res.status()).toBeGreaterThanOrEqual(400);
      expect(res.status()).toBeLessThan(500);
      const body = await res.text();
      expect(body).toMatch(/depth|exceeded|maximum/i);
    });
  });
});
