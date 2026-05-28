// e2e/real-flow/scenarios/guild-feed/03-moderation-pin-close-delete.spec.ts
//
// Moderation suite for the guild feed:
//   1. An officer pins, then unpins, an apprentice's post.
//   2. An officer closes, then reopens, an apprentice's post — the reply
//      composer disappears while closed and reappears on reopen.
//   3. A master deletes an apprentice's post via the ModerationMenu (this is
//      the moderator-delete path, distinct from author-delete).
//
// Roles required:
//   • canPinUnpin / canCloseReopen → officer+
//   • canDelete → master only
// Bootstrap experts default to `craftsman`, so each test promotes a chosen
// expert via `testApi.promoteExpertRole()` before driving the UI. The
// `cleanState` fixture's `pruneExperts` resets the rank back to craftsman
// between tests, so promotions are test-local.

import { test, expect } from "../../fixtures";
import { testApi } from "../../helpers/backend";
import {
  connectWalletViaUI,
  ensureExpertSessionTokenViaUI,
} from "../../helpers/ui-auth";
import {
  closeDetailModal,
  closePostViaUI,
  createGuildPostViaUI,
  deletePostViaModeration,
  isReplyComposerVisible,
  openFeedFor,
  pinPostViaUI,
  reopenPostViaUI,
  unpinPostViaUI,
  waitForPostGoneFromFeed,
} from "../../helpers/ui-guild-feed-flow";

test.describe("guild feed — moderation actions", () => {
  test("officer pins and unpins an apprentice's post", async ({
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
    expect(guildExperts.length).toBeGreaterThanOrEqual(2);
    const author = guildExperts[0];
    const officer = guildExperts[1];

    const postTitle = `Pinned-then-unpinned post ${Date.now()}`;

    await test.step("promote the moderator expert to officer in the backend", async () => {
      const result = await testApi.promoteExpertRole(request, {
        walletAddress: officer.address,
        email: officer.email,
        guildId: guild.id,
        role: "officer",
      });
      expect(result.id).toBe(officer.id);
    });

    await test.step("author (apprentice/craftsman) creates a post", async () => {
      await wallet.attach(page, author.privateKey);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(page);
      await ensureExpertSessionTokenViaUI(page, {
        walletAddress: author.address,
      });
      await openFeedFor(page, guild.id);
      await createGuildPostViaUI(page, {
        title: postTitle,
        body: "Subject of an officer's pin/unpin moderation action.",
        tag: "discussion",
      });
    });

    await test.step("officer signs in via a fresh context and pins the post", async () => {
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
      await pinPostViaUI(officerPage, postTitle);

      // Pinned indicator persists on the feed-list card too (PostCard renders
      // the "Pinned" pill above the title). Close the modal then assert.
      await closeDetailModal(officerPage);
      await expect(
        officerPage.locator("text=/Pinned/").first(),
      ).toBeVisible({ timeout: 10_000 });

      await test.step("officer unpins the post via the moderation menu", async () => {
        await unpinPostViaUI(officerPage, postTitle);
      });
    });
  });

  test("officer closes and reopens a post — reply composer toggles with the state", async ({
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
    expect(guildExperts.length).toBeGreaterThanOrEqual(2);
    const author = guildExperts[0];
    const officer = guildExperts[1];

    const postTitle = `Close-then-reopen post ${Date.now()}`;

    await test.step("promote the moderator expert to officer in the backend", async () => {
      await testApi.promoteExpertRole(request, {
        walletAddress: officer.address,
        email: officer.email,
        guildId: guild.id,
        role: "officer",
      });
    });

    await test.step("author creates the post", async () => {
      await wallet.attach(page, author.privateKey);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(page);
      await ensureExpertSessionTokenViaUI(page, {
        walletAddress: author.address,
      });
      await openFeedFor(page, guild.id);
      await createGuildPostViaUI(page, {
        title: postTitle,
        body: "Subject of an officer's close/reopen moderation action.",
        tag: "discussion",
      });
    });

    await test.step("officer signs in via a fresh context and closes the post", async () => {
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
      await closePostViaUI(officerPage, postTitle);

      await test.step("while closed: reply composer is hidden", async () => {
        // closePostViaUI leaves the detail modal open. The composer is gated
        // on !isClosed; on close it un-mounts.
        expect(await isReplyComposerVisible(officerPage)).toBe(false);
      });

      await test.step("officer reopens the post via the moderation menu", async () => {
        await reopenPostViaUI(officerPage, postTitle);
      });

      await test.step("after reopen: reply composer is visible again", async () => {
        // The composer re-mounts because `localPost.isClosed` flipped to false.
        await expect(
          officerPage.getByPlaceholder(/write a reply\.\.\./i).first(),
        ).toBeVisible({ timeout: 5_000 });
      });
    });
  });

  test("master deletes an apprentice's post via the moderation menu", async ({
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
    expect(guildExperts.length).toBeGreaterThanOrEqual(2);
    const author = guildExperts[0];
    const master = guildExperts[1];

    const postTitle = `Master-deleted post ${Date.now()}`;

    await test.step("promote the moderator expert to master in the backend", async () => {
      await testApi.promoteExpertRole(request, {
        walletAddress: master.address,
        email: master.email,
        guildId: guild.id,
        role: "master",
      });
    });

    await test.step("author creates the post", async () => {
      await wallet.attach(page, author.privateKey);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(page);
      await ensureExpertSessionTokenViaUI(page, {
        walletAddress: author.address,
      });
      await openFeedFor(page, guild.id);
      await createGuildPostViaUI(page, {
        title: postTitle,
        body: "Subject of a master's destructive moderation action.",
        tag: "discussion",
      });
    });

    await test.step("master signs in via a fresh context and deletes the post via moderation menu", async () => {
      const context = testContexts.register(
        await page
          .context()
          .browser()!
          .newContext({
            baseURL: new URL(page.url()).origin,
            bypassCSP: true,
          }),
      );
      const masterPage = await context.newPage();
      await wallet.attach(masterPage, master.privateKey);
      await masterPage.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(masterPage);
      await ensureExpertSessionTokenViaUI(masterPage, {
        walletAddress: master.address,
      });
      await openFeedFor(masterPage, guild.id);
      await deletePostViaModeration(masterPage, postTitle);

      await test.step("post is gone from the feed list", async () => {
        await waitForPostGoneFromFeed(masterPage, postTitle);
      });
    });
  });
});
