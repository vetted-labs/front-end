// e2e/real-flow/scenarios/guild-feed/08-recruit-post-block.spec.ts
//
// Permission-gate spec — recruit-rank experts cannot post in the guild feed,
// but CAN reply to existing posts.
//
// Per the permission matrix (`src/lib/feedPrivileges.ts:21-60`):
//   - `recruit` rank → `canPost: false`, `canReply: true`
//   - `apprentice` rank and above → `canPost: true`
//
// Flow:
//   1. Seed a post authored by an apprentice in the bootstrap guild (so the
//      recruit has something to reply to). Direct API seed — no UI needed.
//   2. Mint a fresh wallet and seed it as an expert with role='recruit' in the
//      same guild (uses the widened `seedExpert` role allowlist).
//   3. Connect the recruit's wallet, complete the SIWE handshake.
//   4. Open the guild feed and assert the composer trigger is disabled with the
//      placeholder copy "Posting requires apprentice rank or higher." (per
//      `GuildPublicFeedTab.tsx:142-152`, exercised by `assertCannotPostInGuildB4`).
//   5. Probe the positive side of the matrix: the recruit CAN reply to the
//      seeded post via the UI (`canReply=true` for recruits).

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";

import { test, expect } from "../../fixtures";
import { testApi } from "../../helpers/backend";
import {
  connectWalletViaUI,
  ensureExpertSessionTokenViaUI,
} from "../../helpers/ui-auth";
import {
  assertCannotPostInGuildB4,
  openFeedFor,
  replyToPostViaUI,
} from "../../helpers/ui-guild-feed-flow";

test.describe("guild feed — recruit cannot post (permission gate)", () => {
  test("recruit-rank expert sees the disabled-composer placeholder and can still reply", async ({
    page,
    cleanState: _cleanState,
    experts,
    guild,
    request,
    wallet,
  }) => {
    void _cleanState;

    // Bootstrap manifest seeds 10 apprentice/craftsman experts per guild. Pick
    // any apprentice from guilds[0] to author the post the recruit will reply to.
    const apprentice = experts.find((e) => e.guildId === guild.id);
    expect(
      apprentice,
      "fixture invariant: bootstrap must have at least one expert in guilds[0]",
    ).toBeDefined();

    const seedPostTitle = `Recruit-block target ${Date.now()}`;
    const seedPostBody =
      "Seeded post the recruit will reply to — exercises the positive side of the recruit permission matrix.";
    const recruitReplyBody = `Recruit reply ${Date.now()} — proves canReply=true even when canPost=false.`;

    let seededPostId: string | undefined;

    await test.step("seed a post authored by an apprentice for the recruit to reply to", async () => {
      const post = await testApi.seedGuildPost(request, {
        guildId: guild.id,
        authorExpertId: apprentice!.id,
        title: seedPostTitle,
        body: seedPostBody,
        tag: "discussion",
      });
      seededPostId = post.id;
      expect(seededPostId).toBeTruthy();
    });

    // Mint a fresh wallet so the recruit's expert row does not collide with any
    // bootstrap-seeded wallet (and so the SIWE handshake exercises a real first
    // login rather than reusing an existing session).
    const recruitPrivateKey: Hex = generatePrivateKey();
    const recruitAddress = privateKeyToAccount(recruitPrivateKey).address;
    const recruitEmail = `e2e-recruit-${Date.now()}-${recruitAddress.slice(2, 10)}@e2e.local`;
    const recruitName = `Recruit ${recruitAddress.slice(2, 8)}`;

    await test.step("seed a fresh expert at role='recruit' in the bootstrap guild", async () => {
      const seeded = await testApi.seedExpert(request, {
        walletAddress: recruitAddress,
        fullName: recruitName,
        email: recruitEmail,
        guildId: guild.id,
        role: "recruit",
      });
      expect(seeded.id).toBeTruthy();
    });

    await test.step("recruit attaches the headless wallet shim and connects via wagmi", async () => {
      await wallet.attach(page, recruitPrivateKey);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(page);
    });

    await test.step("SIWE handshake completes for the recruit", async () => {
      const result = await ensureExpertSessionTokenViaUI(page, {
        walletAddress: recruitAddress,
      });
      expect(result.accessToken).toMatch(/^eyJ/);
    });

    await test.step("composer is disabled with the rank-gate placeholder", async () => {
      await assertCannotPostInGuildB4(page, guild.id);
    });

    await test.step("recruit CAN reply to an existing post (canReply=true)", async () => {
      // assertCannotPostInGuildB4 already navigated to the feed; replyToPostViaUI
      // opens the post detail modal and submits a reply via the top-level composer.
      await openFeedFor(page, guild.id);
      await replyToPostViaUI(page, {
        postId: seedPostTitle,
        body: recruitReplyBody,
      });
      await expect(
        page.getByText(recruitReplyBody, { exact: false }).first(),
      ).toBeVisible({ timeout: 15_000 });
    });
  });
});
