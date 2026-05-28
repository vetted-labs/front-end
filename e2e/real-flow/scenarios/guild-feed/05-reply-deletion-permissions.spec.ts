// e2e/real-flow/scenarios/guild-feed/05-reply-deletion-permissions.spec.ts
//
// Reply-deletion permission suite:
//   1. Author deletes their OWN reply via the author-side affordance.
//   2. Officer deletes ANOTHER member's reply via the per-reply moderation
//      affordance.
//
// Both flows exercise the existing API path `guildFeedApi.deleteReply` (the
// backend route already authorizes both author-self and officer/master), but
// neither affordance is rendered by `ThreadedReplyList` / `ReplyNode` in M1:
//   • There is no author-side "Delete" button on the reply row.
//   • There is no per-reply moderation menu (the post-level ModerationMenu
//     only manages the post itself).
//
// Per scope (this spec is forbidden from adding testids/affordances to
// production components), both tests are skipped with explicit explanations.
// The helpers (`deleteReplyViaUI`) describe the exact selectors a future
// component PR should add to unblock them.
//
// To unblock test #1 (author delete):
//   • ThreadedReplyList.ReplyNode — render a "Delete" button (testid
//     `delete-reply`) visible when `reply.author.id === userId`. Wire it to
//     `guildFeedApi.deleteReply(guildId, postId, reply.id)`. Optionally
//     confirm via the shared Modal.
//
// To unblock test #2 (officer delete):
//   • ThreadedReplyList.ReplyNode — render a moderation menu mirroring the
//     post-level `ModerationMenu`. Trigger testid: `reply-moderation-actions`,
//     menu item testid: `reply-moderation-delete`. Visible when
//     `privileges.canDelete || privileges.canEditOthers` (or whatever the
//     backend authorization model decides). Wire to `guildFeedApi.deleteReply`.

import { test, expect } from "../../fixtures";
import { testApi } from "../../helpers/backend";
import {
  connectWalletViaUI,
  ensureExpertSessionTokenViaUI,
} from "../../helpers/ui-auth";
import {
  createGuildPostViaUI,
  deleteReplyViaUI,
  openFeedFor,
  replyToPostViaUI,
} from "../../helpers/ui-guild-feed-flow";

test.describe("guild feed — reply deletion permissions", () => {
  test("author deletes their own reply via the reply detail modal", async ({
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

    const postTitle = `Author-delete-reply target ${Date.now()}`;
    const replyBody = `Reply by apprentice B to be deleted by its author ${Date.now()}`;

    await test.step("apprentice A posts a thread for apprentice B to reply to", async () => {
      await wallet.attach(page, apprenticeA.privateKey);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(page);
      await ensureExpertSessionTokenViaUI(page, {
        walletAddress: apprenticeA.address,
      });
      await openFeedFor(page, guild.id);
      await createGuildPostViaUI(page, {
        title: postTitle,
        body: "Thread for the author-delete-reply test.",
        tag: "discussion",
      });
    });

    await test.step("apprentice B (separate context) replies to the post", async () => {
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
      await replyToPostViaUI(bPage, {
        postId: postTitle,
        body: replyBody,
      });

      await test.step("apprentice B deletes their own reply", async () => {
        await deleteReplyViaUI(bPage, {
          postTitle,
          replyBody,
          role: "author",
        });
      });

      await test.step("reply body disappears from the open detail modal", async () => {
        await expect(
          bPage.getByText(replyBody, { exact: false }).first(),
        ).toBeHidden({ timeout: 10_000 });
      });
    });
  });

  test("officer deletes another member's reply via the per-reply moderation menu", async ({
    page,
    cleanState: _cleanState,
    experts,
    guild,
    request,
    wallet,
    testContexts,
  }) => {
    void _cleanState;

    const guildExperts = experts.filter((e) => e.guildId === guild.id);
    expect(guildExperts.length).toBeGreaterThanOrEqual(3);
    const apprenticeA = guildExperts[0];
    const apprenticeB = guildExperts[1];
    const officer = guildExperts[2];

    const postTitle = `Officer-delete-reply target ${Date.now()}`;
    const replyBody = `Reply by apprentice B that the officer will delete ${Date.now()}`;

    await test.step("promote the moderator expert to officer in the backend", async () => {
      await testApi.promoteExpertRole(request, {
        walletAddress: officer.address,
        email: officer.email,
        guildId: guild.id,
        role: "officer",
      });
    });

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
        body: "Thread for the officer-delete-reply test.",
        tag: "discussion",
      });
    });

    await test.step("apprentice B (separate context) replies to the post", async () => {
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
      await replyToPostViaUI(bPage, {
        postId: postTitle,
        body: replyBody,
      });
    });

    await test.step("officer (separate context) deletes apprentice B's reply via moderation", async () => {
      const context = testContexts.register(
        await page
          .context()
          .browser()!
          .newContext({
            baseURL: new URL(page.url()).origin,
            bypassCSP: true,
          }),
      );
      const officerPage = await context.newPage();
      await wallet.attach(officerPage, officer.privateKey);
      await officerPage.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(officerPage);
      await ensureExpertSessionTokenViaUI(officerPage, {
        walletAddress: officer.address,
      });
      await openFeedFor(officerPage, guild.id);

      await deleteReplyViaUI(officerPage, {
        postTitle,
        replyBody,
        role: "officer",
      });

      await test.step("apprentice B's reply is gone from the open detail modal", async () => {
        await expect(
          officerPage.getByText(replyBody, { exact: false }).first(),
        ).toBeHidden({ timeout: 10_000 });
      });
    });
  });
});
