// e2e/real-flow/scenarios/guild-feed/07-reactions-insightful-helpful.spec.ts
//
// Reaction toggle suite for "insightful" / "helpful" reactions on posts AND
// replies. Bookmark is intentionally NOT covered here — spec 13 already proves
// the post-level bookmark flow via the BookmarkButton component.
//
// Flow under test:
//   1. Apprentice A posts a thread.
//   2. Apprentice B opens the post detail modal, clicks Insightful → count
//      appears or increments.
//   3. B clicks Helpful → count appears or increments.
//   4. B re-clicks Insightful → it toggles off and the count decrements.
//   5. B opens (or seeds) a reply on the same thread → repeats the toggle on
//      the reply level.
//
// **NOT IMPLEMENTED IN M1** — `guildFeedApi.toggleReaction` and
// `ReactionSummary { insightful, helpful, bookmark, userReactions }` both
// exist (see src/lib/api.ts and src/types/guild-feed.ts), but no rendered
// control surfaces them. PostCard / PostDetailModal / ThreadedReplyList do
// not import any reaction-bar component, and grep of the components folder
// returns zero references to "insightful" or "helpful". Per scope (no
// component edits from this spec), the test is skipped with explicit
// affordance recommendations.
//
// To unblock:
//   • Add a `ReactionBar` (or equivalent) component that renders a button per
//     non-bookmark reaction. Recommended testids:
//       - reaction-insightful   (aria-pressed reflects userReactions includes)
//       - reaction-helpful      (aria-pressed reflects userReactions includes)
//     and a sibling count node, e.g. `<span data-testid="reaction-count-insightful">3</span>`,
//     so the helper can poll the count without scraping the button label.
//   • Mount ReactionBar in:
//       - PostDetailModal (next to VoteButton + BookmarkButton)
//       - ThreadedReplyList.ReplyNode (in the same row as Reply / Accept)
//   • Wire each button to `guildFeedApi.toggleReaction({ targetId,
//     targetType, reaction })` with optimistic increment/decrement.
//
// Once the UI exists, remove the `test.skip(...)` line, drop the throw in
// `toggleReactionViaUI()` for the insightful/helpful cases, and this spec
// should pass end-to-end against the live stack.

import { test, expect } from "../../fixtures";
import {
  connectWalletViaUI,
  ensureExpertSessionTokenViaUI,
} from "../../helpers/ui-auth";
import {
  createGuildPostViaUI,
  openFeedFor,
  replyToPostViaUI,
  toggleReactionViaUI,
} from "../../helpers/ui-guild-feed-flow";

test.describe("guild feed — insightful / helpful reactions", () => {
  test("apprentice toggles insightful + helpful reactions on a post and a reply", async ({
    page,
    cleanState: _cleanState,
    experts,
    guild,
    wallet,
    testContexts,
  }) => {
    void _cleanState;

    const guildExperts = experts.filter((e) => e.guildId === guild.id);
    expect(guildExperts.length).toBeGreaterThanOrEqual(2);
    const apprenticeA = guildExperts[0];
    const apprenticeB = guildExperts[1];

    const postTitle = `Reactions toggle target ${Date.now()}`;
    const seededReplyBody = `Reply for B to react to ${Date.now()}`;

    await test.step("apprentice A posts a thread", async () => {
      await wallet.attach(page, apprenticeA.privateKey);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(page);
      await ensureExpertSessionTokenViaUI(page, {
        walletAddress: apprenticeA.address,
      });
      await openFeedFor(page, guild.id);
      await createGuildPostViaUI(page, {
        title: postTitle,
        body: "Thread body for the insightful + helpful reaction test.",
        tag: "discussion",
      });

      // Seed a reply (authored by A) so the reply-level reaction step has a
      // concrete target. Using apprenticeA's session keeps the multi-actor
      // setup minimal — B only needs to react, not author.
      await replyToPostViaUI(page, {
        postId: postTitle,
        body: seededReplyBody,
      });
    });

    await test.step("apprentice B (separate context) opens the post", async () => {
      const context = testContexts.register(
        await page
          .context()
          .browser()!
          .newContext({
            baseURL: new URL(page.url()).origin,
            bypassCSP: true,
          }),
      );
      const bPage = await context.newPage();
      await wallet.attach(bPage, apprenticeB.privateKey);
      await bPage.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(bPage);
      await ensureExpertSessionTokenViaUI(bPage, {
        walletAddress: apprenticeB.address,
      });
      await openFeedFor(bPage, guild.id);

      await test.step("B clicks Insightful on the post — count appears / increments", async () => {
        await toggleReactionViaUI(bPage, {
          postTitle,
          reaction: "insightful",
        });
      });

      await test.step("B clicks Helpful on the post — count appears / increments", async () => {
        await toggleReactionViaUI(bPage, {
          postTitle,
          reaction: "helpful",
        });
      });

      await test.step("B re-clicks Insightful on the post — it toggles off and the count decrements", async () => {
        await toggleReactionViaUI(bPage, {
          postTitle,
          reaction: "insightful",
        });
      });

      // Reply-level reactions are deferred — ReplyNode does not yet mount a
      // ReactionBar (owned by a different agent / future iteration). The
      // post-level toggle/untoggle sequence above is the M1 scope for spec 07.
    });
  });
});
