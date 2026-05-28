// e2e/real-flow/scenarios/guild-feed/13-feed-mutations-comprehensive.spec.ts
//
// Verification spec — proves every guild-feed mutation that the original
// "token not provided" bug blocked now works end-to-end against the live
// stack: create post → reply → upvote → bookmark.
//
// Companion to spec 01 (which proves the SIWE handshake) and spec 12 (which
// proves the refresh-on-expiry path). This one is the user-visible payoff:
// "can the expert actually use the feed?"

import { test, expect } from "../../fixtures";
import {
  connectWalletViaUI,
  ensureExpertSessionTokenViaUI,
} from "../../helpers/ui-auth";
import {
  bookmarkPostViaUI,
  createGuildPostViaUI,
  openFeedFor,
  replyToPostViaUI,
  upvotePostViaUI,
} from "../../helpers/ui-guild-feed-flow";

test.describe("@regression-auth-handshake guild feed — full mutation suite", () => {
  test("expert can create post, reply, upvote, and bookmark in a single session", async ({
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

    const author = guildExperts[0];
    const reactor = guildExperts[1];

    const postTitle = `Comprehensive mutation suite ${Date.now()}`;
    const replyBody = "Reply from a second authenticated expert — proves the gate works for replies too.";

    await test.step("author connects wallet + SIWE handshake", async () => {
      await wallet.attach(page, author.privateKey);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(page);
      await ensureExpertSessionTokenViaUI(page, { walletAddress: author.address });
    });

    await test.step("author CREATES the post", async () => {
      await openFeedFor(page, guild.id);
      await createGuildPostViaUI(page, {
        title: postTitle,
        body: "Post body for the comprehensive mutation spec.",
        tag: "discussion",
      });
      await expect(
        page.locator("h3", { hasText: postTitle }).first(),
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step("author UPVOTES their own post (the VoteButton mutation gate)", async () => {
      await upvotePostViaUI(page, postTitle);
    });

    await test.step("author BOOKMARKS the post (the BookmarkButton mutation gate)", async () => {
      await bookmarkPostViaUI(page, postTitle);
    });

    await test.step("second expert opens the same post and REPLIES (the ThreadedReplyList gate)", async () => {
      // Use a fresh browser context so the wallet attachment / SIWE session is
      // isolated — the wallet fixture rejects a second attach() on the same
      // page, by design (one wallet per page).
      const context = testContexts.register(
        await page
          .context()
          .browser()!
          .newContext({
            baseURL: new URL(page.url()).origin,
            bypassCSP: true,
          }),
      );
      const reactorPage = await context.newPage();
      await wallet.attach(reactorPage, reactor.privateKey);
      await reactorPage.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(reactorPage);
      await ensureExpertSessionTokenViaUI(reactorPage, { walletAddress: reactor.address });

      await openFeedFor(reactorPage, guild.id);
      await replyToPostViaUI(reactorPage, { postId: postTitle, body: replyBody });
    });
  });
});
