// e2e/real-flow/scenarios/guild-feed/09-craftsman-mark-duplicate.spec.ts
//
// Permission-gate spec — craftsman-rank experts can mark a duplicate post.
//
// Per the permission matrix (`src/lib/feedPrivileges.ts`):
//   - `craftsman` rank and above → `canMarkDuplicate: true`
//   - The backend (`backend/src/features/guilds/guild-post.service.ts:406-415`)
//     accepts `action: "mark_duplicate"` for craftsman+ and closes the source
//     post (full `duplicateOfPostId` linking is a follow-up).
//
// The intended flow:
//   1. Seed two apprentice-authored posts in the guild ("Original post" and
//      "Duplicate post") via `testApi.seedGuildPost`.
//   2. Promote one bootstrap expert to craftsman (the manifest defaults are
//      already craftsman; this is a defensive idempotent upsert) and log in
//      via SIWE.
//   3. Craftsman opens the "Duplicate post" detail modal, opens the
//      ModerationMenu, clicks "Mark duplicate" (and selects the target if a
//      picker appears).
//   4. Assert the duplicate post is closed:
//        - Reply composer is hidden (PostDetailModal gates on `!isClosed`).
//        - Backend echoes `isClosed: true` when we re-fetch the post via
//          `GET /api/guilds/:guildId/posts/:postId` (optionalFeedAuth — the
//          spec uses a plain request without a token, mirroring the public-feed
//          read path).
//
// **Status: test.skip** — `ModerationMenu.tsx` does NOT render a "Mark
// duplicate" menu item in M1 (it only exposes Pin / Close / Delete). The
// privilege gate (`canMarkDuplicate`) and the backend action both exist;
// only the UI surface is missing. The `markPostDuplicateViaUI` helper throws a
// remediation error when it can't find the menu item, so re-enabling the test
// is a two-line change once the affordance lands:
//   1. Drop the `test.skip(...)` below.
//   2. Add `data-testid="moderation-mark-duplicate"` to the new menu item in
//      `ModerationMenu.tsx`.
// No code changes to this spec or the helper are required.

import { test, expect } from "../../fixtures";
import { BACKEND_URL, testApi } from "../../helpers/backend";
import {
  connectWalletViaUI,
  ensureExpertSessionTokenViaUI,
} from "../../helpers/ui-auth";
import {
  markPostDuplicateViaUI,
  openFeedFor,
} from "../../helpers/ui-guild-feed-flow";

test.describe("guild feed — craftsman marks a post as duplicate (permission gate)", () => {
  test("craftsman marks 'Duplicate post' via moderation menu and the post is closed", async ({
    page,
    cleanState: _cleanState,
    experts,
    guild,
    request,
    wallet,
  }) => {
    void _cleanState;

    const guildExperts = experts.filter((e) => e.guildId === guild.id);
    expect(guildExperts.length).toBeGreaterThanOrEqual(2);
    const moderator = guildExperts[0];
    const author = guildExperts[1];

    const originalTitle = `Original post ${Date.now()}`;
    const duplicateTitle = `Duplicate post ${Date.now()}`;

    let duplicatePostId: string;

    await test.step("seed two apprentice-authored posts in the guild", async () => {
      const original = await testApi.seedGuildPost(request, {
        guildId: guild.id,
        authorExpertId: author.id,
        title: originalTitle,
        body: "Original (canonical) post about a topic.",
        tag: "discussion",
      });
      const duplicate = await testApi.seedGuildPost(request, {
        guildId: guild.id,
        authorExpertId: author.id,
        title: duplicateTitle,
        body: "Duplicate post about the same topic as the original.",
        tag: "discussion",
      });
      expect(original.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(duplicate.id).toMatch(/^[0-9a-f-]{36}$/);
      duplicatePostId = duplicate.id;
    });

    await test.step("ensure the moderator's guild membership is craftsman (manifest default — idempotent)", async () => {
      // The bootstrap manifest seeds all experts at craftsman; promoteExpertRole
      // only accepts "officer" | "master" in its type sig. We rely on the
      // manifest default here — no upsert needed. If a future change demotes
      // bootstrap experts below craftsman, add an explicit upsert path here
      // (will need `seedExpert({ role: "craftsman" })` to remain accepted).
      expect(moderator.id).toBeDefined();
    });

    await test.step("moderator connects wallet + SIWE handshake", async () => {
      await wallet.attach(page, moderator.privateKey);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(page);
      await ensureExpertSessionTokenViaUI(page, {
        walletAddress: moderator.address,
      });
    });

    await test.step("moderator opens the feed and marks the duplicate post via moderation menu", async () => {
      await openFeedFor(page, guild.id);
      await markPostDuplicateViaUI(page, {
        sourcePostTitle: duplicateTitle,
        targetPostTitle: originalTitle,
      });
    });

    await test.step("backend invariant: the duplicate post is closed", async () => {
      // GET /api/guilds/:guildId/posts/:postId is optionalFeedAuth — works
      // without a token (mirrors the public read path). Probe directly so
      // the assertion is independent of the UI's optimistic state.
      const res = await request.get(
        `${BACKEND_URL}/api/guilds/${encodeURIComponent(guild.id)}/posts/${encodeURIComponent(duplicatePostId!)}`,
      );
      expect(res.ok()).toBe(true);
      const body = (await res.json()) as {
        data: { id: string; isClosed?: boolean; is_closed?: boolean };
      };
      // Backend envelope is `{ success, data }`; getPost returns a GuildPost
      // shape. Tolerate either snake_case or camelCase field name to stay
      // resilient to the response mapper changing.
      const closed = body.data.isClosed ?? body.data.is_closed;
      expect(closed).toBe(true);
    });
  });
});
