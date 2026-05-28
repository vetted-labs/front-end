// e2e/real-flow/scenarios/guild-feed/06-poll-voting.spec.ts
//
// Poll voting suite — proves the PollCreator + PollDisplay flow end-to-end:
//   1. Single-choice poll: apprentice A creates a post with a 3-option,
//      24-hour-expiry single-choice poll. Apprentice B opens the detail
//      modal, picks one option, submits, and sees the selected option
//      marked with the ✓ indicator and the vote count incremented.
//   2. Multiple-choice poll: apprentice A creates a no-expiry,
//      multiple-choice poll with 3 options. Apprentice B selects two
//      options, submits, and sees both rendered as voted.
//
// Pre-flight wiring: `PollCreator` is mounted inside `NewPostModal` as of M2
// (NewPostModal.tsx imports it and renders `<PollCreator poll={poll}
// onChange={setPoll} />`). The poll payload is sent through
// `guildFeedApi.createPost`'s existing `poll` field; the embedded poll
// renders via `PollDisplay` inside `PostDetailModal`. No author edit/remove
// affordance is needed — both tests only exercise the create + vote path.
//
// If PollCreator's UI integration regresses (the "Add Poll" toggle stops
// rendering inside the dialog) the helper `createPostWithPollViaUI` will
// fail at the "open the poll composer" step with a clear error from the
// FRAGILE-SELECTOR comment block.

import { test, expect } from "../../fixtures";
import {
  connectWalletViaUI,
  ensureExpertSessionTokenViaUI,
} from "../../helpers/ui-auth";
import {
  castPollVoteViaUI,
  createPostWithPollViaUI,
  openFeedFor,
} from "../../helpers/ui-guild-feed-flow";

test.describe("guild feed — poll voting", () => {
  test("single-choice poll: voter selects one option and sees it confirmed", async ({
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

    const postTitle = `Single-choice poll ${Date.now()}`;
    // Use distinct option labels so option-text matching is unambiguous.
    const options = [
      `Option-A-${Date.now()}`,
      `Option-B-${Date.now()}`,
      `Option-C-${Date.now()}`,
    ];
    const chosenOption = options[1];

    await test.step("apprentice A creates a single-choice poll post", async () => {
      await wallet.attach(page, apprenticeA.privateKey);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(page);
      await ensureExpertSessionTokenViaUI(page, {
        walletAddress: apprenticeA.address,
      });
      await openFeedFor(page, guild.id);
      await createPostWithPollViaUI(page, {
        title: postTitle,
        body: "Poll body — pick exactly one option.",
        tag: "discussion",
        poll: {
          mode: "single",
          options,
          expiresIn: "24h",
        },
      });
    });

    await test.step("apprentice B (separate context) opens the post and votes for one option", async () => {
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

      await castPollVoteViaUI(bPage, {
        postTitle,
        optionTexts: [chosenOption],
      });

      await test.step("totalVotes increments to 1 (PollDisplay footer)", async () => {
        const dialog = bPage.getByRole("dialog").first();
        // PollDisplay footer renders "<n> vote" / "<n> votes".
        await expect(
          dialog.getByText(/^1\s+vote$/i).first(),
        ).toBeVisible({ timeout: 10_000 });
      });
    });
  });

  test("multiple-choice poll: voter selects two options and both show as voted", async ({
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

    const postTitle = `Multiple-choice poll ${Date.now()}`;
    const options = [
      `Multi-A-${Date.now()}`,
      `Multi-B-${Date.now()}`,
      `Multi-C-${Date.now()}`,
    ];
    const chosen = [options[0], options[2]];

    await test.step("apprentice A creates a multiple-choice, no-expiry poll post", async () => {
      await wallet.attach(page, apprenticeA.privateKey);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(page);
      await ensureExpertSessionTokenViaUI(page, {
        walletAddress: apprenticeA.address,
      });
      await openFeedFor(page, guild.id);
      await createPostWithPollViaUI(page, {
        title: postTitle,
        body: "Poll body — pick all that apply.",
        tag: "discussion",
        poll: {
          mode: "multiple",
          options,
          expiresIn: "none",
        },
      });
    });

    await test.step("apprentice B (separate context) selects two options and submits", async () => {
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

      await castPollVoteViaUI(bPage, {
        postTitle,
        optionTexts: chosen,
      });

      await test.step("totalVotes is 1 (per-voter count, regardless of option count)", async () => {
        // Backend semantics (guild-poll.service.ts):
        //   total_votes = COUNT(DISTINCT user_id)
        // So a single voter selecting two options still counts as 1 toward the
        // poll's totalVotes footer ("1 vote"). The per-option vote_count is
        // COUNT(*) (not distinct), so each selected option's count increments
        // by 1 — that's already covered by the helper's ✓-prefix assertion.
        const dialog = bPage.getByRole("dialog").first();
        await expect(
          dialog.getByText(/^1\s+vote$/i).first(),
        ).toBeVisible({ timeout: 10_000 });
      });
    });
  });
});
