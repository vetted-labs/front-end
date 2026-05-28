// e2e/real-flow/scenarios/guild-feed/02-edit-and-delete-own-post.spec.ts
//
// Author-side mutation suite for the guild feed:
//   1. An expert edits the title + body of a post they authored.
//   2. An expert deletes a post they authored.
//
// Both flows exercise existing M1-era API paths (`guildFeedApi.updatePost`,
// `guildFeedApi.deletePost`). Both are now driven by the B6 PostDetailModal
// testids (`edit-post`, `edit-post-title-input`, `edit-post-body-input`,
// `save-post-edit`, `delete-post`, `confirm-delete-post`) — see the helper
// implementations in `helpers/ui-guild-feed-flow.ts` for the click path.

import { test, expect } from "../../fixtures";
import {
  connectWalletViaUI,
  ensureExpertSessionTokenViaUI,
} from "../../helpers/ui-auth";
import {
  createGuildPostViaUI,
  deletePostViaUI,
  editPostViaUI,
  openFeedFor,
  waitForPostGoneFromFeed,
} from "../../helpers/ui-guild-feed-flow";

test.describe("guild feed — author edits and deletes their own post", () => {
  test("author edits the title and body of their own post", async ({
    page,
    cleanState: _cleanState,
    experts,
    guild,
    wallet,
  }) => {
    void _cleanState;

    const author = experts.find((e) => e.guildId === guild.id)!;
    const originalTitle = `Edit-target post ${Date.now()}`;
    const newTitle = `${originalTitle} (edited)`;
    const newBody = "Body rewritten by the author via the edit modal.";

    await test.step("author connects wallet + SIWE handshake", async () => {
      await wallet.attach(page, author.privateKey);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(page);
      await ensureExpertSessionTokenViaUI(page, {
        walletAddress: author.address,
      });
    });

    await test.step("author creates the post they will later edit", async () => {
      await openFeedFor(page, guild.id);
      await createGuildPostViaUI(page, {
        title: originalTitle,
        body: "Original body — about to be rewritten.",
        tag: "discussion",
      });
    });

    await test.step("author edits the title and body", async () => {
      await editPostViaUI(page, {
        postTitle: originalTitle,
        newTitle,
        newBody,
      });
    });

    await test.step("after a reload the new title is rendered and the original is gone", async () => {
      await openFeedFor(page, guild.id);
      await expect(
        page.locator("h3", { hasText: newTitle }).first(),
      ).toBeVisible({ timeout: 10_000 });
      // Exact-match check: `originalTitle` is a substring of `newTitle`
      // ("... (edited)"), so substring-based hasText would always match the
      // renamed post. Use a strict equality regex to confirm no h3 carries the
      // unedited title verbatim.
      await expect(
        page
          .locator("h3")
          .filter({ hasText: new RegExp(`^${originalTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) })
          .first(),
      ).toBeHidden({ timeout: 5_000 });
    });
  });

  test("author deletes their own post and it disappears from the feed", async ({
    page,
    cleanState: _cleanState,
    experts,
    guild,
    wallet,
  }) => {
    void _cleanState;

    const author = experts.find((e) => e.guildId === guild.id)!;
    const postTitle = `Delete-target post ${Date.now()}`;

    await test.step("author connects wallet + SIWE handshake", async () => {
      await wallet.attach(page, author.privateKey);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(page);
      await ensureExpertSessionTokenViaUI(page, {
        walletAddress: author.address,
      });
    });

    await test.step("author creates the post they will later delete", async () => {
      await openFeedFor(page, guild.id);
      await createGuildPostViaUI(page, {
        title: postTitle,
        body: "This post is destined to be deleted by its author.",
        tag: "discussion",
      });
    });

    await test.step("author deletes the post via the detail modal", async () => {
      await deletePostViaUI(page, postTitle);
    });

    await test.step("the deleted post is gone from the feed list", async () => {
      await waitForPostGoneFromFeed(page, postTitle);
    });
  });
});
