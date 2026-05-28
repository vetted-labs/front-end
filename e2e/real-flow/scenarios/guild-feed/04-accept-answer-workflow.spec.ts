// e2e/real-flow/scenarios/guild-feed/04-accept-answer-workflow.spec.ts
//
// Accepted-answer workflow for `question`-tagged posts:
//   1. Author posts a question.
//   2. A second expert replies.
//   3. Author opens the detail modal, clicks Accept on the reply.
//   4. The accepted-answer badge appears on the reply.
//
// The PostCard also surfaces a "Solved" badge once a question has an accepted
// reply (see PostCard.tsx:33 — `isSolved = !!post.acceptedReplyId && post.tag === 'question'`).
// We assert that as the user-visible "Answered" indicator.
//
// A planned 5th step — author removes the accepted answer — is held back
// because `ThreadedReplyList` / `AcceptedAnswerBadge` do not expose a
// remove/unaccept control in M1. See `removeAcceptedAnswerViaUI` in
// `ui-guild-feed-flow.ts` for the exact selector a future component PR should
// add (recommended testid: `remove-accepted-answer`). The remove flow is left
// out of the spec today; once the affordance lands, append a step that calls
// `removeAcceptedAnswerViaUI(page, postTitle)` and asserts the "Accepted
// Answer" badge disappears.

import { test, expect } from "../../fixtures";
import {
  connectWalletViaUI,
  ensureExpertSessionTokenViaUI,
} from "../../helpers/ui-auth";
import {
  acceptReplyAsAnswerViaUI,
  closeDetailModal,
  createGuildPostViaUI,
  openFeedFor,
  replyToPostViaUI,
} from "../../helpers/ui-guild-feed-flow";

test.describe("guild feed — accept-answer workflow", () => {
  test("author posts a question, second expert replies, author accepts the reply", async ({
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
    const responder = guildExperts[1];

    const postTitle = `Accept-answer flow ${Date.now()}`;
    const replyBody = `Authoritative answer body ${Date.now()} — this is the reply that the author will accept.`;

    await test.step("author connects wallet + SIWE handshake", async () => {
      await wallet.attach(page, author.privateKey);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(page);
      await ensureExpertSessionTokenViaUI(page, {
        walletAddress: author.address,
      });
    });

    await test.step("author creates a question-tagged post", async () => {
      await openFeedFor(page, guild.id);
      await createGuildPostViaUI(page, {
        title: postTitle,
        body: "Author's question — looking for an authoritative answer.",
        tag: "question",
      });
    });

    await test.step("second expert opens a fresh context and replies to the question", async () => {
      const context = testContexts.register(
        await page
          .context()
          .browser()!
          .newContext({
            baseURL: new URL(page.url()).origin,
            bypassCSP: true,
          }),
      );
      const responderPage = await context.newPage();
      await wallet.attach(responderPage, responder.privateKey);
      await responderPage.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(responderPage);
      await ensureExpertSessionTokenViaUI(responderPage, {
        walletAddress: responder.address,
      });

      await openFeedFor(responderPage, guild.id);
      await replyToPostViaUI(responderPage, {
        postId: postTitle,
        body: replyBody,
      });
    });

    await test.step("author refreshes the feed, opens the post, and accepts the reply", async () => {
      // The author's page is still on the feed but the reply was created in
      // the responder's session — refetch by re-opening the feed page so the
      // reply count and replies list reflect the new state. (openFeedFor goes
      // through a fresh navigation, which triggers useFetch's refetch.)
      await openFeedFor(page, guild.id);
      await acceptReplyAsAnswerViaUI(page, postTitle, replyBody);
    });

    await test.step("post detail modal shows the 'Accepted Answer' indicator on the reply", async () => {
      // After accept, ReplyNode re-renders with the inline "Accepted" text
      // (CheckCircle2 + 'Accepted') and the AcceptedAnswerBadge ("Accepted
      // Answer") wraps the pinned reply at the top of the list. Either is a
      // valid signal; we assert the Accepted Answer badge specifically because
      // the badge is the more durable user-visible signal.
      await expect(
        page.getByText(/^accepted answer$/i).first(),
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step("feed list surfaces the 'Solved' badge on the question card", async () => {
      // PostCard renders <AcceptedAnswerBadge variant="post-card" /> which
      // shows "Solved" in the feed list when post.acceptedReplyId is set and
      // the tag is 'question'.
      await closeDetailModal(page);
      // Close-then-open feed to force the cached posts list to refetch the
      // new acceptedReplyId. openFeedFor navigates, which re-mounts the
      // paginated fetch.
      await openFeedFor(page, guild.id);
      await expect(
        page.locator("text=/^Solved$/").first(),
      ).toBeVisible({ timeout: 10_000 });
    });

    // FOLLOW-UP STEP (omitted from this spec today):
    //   "author removes the accepted answer; badge disappears"
    // Blocked on ThreadedReplyList / AcceptedAnswerBadge gaining a
    // remove/unaccept control (recommended testid: remove-accepted-answer).
    // The supporting API exists at guildFeedApi.removeAcceptedAnswer.
    // When the affordance lands, append:
    //   await removeAcceptedAnswerViaUI(page, postTitle);
    //   await expect(page.getByText(/^accepted answer$/i).first()).toBeHidden(...);
  });
});
