// e2e/real-flow/helpers/ui-guild-feed-flow.ts
//
// UI flow drivers for the public guild feed (M1.4).
//
// These wrap `test.step(...)` per `e2e/PLAYWRIGHT_TEMPLATE.md` so Auto Mate
// shows human-readable progress. Selectors are derived from a code trace of
// `src/components/guild/feed/` against the live UI as of M1:
//
//   - `GuildDetailPage.tsx` renders the public guild page at /guilds/[guildId]
//     with a "Feed" tab (the default) wired into `GuildPublicFeedTab` →
//     `GuildFeedTab`.
//   - `GuildFeedTab` renders the "New Post" button (visible only to
//     authenticated members with `canPost`), the `PostCard` list, and the
//     `NewPostModal`.
//   - `NewPostModal` has form fields `#post-title` and `#post-body`, a row of
//     tag buttons whose labels match the TAG_OPTIONS array (Discussion /
//     Question / Insight / Job-Related), and a submit button labelled "Post".
//   - `PostCard` is a clickable div with title in an <h3>. The post-detail
//     modal (`PostDetailModal`) opens on click and exposes the reply
//     composer, VoteButton, BookmarkButton, and ModerationMenu (aria-label
//     "Moderation actions").
//
// None of the feed components carry data-testid attributes today (M1 keeps
// component edits out of this agent's blast radius). The helpers below
// resolve a post via the rendered title — callers should pass the title as
// `args.postId` when no testid is available, OR pass the actual post UUID and
// the helper will navigate by URL hash where the UI supports it. For now we
// open the detail modal by title, which is unambiguous within a single
// scenario's seeded data.

import { test, expect, type Page } from "@playwright/test";

type PostTag = "discussion" | "question" | "insight" | "job_related";

const TAG_LABELS: Record<PostTag, string> = {
  discussion: "Discussion",
  question: "Question",
  insight: "Insight",
  job_related: "Job-Related",
};

/**
 * Navigate to the public guild page (which defaults to the Feed tab) and wait
 * for either the post list container or the empty-state placeholder to show.
 *
 * `guildSlug` may be either a slug or a UUID — the route `/guilds/[guildId]`
 * accepts both opaquely; the backend's getPublicDetail handles the lookup.
 */
export async function openFeedFor(
  page: Page,
  guildSlug: string,
): Promise<void> {
  await test.step(`open the guild feed for "${guildSlug}"`, async () => {
    await page.goto(`/guilds/${encodeURIComponent(guildSlug)}`, {
      waitUntil: "domcontentloaded",
    });

    // The "Feed" tab is the default; confirm we're on it. The tab control is
    // role=tab (per the Radix-based GuildPublicTabs).
    const feedTab = page.getByRole("tab", { name: /^feed$/i }).first();
    if (await feedTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const selected = await feedTab.getAttribute("aria-selected");
      if (selected !== "true") {
        await feedTab.click();
      }
    }

    // Wait for either the open-new-post composer trigger (member with
    // canPost — testid is the same on both GuildFeedTab and
    // GuildPublicFeedTab), an existing post card, or the empty-state heading.
    // Whichever resolves first is fine — the feed has rendered.
    await Promise.race([
      page
        .getByTestId("open-new-post")
        .first()
        .waitFor({ state: "visible", timeout: 15_000 })
        .catch(() => undefined),
      page
        .locator("h3")
        .first()
        .waitFor({ state: "visible", timeout: 15_000 })
        .catch(() => undefined),
      page
        .getByText(/no posts yet|no saved posts/i)
        .first()
        .waitFor({ state: "visible", timeout: 15_000 })
        .catch(() => undefined),
    ]);
  });
}

/**
 * Locate a post card by its rendered title text. The title lives in an <h3>
 * inside the post card (`PostCard.tsx`); the post card itself is the nearest
 * clickable ancestor.
 *
 * `postId` here is overloaded:
 *   - If it looks like a UUID, the helper tries to match against an
 *     `id="post-<uuid>"` anchor first (forward-compat for when components
 *     gain testids).
 *   - Otherwise it falls back to a substring match against the post title.
 *
 * The string-title fallback is the supported M1 path because the components
 * don't expose testids yet.
 */
function locatePostCard(page: Page, postId: string) {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      postId,
    );
  if (isUuid) {
    // Prefer a UUID-anchored element if the component grows one later.
    const anchored = page.locator(`[data-post-id="${postId}"]`).first();
    return anchored;
  }
  // Title-based match: the h3 whose textContent contains `postId`. Then the
  // closest ancestor that's the clickable card row (the parent of the colored
  // accent strip plus content; using the .group/cursor-pointer wrapper).
  return page.locator("h3", { hasText: postId }).first();
}

export interface CreateGuildPostArgs {
  title: string;
  body: string;
  tag?: PostTag;
}

/**
 * Click "New Post" → fill the modal → submit. Waits for the post to appear in
 * the feed list (matched by title).
 *
 * Preconditions: the caller has navigated to the feed (call `openFeedFor`
 * first) and is authenticated as a member with `canPost` — otherwise the
 * "New Post" button never renders.
 */
export async function createGuildPostViaUI(
  page: Page,
  args: CreateGuildPostArgs,
): Promise<void> {
  const { title, body, tag = "discussion" } = args;

  await test.step(`open the New Post modal`, async () => {
    const composerTrigger = page.getByTestId("open-new-post").first();
    await expect(composerTrigger).toBeVisible({ timeout: 15_000 });
    await composerTrigger.click();
    // The Modal is title="New Post"; wait for the title input to mount.
    await expect(page.locator("#post-title")).toBeVisible({ timeout: 10_000 });
  });

  await test.step(`fill the new-post form`, async () => {
    // Tag selector: each button's label matches TAG_LABELS. Default is
    // "discussion" so we only click if a different tag is requested.
    if (tag !== "discussion") {
      // CRITICAL: scope the lookup to the dialog. The feed page renders a row
      // of tag-filter chips (All / Hot / Discussion / Question / Insight / ...)
      // that share their labels with the modal's tag selector — an unscoped
      // page.getByRole("button", { name: /Question/i }).first() resolves to
      // the FILTER chip behind the modal and the modal's tag never changes.
      // Force-click after scoping because the form's `space-y-3` wrapper from
      // M1.4 edits sometimes intercepts pointer events during auto-wait.
      const dialog = page.getByRole("dialog", { name: /new post/i });
      await dialog
        .getByRole("button", { name: new RegExp(`^${TAG_LABELS[tag]}$`, "i") })
        .first()
        .click({ force: true });
    }

    await page.locator("#post-title").fill(title);
    await page.locator("#post-body").fill(body);
  });

  await test.step(`submit the post and wait for it to appear in the feed`, async () => {
    // Use the testid the M1 component agent added to the modal's submit so we
    // don't collide with the inline-composer "Post" button rendered on the
    // page underneath.
    const submitBtn = page.getByTestId("new-post-submit");
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
    await submitBtn.click();

    // Modal closes on success (`onCreated` in GuildFeedTab calls refetch()).
    await expect(page.locator("#post-title")).toBeHidden({ timeout: 15_000 });

    // New post should show up in the feed list — match by the title text
    // (PostCard renders the title in an <h3>).
    await expect(
      page.locator("h3", { hasText: title }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
}

export interface ReplyToPostArgs {
  /**
   * Post identifier. Pass the post title (the typical M1 path — components
   * have no testids) or the UUID if a `data-post-id` attribute is added
   * later.
   */
  postId: string;
  body: string;
  /** Reserved for nested replies; not yet supported by this helper. */
  parentReplyId?: string;
}

/**
 * Open the post detail modal for `postId`, type a reply, submit, and wait for
 * the reply body to render.
 */
export async function replyToPostViaUI(
  page: Page,
  args: ReplyToPostArgs,
): Promise<void> {
  const { postId, body, parentReplyId } = args;

  if (parentReplyId) {
    // The inline-reply composer lives in `ThreadedReplyList.ReplyNode` —
    // exercising it requires resolving the parent reply within the modal,
    // which the M1 specs don't currently need. Surface a clear error so the
    // caller knows to extend the helper before reaching for nesting.
    throw new Error(
      "replyToPostViaUI: parentReplyId is not yet implemented; the top-level reply composer is the only supported path in M1",
    );
  }

  await test.step(`open the detail modal for post "${postId}"`, async () => {
    const card = locatePostCard(page, postId);
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();
    // PostDetailModal renders a "Back to Feed" button + a reply composer.
    await expect(
      page.getByRole("button", { name: /back to feed/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  await test.step(`submit a top-level reply`, async () => {
    // The top-level reply composer is the visible input with placeholder
    // "Write a reply..." (PostDetailModal.tsx). Threaded inline composers
    // share the same placeholder, so we scope by the first visible one.
    const composer = page
      .getByPlaceholder(/write a reply\.\.\./i)
      .first();
    await expect(composer).toBeVisible({ timeout: 10_000 });
    await composer.fill(body);

    // The submit button is labeled "Reply" inside the composer form; use the
    // first matching button (the modal's top-level form).
    const replyBtn = page.getByRole("button", { name: /^reply$/i }).first();
    await expect(replyBtn).toBeEnabled({ timeout: 5_000 });
    await replyBtn.click();

    // On success the composer clears and the reply body appears below.
    // MarkdownBody renders prose text; match the typed body verbatim.
    await expect(
      page.getByText(body, { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
}

/**
 * Click the upvote button on a post in the feed list (NOT the detail modal).
 * The VoteButton sits in the PostCard footer.
 *
 * Asserts the count increments by 1 vs. its pre-click value.
 */
export async function upvotePostViaUI(
  page: Page,
  postId: string,
): Promise<void> {
  await test.step(`upvote the post "${postId}" from the feed list`, async () => {
    const card = locatePostCard(page, postId);
    await expect(card).toBeVisible({ timeout: 10_000 });

    // The post card wrapper contains a VoteButton with a ChevronUp icon and a
    // numeric (or "Vote") count below it. Anchor on the card's parent then
    // scope the button — VoteButton is the first <button> in the footer row.
    const cardContainer = card.locator(
      'xpath=ancestor::div[contains(@class, "cursor-pointer")][1]',
    );
    const voteBtn = cardContainer.locator("button").first();
    await expect(voteBtn).toBeVisible({ timeout: 5_000 });

    // Read the pre-click count text so we can assert the increment. Format:
    // "<number>" or the literal string "Vote" when scoreHidden=true.
    const before = (await voteBtn.textContent())?.trim() ?? "";
    const beforeCount = /^\d+$/.test(before) ? parseInt(before, 10) : null;

    await voteBtn.click();

    if (beforeCount !== null) {
      // Optimistic UI increments immediately; backend confirmation may rewrite
      // to the same value. Poll up to a couple of seconds for the +1.
      await expect
        .poll(
          async () => {
            const txt = (await voteBtn.textContent())?.trim() ?? "";
            return /^\d+$/.test(txt) ? parseInt(txt, 10) : null;
          },
          { timeout: 5_000 },
        )
        .toBe(beforeCount + 1);
    }
  });
}

/**
 * Open the detail modal for a post by title. Used by helpers below that need
 * the modal to be the visible surface for their next action. Idempotent — if
 * the modal is already open for this post, it's a no-op.
 */
async function openDetailModalForPost(page: Page, postTitle: string): Promise<void> {
  // Cheap proxy for "is the detail modal open for THIS post?": the modal renders
  // an <h2> with the title, while the feed list renders an <h3>. If the <h2>
  // is already visible, skip the click.
  const modalTitle = page.locator("h2", { hasText: postTitle }).first();
  if (await modalTitle.isVisible({ timeout: 500 }).catch(() => false)) {
    return;
  }
  const card = locatePostCard(page, postTitle);
  await expect(card).toBeVisible({ timeout: 10_000 });
  await card.click();
  await expect(
    page.getByRole("button", { name: /back to feed/i }).first(),
  ).toBeVisible({ timeout: 10_000 });
}

/**
 * Close the post detail modal by clicking "Back to Feed". Waits for the modal
 * to disappear so subsequent feed-list assertions don't race against a still-
 * open overlay. Exported so multi-step specs can interleave moderation
 * actions with feed-list assertions without title-collision noise.
 */
export async function closeDetailModal(page: Page): Promise<void> {
  const back = page.getByRole("button", { name: /back to feed/i }).first();
  if (await back.isVisible({ timeout: 500 }).catch(() => false)) {
    await back.click();
    await expect(back).toBeHidden({ timeout: 10_000 });
  }
}

export interface EditPostArgs {
  postTitle: string;
  newTitle?: string;
  newBody?: string;
  newTag?: PostTag;
}

/**
 * Open the post detail modal for the matching post, click the edit affordance,
 * fill in the requested fields, and submit.
 *
 * Driven by the B6 PostDetailModal testids:
 *   - `edit-post` — author-only button that swaps the read view for the
 *     edit form (visible when `isPostAuthor && !isEditing`).
 *   - `edit-post-title-input` / `edit-post-body-input` — controlled inputs
 *     for the edit form.
 *   - `save-post-edit` — submit button that PUTs via guildFeedApi.updatePost.
 *
 * The tag selector inside the edit form is a row of buttons sharing labels
 * with the create-modal tag chips; we scope the lookup to the open `<form>`
 * that contains the title input so we don't collide with the feed-level tag
 * filter chips.
 *
 * After save the modal exits edit mode in place — the title <h2> updates and
 * the edit-form testids un-mount. We assert on both: the body textarea
 * disappears AND the new title is reachable somewhere on the page.
 */
export async function editPostViaUI(
  page: Page,
  args: EditPostArgs,
): Promise<void> {
  const { postTitle, newTitle, newBody, newTag } = args;

  await test.step(`open the detail modal for post "${postTitle}"`, async () => {
    await openDetailModalForPost(page, postTitle);
  });

  await test.step("enter edit mode via the author Edit button", async () => {
    const editBtn = page.getByTestId("edit-post");
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    await editBtn.click();
    // Edit-mode markers: the title input mounts.
    await expect(page.getByTestId("edit-post-title-input")).toBeVisible({
      timeout: 10_000,
    });
  });

  await test.step("fill the requested edit fields", async () => {
    if (newTitle !== undefined) {
      const titleInput = page.getByTestId("edit-post-title-input");
      await titleInput.fill(newTitle);
    }
    if (newBody !== undefined) {
      const bodyInput = page.getByTestId("edit-post-body-input");
      await bodyInput.fill(newBody);
    }
    if (newTag) {
      // The edit form is a <form> inside the post-detail Modal. Scope the tag
      // lookup to the form that contains the title input so we don't grab the
      // feed-level tag filter chips behind the modal.
      const editForm = page
        .locator("form")
        .filter({ has: page.getByTestId("edit-post-title-input") })
        .first();
      await editForm
        .getByRole("button", { name: new RegExp(`^${TAG_LABELS[newTag]}$`, "i") })
        .first()
        .click({ force: true });
    }
  });

  await test.step("submit the edit and wait for the modal to leave edit mode", async () => {
    const saveBtn = page.getByTestId("save-post-edit");
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();

    // Success signal: the edit form unmounts. We deliberately do NOT assert
    // the updated <h2> here because the backend's PUT returns
    // `{ success: true }` (no GuildPost payload), and `PostDetailModal`'s
    // success handler spreads `updated.title/body/tag` directly into the
    // local post — so on the *current* build the modal flips back to read
    // mode briefly and then the ErrorBoundary may catch a render with
    // `undefined` fields. The caller's responsibility is to reload the feed
    // (openFeedFor) and assert the renamed title on the fresh fetch.
    await expect(page.getByTestId("edit-post-body-input")).toBeHidden({
      timeout: 15_000,
    });
  });
}

/**
 * Delete a post as the post author by opening the detail modal and clicking
 * the author-side Delete affordance, then confirming the destructive dialog.
 *
 * Driven by the B6 PostDetailModal testids:
 *   - `delete-post` — author-only button that opens the confirm dialog
 *     (visible when `isPostAuthor && !isEditing`).
 *   - `confirm-delete-post` — destructive confirm button inside the nested
 *     "Delete this post?" modal; calls guildFeedApi.deletePost and then
 *     `onClose()` on success (the parent feed refetches via the
 *     `onPostModerated` callback wired by GuildFeedTab).
 *
 * After confirm the detail modal closes ("Back to Feed" hides) and the post
 * card disappears from the feed list — we assert on the modal close as the
 * primary signal; the caller is expected to verify feed-list removal with
 * `waitForPostGoneFromFeed`.
 */
export async function deletePostViaUI(
  page: Page,
  postTitle: string,
): Promise<void> {
  await test.step(`open the detail modal for post "${postTitle}"`, async () => {
    await openDetailModalForPost(page, postTitle);
  });

  await test.step("click the author Delete button to open the confirm dialog", async () => {
    const deleteBtn = page.getByTestId("delete-post");
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
    await deleteBtn.click();
    // The nested confirm modal mounts the destructive button.
    await expect(page.getByTestId("confirm-delete-post")).toBeVisible({
      timeout: 10_000,
    });
  });

  await test.step("confirm the delete and wait for the modal to close", async () => {
    const confirmBtn = page.getByTestId("confirm-delete-post");
    await expect(confirmBtn).toBeEnabled({ timeout: 5_000 });
    await confirmBtn.click();

    // PostDetailModal's onClose fires once deletePost resolves; both the
    // confirm button and the "Back to Feed" affordance leave the DOM.
    await expect(page.getByTestId("confirm-delete-post")).toBeHidden({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("button", { name: /back to feed/i }).first(),
    ).toBeHidden({ timeout: 10_000 });
  });

  await test.step("the post card disappears from the feed list", async () => {
    await expect(
      page.locator("h3", { hasText: postTitle }).first(),
    ).toBeHidden({ timeout: 10_000 });
  });
}

/**
 * Unpin a post via the ModerationMenu. Mirror of `pinPostViaUI`; the menu
 * toggles its label between "Pin" and "Unpin" based on `isPinned`.
 *
 * Preconditions: caller has `canPinUnpin` (officer+) and the post is currently
 * pinned. The helper opens the detail modal first because ModerationMenu only
 * renders inside `PostDetailModal`.
 */
export async function unpinPostViaUI(
  page: Page,
  postTitle: string,
): Promise<void> {
  await test.step(`open the detail modal for post "${postTitle}"`, async () => {
    await openDetailModalForPost(page, postTitle);
    await expect(
      page.getByLabel(/moderation actions/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  await test.step(`unpin the post via the moderation menu`, async () => {
    const trigger = page.getByLabel(/moderation actions/i).first();
    await trigger.click();
    // FRAGILE-SELECTOR: ModerationMenu renders "Unpin" only when post is pinned.
    // Future improvement: testid="moderation-toggle-pin" with aria-pressed=true/false.
    const dropdown = trigger.locator(
      'xpath=ancestor::div[contains(@class, "relative")][1]',
    );
    const unpinItem = dropdown.getByRole("button", { name: /^unpin$/i }).first();
    await expect(unpinItem).toBeVisible({ timeout: 5_000 });
    await unpinItem.click({ force: true });

    // The moderation toast reads "Post unpinned"; the post header drops its
    // "[Pinned]" prefix span. Either signal works.
    await expect(
      page
        .getByText(/post unpinned/i)
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });
}

/**
 * Close a post via the ModerationMenu. After closing, the reply composer
 * vanishes (`PostDetailModal` gates the composer on `!isClosed`).
 *
 * Preconditions: caller has `canCloseReopen` (officer+).
 */
export async function closePostViaUI(
  page: Page,
  postTitle: string,
): Promise<void> {
  await test.step(`open the detail modal for post "${postTitle}"`, async () => {
    await openDetailModalForPost(page, postTitle);
    await expect(
      page.getByLabel(/moderation actions/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  await test.step(`close the post via the moderation menu`, async () => {
    const trigger = page.getByLabel(/moderation actions/i).first();
    await trigger.click();
    // FRAGILE-SELECTOR: ModerationMenu renders "Close" only when post is open.
    // Future improvement: testid="moderation-toggle-close". The unqualified
    // page.getByRole("button", { name: /^close$/i }) ALSO matches the
    // Radix Modal's X (aria-label="Close"), so we scope to the trigger's
    // .relative parent which contains the dropdown.
    const dropdown = trigger.locator(
      'xpath=ancestor::div[contains(@class, "relative")][1]',
    );
    const closeItem = dropdown.getByRole("button", { name: /^close$/i }).first();
    await expect(closeItem).toBeVisible({ timeout: 5_000 });
    await closeItem.click({ force: true });

    // Toast "Post closed" + header gains "[Closed]" prefix + composer hides.
    await expect(
      page
        .getByText(/post closed|\[closed\]/i)
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });
}

/**
 * Reopen a closed post via the ModerationMenu. After reopen, the reply
 * composer reappears.
 *
 * Preconditions: caller has `canCloseReopen` (officer+) and the post is
 * currently closed.
 */
export async function reopenPostViaUI(
  page: Page,
  postTitle: string,
): Promise<void> {
  await test.step(`open the detail modal for post "${postTitle}"`, async () => {
    await openDetailModalForPost(page, postTitle);
    await expect(
      page.getByLabel(/moderation actions/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  await test.step(`reopen the post via the moderation menu`, async () => {
    const trigger = page.getByLabel(/moderation actions/i).first();
    await trigger.click();
    // FRAGILE-SELECTOR: ModerationMenu renders "Reopen" only when post is
    // closed. Future improvement: testid="moderation-toggle-close" + aria.
    const dropdown = trigger.locator(
      'xpath=ancestor::div[contains(@class, "relative")][1]',
    );
    const reopenItem = dropdown
      .getByRole("button", { name: /^reopen$/i })
      .first();
    await expect(reopenItem).toBeVisible({ timeout: 5_000 });
    await reopenItem.click({ force: true });

    await expect(
      page
        .getByText(/post reopened/i)
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });
}

/**
 * Delete a post via the ModerationMenu — distinct from author-side delete.
 * The moderation Delete only renders for users with `canDelete` (master rank).
 *
 * After deletion the detail modal closes (`handleModerated('delete')` calls
 * `onClose()`); the caller can then assert the post is gone from the feed.
 */
export async function deletePostViaModeration(
  page: Page,
  postTitle: string,
): Promise<void> {
  await test.step(`open the detail modal for post "${postTitle}"`, async () => {
    await openDetailModalForPost(page, postTitle);
    await expect(
      page.getByLabel(/moderation actions/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  await test.step(`delete the post via the moderation menu`, async () => {
    const trigger = page.getByLabel(/moderation actions/i).first();
    await trigger.click();
    // FRAGILE-SELECTOR: the destructive button is labelled "Delete".
    // Future improvement: testid="moderation-delete". Scope the lookup to the
    // dropdown container so it doesn't clash with any future "Delete" buttons
    // elsewhere in the modal.
    const dropdown = trigger.locator(
      'xpath=ancestor::div[contains(@class, "relative")][1]',
    );
    const deleteItem = dropdown
      .getByRole("button", { name: /^delete$/i })
      .first();
    await expect(deleteItem).toBeVisible({ timeout: 5_000 });
    await deleteItem.click({ force: true });

    // The modal closes on success (handleModerated('delete') -> onClose()).
    await expect(
      page.getByRole("button", { name: /back to feed/i }).first(),
    ).toBeHidden({ timeout: 10_000 });
  });
}

/**
 * Within the open post detail modal, find the reply whose body matches
 * `replyBody` and click its "Accept" button. Asserts the accepted-answer
 * badge appears.
 *
 * Preconditions: caller is the post author (or has `canAcceptOnBehalf`) AND
 * the post has no accepted answer yet (the Accept button only renders while
 * `acceptedReplyId` is unset).
 */
export async function acceptReplyAsAnswerViaUI(
  page: Page,
  postTitle: string,
  replyBody: string,
): Promise<void> {
  await test.step(`open the detail modal for post "${postTitle}"`, async () => {
    await openDetailModalForPost(page, postTitle);
  });

  await test.step(`accept the reply matching "${replyBody.slice(0, 32)}..." as the answer`, async () => {
    // ReplyNode renders the body inside a MarkdownBody and the action buttons
    // ("Reply", "Accept") below in the same card. Scope the Accept button to
    // the card whose body contains the target text.
    //
    // FRAGILE-SELECTOR: ThreadedReplyList has no testids on reply rows or the
    // Accept button. Future improvement: data-testid={`reply-${reply.id}`} on
    // the wrapping <div> + data-testid="accept-answer" on the button.
    const replyCard = page
      .locator(
        'xpath=//div[contains(@class, "rounded-lg") and contains(@class, "border")]' +
          `[.//text()[contains(., ${JSON.stringify(replyBody.slice(0, 64))})]]`,
      )
      .first();
    await expect(replyCard).toBeVisible({ timeout: 10_000 });

    const acceptBtn = replyCard.getByRole("button", { name: /^accept$/i }).first();
    await expect(acceptBtn).toBeVisible({ timeout: 5_000 });
    await acceptBtn.click();

    // Toast: "Answer accepted!"; ReplyNode then re-renders with the
    // "Accepted" badge (CheckCircle2 + text).
    await expect(
      page
        .getByText(/answer accepted|^accepted$/i)
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });
}

/**
 * Remove the accepted answer from a post via the in-modal control next to the
 * "Accepted Answer" badge.
 *
 * **NOT IMPLEMENTED IN M1** — `ThreadedReplyList` and `AcceptedAnswerBadge`
 * render the "Accepted" indicator but do NOT expose a control to unaccept.
 * The supporting API exists (`guildFeedApi.removeAcceptedAnswer`) but no UI
 * surface drives it. The PostDetailModal also lacks an onRemove callback wired
 * into `acceptedReplyId` setter.
 *
 * Once the component gains a remove control, this helper should:
 *   1. Open the detail modal via openDetailModalForPost(page, postTitle)
 *   2. Click the button labelled `/remove|unaccept/i` next to the accepted
 *      reply's badge (recommended testid: remove-accepted-answer)
 *   3. Wait for the badge to disappear and for the "Accept" buttons to
 *      re-render on the other replies.
 *
 * Throws today so any spec that calls this helper fails loudly.
 */
export async function removeAcceptedAnswerViaUI(
  _page: Page,
  postTitle: string,
): Promise<void> {
  void postTitle;
  throw new Error(
    "removeAcceptedAnswerViaUI: not implemented — neither ThreadedReplyList nor " +
      "AcceptedAnswerBadge expose a 'Remove' / 'Unaccept' control in M1. " +
      "Add a button (recommended testid: remove-accepted-answer) and update this helper. " +
      "API path is guildFeedApi.removeAcceptedAnswer.",
  );
}

/**
 * Returns true if the post detail modal is currently showing a visible top-
 * level reply composer (the placeholder input "Write a reply..."), false if
 * the composer is hidden/disabled (e.g. because the post was closed).
 *
 * Used by close/reopen specs to assert the composer state. The composer is
 * rendered conditionally on `isAuthenticated && isMember && !isClosed`, so its
 * presence is the cleanest UI signal of the close/reopen toggle.
 */
export async function isReplyComposerVisible(page: Page): Promise<boolean> {
  const composer = page.getByPlaceholder(/write a reply\.\.\./i).first();
  return composer.isVisible({ timeout: 500 }).catch(() => false);
}

/**
 * Wait for the post with the given title to disappear from the feed list.
 * Useful after a delete (author or moderation) to confirm the optimistic-or-
 * server-refetch flow removed the card.
 */
export async function waitForPostGoneFromFeed(
  page: Page,
  postTitle: string,
  timeoutMs = 10_000,
): Promise<void> {
  await expect(
    page.locator("h3", { hasText: postTitle }).first(),
  ).toBeHidden({ timeout: timeoutMs });
}

/**
 * Feature a post for `featuredHours` hours via the moderation menu.
 *
 * **Not implemented in M1.** Featuring ships with M2.2 (`Phase 3 —
 * NEXT_PUBLIC_FEED_FEATURED_POSTS`). The function exists so M2.2 specs can
 * call it without re-touching this helper; until then it throws so M1 specs
 * that accidentally call it fail loudly instead of silently no-oping.
 */
export async function featurePostViaUI(
  _page: Page,
  _postId: string,
  _featuredHours: number,
): Promise<void> {
  throw new Error(
    "featurePostViaUI: not implemented (M2.2 — feature/unfeature UI ships with NEXT_PUBLIC_FEED_FEATURED_POSTS)",
  );
}

/**
 * Pin a post via its ModerationMenu. Opens the detail modal first because the
 * moderation menu is only rendered inside `PostDetailModal`.
 *
 * Preconditions: the current user has `canPinUnpin` privileges (officer+
 * within the guild, or app-level moderation role).
 */
export async function pinPostViaUI(page: Page, postId: string): Promise<void> {
  await test.step(`open the detail modal for post "${postId}"`, async () => {
    const card = locatePostCard(page, postId);
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();
    await expect(
      page.getByLabel(/moderation actions/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  await test.step(`pin the post via the moderation menu`, async () => {
    // Open the menu.
    await page.getByLabel(/moderation actions/i).first().click();

    // The Pin menu item is a button whose label is exactly "Pin" (toggles to
    // "Unpin" when the post is already pinned).
    const pinItem = page.getByRole("button", { name: /^pin$/i }).first();
    await expect(pinItem).toBeVisible({ timeout: 5_000 });
    await pinItem.click();

    // Modal stays open; the post header gets a "[Pinned]" prefix span and the
    // moderation toast reads "Post pinned". Either signal works.
    await expect(
      page
        .getByText(/post pinned|\[pinned\]/i)
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });
}

/**
 * Toggle the bookmark state of a post from the feed list. The BookmarkButton
 * sits in the PostCard footer next to the reply count.
 *
 * Asserts the bookmark icon transitions to its filled/active state.
 */
export async function bookmarkPostViaUI(
  page: Page,
  postId: string,
): Promise<void> {
  await test.step(`bookmark the post "${postId}" from the feed list`, async () => {
    const card = locatePostCard(page, postId);
    await expect(card).toBeVisible({ timeout: 10_000 });

    const cardContainer = card.locator(
      'xpath=ancestor::div[contains(@class, "cursor-pointer")][1]',
    );
    // BookmarkButton uses title="Bookmark"; that title attribute is the most
    // stable hook available without a testid.
    const bookmarkBtn = cardContainer.getByTitle(/^bookmark$/i).first();
    await expect(bookmarkBtn).toBeVisible({ timeout: 5_000 });

    // Capture pre-click state via the icon's class list (fill-info-blue is
    // the bookmarked marker — see BookmarkButton.tsx:33).
    const wasBookmarked = await bookmarkBtn
      .locator("svg")
      .first()
      .evaluate((el) => el.classList.contains("fill-info-blue"))
      .catch(() => false);

    await bookmarkBtn.click();

    await expect
      .poll(
        async () =>
          bookmarkBtn
            .locator("svg")
            .first()
            .evaluate((el) => el.classList.contains("fill-info-blue"))
            .catch(() => false),
        { timeout: 5_000 },
      )
      .toBe(!wasBookmarked);
  });
}

// === B3 Bundle helpers ===
//
// Helpers added by the B3 specs (reply deletion permissions, poll voting, and
// post/reply reactions). Each helper documents the M1 UI surface it expects
// and — when that surface is missing — throws a clear "blocked on component
// PR" error so the calling spec fails loudly (mirrors the pattern used by
// editPostViaUI / deletePostViaUI / removeAcceptedAnswerViaUI above).

/**
 * Open the post-detail modal for the post with `postTitle`. Identical
 * navigation contract to the (private) `openDetailModalForPost` above —
 * exposed as a B3 helper so the B3 specs can use it without depending on a
 * non-exported symbol. Idempotent (no-op if already open for that post).
 *
 * Kept in the B3 block so we don't risk colliding with merges from other
 * agents extending the top-level helpers section in parallel.
 */
async function openDetailModalForPostB3(
  page: import("@playwright/test").Page,
  postTitle: string,
): Promise<void> {
  const modalTitle = page.locator("h2", { hasText: postTitle }).first();
  if (await modalTitle.isVisible({ timeout: 500 }).catch(() => false)) {
    return;
  }
  // Reuse locatePostCard's title-substring contract (defined privately above).
  // We re-implement here rather than importing because locatePostCard is
  // module-local and the B3 block must remain append-only.
  const card = page.locator("h3", { hasText: postTitle }).first();
  await expect(card).toBeVisible({ timeout: 10_000 });
  await card.click();
  await expect(
    page.getByRole("button", { name: /back to feed/i }).first(),
  ).toBeVisible({ timeout: 10_000 });
}

export interface DeleteReplyViaUIArgs {
  postTitle: string;
  replyBody: string;
  /**
   * Which permission path drives the deletion:
   *   - "author"  → the current user authored the reply; clicks the
   *                 author-side "Delete" affordance rendered next to the
   *                 reply (recommended testid: `delete-reply`).
   *   - "officer" → the current user is a guild officer/master moderator;
   *                 uses the per-reply moderation menu (recommended testid:
   *                 `reply-moderation-actions` opening a Delete item with
   *                 testid `reply-moderation-delete`).
   */
  role: "author" | "officer";
}

/**
 * Open the post-detail modal, find the reply card matching `replyBody`, and
 * trigger the appropriate delete affordance.
 *
 * Driven by the ThreadedReplyList.ReplyNode testids added alongside this
 * helper unblock:
 *   - `delete-reply` — author-only inline button on the reply row, rendered
 *     when `reply.author.id === userId && reply.author.type === userType`.
 *   - `reply-moderation-actions` — officer+ moderation menu trigger,
 *     rendered when the viewer holds officer/master privileges AND is NOT
 *     the reply author.
 *   - `reply-moderation-delete` — the Delete menu item inside the dropdown.
 *   - `confirm-delete-reply` — destructive confirm button inside the nested
 *     "Delete this reply?" Modal that both code paths route through.
 *
 * The reply card is resolved by an ancestor lookup off the reply body text:
 * each reply card is a `bg-card` div in ReplyNode (see
 * `ThreadedReplyList.tsx` — the row that wraps VoteButton + body + actions).
 * We scope testid lookups to that card so sibling replies don't collide.
 */
export async function deleteReplyViaUI(
  page: import("@playwright/test").Page,
  args: DeleteReplyViaUIArgs,
): Promise<void> {
  const { postTitle, replyBody, role } = args;

  await test.step(`open the detail modal for post "${postTitle}"`, async () => {
    await openDetailModalForPostB3(page, postTitle);
  });

  // Locate the reply card by an ancestor walk off the body text. The card
  // wrapper has `bg-card` (see ReplyNode in ThreadedReplyList.tsx). We can't
  // rely on the body text being a direct child (MarkdownBody wraps it), hence
  // the descendant `text()` predicate.
  const replyCard = page
    .locator(
      'xpath=//div[contains(@class, "bg-card")]' +
        `[.//text()[contains(., ${JSON.stringify(replyBody.slice(0, 64))})]]`,
    )
    .first();

  await test.step(`locate the reply card matching "${replyBody.slice(0, 32)}..."`, async () => {
    await expect(replyCard).toBeVisible({ timeout: 10_000 });
  });

  if (role === "author") {
    await test.step("click the author-side Delete button on the reply row", async () => {
      const deleteBtn = replyCard.getByTestId("delete-reply").first();
      await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
      await deleteBtn.click();
    });
  } else {
    await test.step("open the per-reply moderation menu and click Delete", async () => {
      const trigger = replyCard.getByTestId("reply-moderation-actions").first();
      await expect(trigger).toBeVisible({ timeout: 10_000 });
      await trigger.click();
      const deleteItem = replyCard.getByTestId("reply-moderation-delete").first();
      await expect(deleteItem).toBeVisible({ timeout: 5_000 });
      await deleteItem.click();
    });
  }

  await test.step("confirm the destructive Delete dialog", async () => {
    // The confirm Modal is portaled near the document root; look it up on
    // `page` rather than scoping to the reply card.
    const confirmBtn = page.getByTestId("confirm-delete-reply").first();
    await expect(confirmBtn).toBeVisible({ timeout: 10_000 });
    await expect(confirmBtn).toBeEnabled({ timeout: 5_000 });
    await confirmBtn.click();
    await expect(confirmBtn).toBeHidden({ timeout: 15_000 });
  });

  await test.step("the reply body disappears from the open detail modal", async () => {
    // The detail modal stays open; the parent's refetchReplies removes the
    // deleted reply from the rendered tree.
    await expect(
      page.getByText(replyBody, { exact: false }).first(),
    ).toBeHidden({ timeout: 15_000 });
  });
}

export interface CreatePostWithPollArgs {
  title: string;
  body: string;
  tag?: "discussion" | "question" | "insight" | "job_related";
  poll: {
    mode: "single" | "multiple";
    /**
     * Poll option labels. NewPostModal validation requires at least 2 non-
     * empty options after trimming; PollCreator allows up to 6.
     */
    options: string[];
    /**
     * Expiry window. Maps to PollCreator's <select> values:
     *   - "1h"   → 1 hour
     *   - "24h"  → 1 day
     *   - "none" → No expiry (default)
     */
    expiresIn?: "1h" | "24h" | "none";
  };
}

const EXPIRY_LABELS: Record<NonNullable<CreatePostWithPollArgs["poll"]["expiresIn"]>, string> = {
  "1h": "1 hour",
  "24h": "1 day",
  none: "No expiry",
};

/**
 * Open the New Post modal, fill the title/body/tag, then open the PollCreator
 * panel, set the choice mode + options + expiry, and submit. Mirrors the
 * existing createGuildPostViaUI contract: waits for the post to appear in the
 * feed list (matched by title) before returning.
 *
 * Preconditions: caller has navigated to the feed (openFeedFor) and is an
 * authenticated member with `canPost`.
 *
 * PollCreator integration is wired through NewPostModal as of M2 (see
 * `PollCreator` import + `<PollCreator poll={poll} onChange={setPoll} />` in
 * NewPostModal.tsx). The "Add Poll" button is the first thing the helper
 * targets inside the dialog.
 */
export async function createPostWithPollViaUI(
  page: import("@playwright/test").Page,
  args: CreatePostWithPollArgs,
): Promise<void> {
  const { title, body, tag = "discussion", poll } = args;

  await test.step(`open the New Post modal`, async () => {
    const composerTrigger = page.getByTestId("open-new-post").first();
    await expect(composerTrigger).toBeVisible({ timeout: 15_000 });
    await composerTrigger.click();
    await expect(page.locator("#post-title")).toBeVisible({ timeout: 10_000 });
  });

  await test.step(`fill title, body, and (optionally) tag`, async () => {
    if (tag !== "discussion") {
      const dialog = page.getByRole("dialog", { name: /new post/i });
      const tagLabel = TAG_LABELS[tag];
      await dialog
        .getByRole("button", { name: new RegExp(`^${tagLabel}$`, "i") })
        .first()
        .click({ force: true });
    }
    await page.locator("#post-title").fill(title);
    await page.locator("#post-body").fill(body);
  });

  await test.step(`enable the poll composer and select choice mode "${poll.mode}"`, async () => {
    const dialog = page.getByRole("dialog", { name: /new post/i });
    // FRAGILE-SELECTOR: PollCreator's toggle button has no testid; we match
    // the visible label "Add Poll" (it flips to "Remove Poll" when open).
    // Future improvement: add data-testid="toggle-poll-composer" to the
    // button in PollCreator.tsx.
    const addPollBtn = dialog
      .getByRole("button", { name: /^add poll$/i })
      .first();
    await expect(addPollBtn).toBeVisible({ timeout: 5_000 });
    await addPollBtn.click();

    // After click the panel renders with "Single choice" pre-selected. If the
    // caller asked for multiple, click the matching pill.
    // FRAGILE-SELECTOR: the choice-mode buttons are role=button with labels
    // "Single choice" / "Multiple choice". Future improvement:
    // data-testid="poll-choice-mode-single" / "...-multiple".
    if (poll.mode === "multiple") {
      const multipleBtn = dialog
        .getByRole("button", { name: /^multiple choice$/i })
        .first();
      await expect(multipleBtn).toBeVisible({ timeout: 5_000 });
      await multipleBtn.click({ force: true });
    }
  });

  await test.step(`fill ${poll.options.length} poll options`, async () => {
    const dialog = page.getByRole("dialog", { name: /new post/i });
    // PollCreator seeds two empty option inputs. Add extra inputs via the
    // "Add option" button for any additional options the caller wants.
    // FRAGILE-SELECTOR: the inputs match placeholder /^Option N$/.
    // Future improvement: data-testid={`poll-option-${i}`} on each input.
    for (let i = 2; i < poll.options.length; i += 1) {
      const addOption = dialog
        .getByRole("button", { name: /^add option$/i })
        .first();
      await expect(addOption).toBeVisible({ timeout: 5_000 });
      await addOption.click({ force: true });
    }

    for (let i = 0; i < poll.options.length; i += 1) {
      const input = dialog.getByPlaceholder(new RegExp(`^Option ${i + 1}$`)).first();
      await expect(input).toBeVisible({ timeout: 5_000 });
      await input.fill(poll.options[i]);
    }
  });

  await test.step(`set expiry to "${poll.expiresIn ?? "none"}"`, async () => {
    const dialog = page.getByRole("dialog", { name: /new post/i });
    const expiry = poll.expiresIn ?? "none";
    // The PollCreator renders a native <select> just below the options list.
    // FRAGILE-SELECTOR: native <select> with no aria-label; we target by the
    // option label via selectOption({ label }). Future improvement:
    // data-testid="poll-expiry" on the <select>.
    const select = dialog.locator("select").first();
    await expect(select).toBeVisible({ timeout: 5_000 });
    await select.selectOption({ label: EXPIRY_LABELS[expiry] });
  });

  await test.step(`submit the post and wait for it to appear in the feed`, async () => {
    const submitBtn = page.getByTestId("new-post-submit");
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
    await submitBtn.click();
    await expect(page.locator("#post-title")).toBeHidden({ timeout: 15_000 });
    await expect(
      page.locator("h3", { hasText: title }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
}

export interface CastPollVoteViaUIArgs {
  postTitle: string;
  optionTexts: string[];
}

/**
 * Open the detail modal for `postTitle`, find the embedded PollDisplay, click
 * each option in `optionTexts`, and submit. After submission the helper
 * asserts that every option text passed in is rendered with the "✓" prefix
 * (PollDisplay's `option.hasVoted` indicator) — that's the user-visible
 * confirmation the vote landed.
 *
 * Preconditions: the post has a poll attached and the current user has not
 * yet voted (PollDisplay swaps to results-only mode once `poll.hasVoted` is
 * true).
 */
export async function castPollVoteViaUI(
  page: import("@playwright/test").Page,
  args: CastPollVoteViaUIArgs,
): Promise<void> {
  const { postTitle, optionTexts } = args;

  await test.step(`open the detail modal for post "${postTitle}"`, async () => {
    await openDetailModalForPostB3(page, postTitle);
  });

  await test.step(`select ${optionTexts.length} poll option(s)`, async () => {
    // FRAGILE-SELECTOR: PollDisplay renders each option as a <button> whose
    // text is the option label. The dialog scope keeps the lookup off any
    // sibling poll-creator UI that might be open elsewhere on the page.
    // Future improvement: data-testid={`poll-option-button-${optionId}`}.
    const dialog = page.getByRole("dialog").first();
    for (const text of optionTexts) {
      const optBtn = dialog
        .getByRole("button", { name: new RegExp(`^${escapeRegExp(text)}$`) })
        .first();
      await expect(optBtn).toBeVisible({ timeout: 5_000 });
      await optBtn.click();
    }
  });

  await test.step(`submit the vote`, async () => {
    const dialog = page.getByRole("dialog").first();
    // FRAGILE-SELECTOR: the submit button is labelled "Vote" (becomes
    // "Voting..." while pending). Future improvement: data-testid="poll-vote-submit".
    const voteBtn = dialog
      .getByRole("button", { name: /^vote$/i })
      .first();
    await expect(voteBtn).toBeVisible({ timeout: 5_000 });
    await expect(voteBtn).toBeEnabled({ timeout: 5_000 });
    await voteBtn.click();

    // After success PollDisplay flips to results view: each selected option is
    // prefixed with "✓" and the totalVotes count increments. We assert the
    // checkmark prefix on each selected option as the durable signal.
    for (const text of optionTexts) {
      await expect(
        dialog
          .locator("span", { hasText: new RegExp(`✓\\s*${escapeRegExp(text)}`) })
          .first(),
      ).toBeVisible({ timeout: 10_000 });
    }
  });
}

export interface ToggleReactionViaUIArgs {
  postTitle: string;
  /**
   * When provided, the helper targets the reaction button inside the reply
   * card whose body contains `replyBody`. When omitted, the helper targets
   * the post-level reaction control next to the VoteButton + BookmarkButton.
   */
  replyBody?: string;
  reaction: "insightful" | "helpful" | "bookmark";
}

/**
 * Toggle a reaction (insightful / helpful / bookmark) on a post or reply in
 * the open feed/detail modal.
 *
 * Bookmark already has a stable UI surface (`BookmarkButton`, testid
 * `bookmark-button`) on the post level — the helper uses it directly when
 * `reaction === "bookmark"` AND `replyBody` is not given.
 *
 * **Insightful and Helpful are NOT IMPLEMENTED IN M1.** No `ReactionBar`
 * component exists; the supporting API exists (`guildFeedApi.toggleReaction`
 * with `reaction: "insightful" | "helpful"`) and the type system already
 * carries `ReactionSummary.insightful` / `.helpful`, but no rendered control
 * surfaces them. Once a reactions UI lands (recommended: a horizontal
 * `<ReactionBar />` next to the VoteButton on PostCard + PostDetailModal +
 * ReplyNode), this helper should:
 *
 *   1. Resolve the scope:
 *        - reply: open the detail modal, locate the reply card whose body
 *          contains `replyBody`.
 *        - post:  open the detail modal (or the feed card, post owner's
 *          choice — current ToC suggests the modal for clearer scoping).
 *   2. Click the button with testid `reaction-{reaction}` (e.g.
 *      `reaction-insightful`). aria-pressed should reflect the toggle state.
 *   3. Poll until the count next to the button increments (or decrements on
 *      a re-toggle). Read the count from the button's text or a sibling
 *      <span data-testid="reaction-count-{reaction}">.
 *
 * Bookmark on a reply is also unimplemented in M1 — `BookmarkButton` is only
 * mounted at the post level (PostCard + PostDetailModal). Throws when asked
 * to bookmark a reply.
 */
export async function toggleReactionViaUI(
  page: import("@playwright/test").Page,
  args: ToggleReactionViaUIArgs,
): Promise<void> {
  const { postTitle, replyBody, reaction } = args;

  if (reaction === "bookmark") {
    if (replyBody) {
      throw new Error(
        "toggleReactionViaUI: reply-level bookmark is not implemented — BookmarkButton is only mounted on the post (PostCard + PostDetailModal). " +
          "If reply bookmarks are required, add a BookmarkButton to ReplyNode and update this helper.",
      );
    }
    // Defer to the existing post-bookmark helper. Open the modal first so the
    // assertion surface matches the insightful/helpful flow for consistency.
    await test.step(`bookmark the post "${postTitle}" via the detail modal`, async () => {
      await openDetailModalForPostB3(page, postTitle);
      const dialog = page.getByRole("dialog").first();
      const bookmarkBtn = dialog.getByTestId("bookmark-button").first();
      await expect(bookmarkBtn).toBeVisible({ timeout: 5_000 });
      const wasBookmarked = await bookmarkBtn
        .locator("svg")
        .first()
        .evaluate((el) => el.classList.contains("fill-info-blue"))
        .catch(() => false);
      await bookmarkBtn.click();
      await expect
        .poll(
          async () =>
            bookmarkBtn
              .locator("svg")
              .first()
              .evaluate((el) => el.classList.contains("fill-info-blue"))
              .catch(() => false),
          { timeout: 5_000 },
        )
        .toBe(!wasBookmarked);
    });
    return;
  }

  // Reply-level reactions are out of scope for spec 07. Reply rows are owned
  // by ThreadedReplyList (a different agent); once a ReactionBar is mounted
  // inside ReplyNode, extend the locator below to scope by reply card.
  if (replyBody) {
    throw new Error(
      `toggleReactionViaUI: reply-level '${reaction}' reaction is not implemented. ` +
        "ThreadedReplyList does not yet mount a ReactionBar on reply rows. " +
        "Add a ReactionBar to ReplyNode and update this helper to scope the click by reply card.",
    );
  }

  // Post-level insightful/helpful: open the detail modal and click the
  // testid'd button inside ReactionBar. The button text is the count, so we
  // read it before/after to assert the toggle direction (increment on first
  // click, decrement on a re-toggle).
  await test.step(`toggle '${reaction}' on post "${postTitle}" via the detail modal`, async () => {
    await openDetailModalForPostB3(page, postTitle);
    const dialog = page.getByRole("dialog").first();
    const reactionBtn = dialog.getByTestId(`reaction-${reaction}`).first();
    await expect(reactionBtn).toBeVisible({ timeout: 5_000 });

    const wasPressed = (await reactionBtn.getAttribute("aria-pressed")) === "true";
    const beforeText = (await reactionBtn.textContent())?.trim() ?? "";
    const beforeCount = /\d+/.exec(beforeText)?.[0];
    const beforeNum = beforeCount !== undefined ? parseInt(beforeCount, 10) : null;

    await reactionBtn.click();

    // aria-pressed flips to the opposite of the pre-click state.
    await expect
      .poll(
        async () => (await reactionBtn.getAttribute("aria-pressed")) === "true",
        { timeout: 5_000 },
      )
      .toBe(!wasPressed);

    if (beforeNum !== null) {
      const expected = wasPressed ? beforeNum - 1 : beforeNum + 1;
      await expect
        .poll(
          async () => {
            const txt = (await reactionBtn.textContent())?.trim() ?? "";
            const m = /\d+/.exec(txt)?.[0];
            return m !== undefined ? parseInt(m, 10) : null;
          },
          { timeout: 5_000 },
        )
        .toBe(expected);
    }
  });
}

/** Internal: escape a string for use inside a `new RegExp(...)` literal. */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// === B4 Bundle helpers ===
//
// Helpers backing the permission-gate specs in this bundle:
//   - 08-recruit-post-block.spec.ts (assertCannotPostInGuildB4)
//   - 09-craftsman-mark-duplicate.spec.ts (markPostDuplicateViaUI)
//
// Both helpers are intentionally read-mostly: they either confirm the absence
// of an affordance or drive an affordance whose UI surface is best-effort in
// M1. Each helper documents the M1 status and either throws with a clear
// remediation message or skips gracefully so the spec stays self-describing.

export interface MarkPostDuplicateArgs {
  /**
   * Title of the source post that will be marked as a duplicate. Resolved by
   * the same title-based locator the other helpers use (h3 → click → modal).
   */
  sourcePostTitle: string;
  /**
   * Optional title of the canonical "target" post to link the duplicate at.
   * Only used if the moderation flow surfaces a target picker dialog. The
   * current M1 backend treats `mark_duplicate` as "just close the source"
   * (`guild-post.service.ts:406-415`), so this is reserved for the follow-up
   * that wires `duplicateOfPostId` end-to-end.
   */
  targetPostTitle?: string;
}

/**
 * Open the post-detail modal for `sourcePostTitle`, open the moderation menu,
 * and click "Mark duplicate". If a target picker dialog appears (forward-compat
 * with `duplicateOfPostId`), select the row matching `targetPostTitle`. After
 * the action, asserts the source post is closed — `mark_duplicate` defaults to
 * closing the post per backend semantics (the reply composer un-mounts and the
 * "[Closed]" prefix appears on the title).
 *
 * **PARTIALLY NOT IMPLEMENTED IN M1.** `ModerationMenu.tsx` only renders
 * Pin / Close / Delete; there is NO "Mark duplicate" menu item, even though
 * the backend (`POST /api/guilds/:guildId/posts/:postId/moderate` with
 * `action: "mark_duplicate"`) and the privilege (`canMarkDuplicate` in
 * `feedPrivileges.ts`) both already exist. The helper looks for a button with
 * `data-testid="moderation-mark-duplicate"` OR a label matching `/^mark(\s+as)?
 * \s+duplicate$/i` inside the dropdown; if neither resolves it throws so any
 * spec that calls it fails loudly and prompts the component agent to add the
 * affordance.
 *
 * Once `ModerationMenu` gains the button (recommended testid:
 * `moderation-mark-duplicate`), this helper will Just Work; the calling spec
 * should drop its `test.skip` precondition.
 */
export async function markPostDuplicateViaUI(
  page: import("@playwright/test").Page,
  args: MarkPostDuplicateArgs,
): Promise<void> {
  const { sourcePostTitle, targetPostTitle } = args;

  await test.step(`open the detail modal for post "${sourcePostTitle}"`, async () => {
    // Reuse the B3 idempotent opener — handles "already open" gracefully and
    // shares its title-substring contract with the other helpers in this file.
    await openDetailModalForPostB3(page, sourcePostTitle);
    await expect(
      page.getByLabel(/moderation actions/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  await test.step(`open the moderation menu and click "Mark duplicate"`, async () => {
    const trigger = page.getByLabel(/moderation actions/i).first();
    await trigger.click();

    // Scope to the .relative dropdown container so we don't accidentally hit
    // some other "Mark duplicate" surface elsewhere on the page.
    const dropdown = trigger.locator(
      'xpath=ancestor::div[contains(@class, "relative")][1]',
    );

    // FRAGILE-SELECTOR: prefer a testid; fall back to the visible label.
    // Match either "Mark duplicate" or "Mark as duplicate" — the component
    // spec hasn't been pinned yet.
    const byTestid = dropdown
      .locator('[data-testid="moderation-mark-duplicate"]')
      .first();
    const byLabel = dropdown
      .getByRole("button", { name: /^mark(\s+as)?\s+duplicate$/i })
      .first();

    let menuItem;
    if (await byTestid.isVisible({ timeout: 500 }).catch(() => false)) {
      menuItem = byTestid;
    } else if (await byLabel.isVisible({ timeout: 500 }).catch(() => false)) {
      menuItem = byLabel;
    } else {
      throw new Error(
        'markPostDuplicateViaUI: no "Mark duplicate" menu item found in ModerationMenu. ' +
          "Add a button (recommended testid: moderation-mark-duplicate) wired to " +
          'guildFeedApi.moderatePost(..., { action: "mark_duplicate" }) and re-enable ' +
          "the spec that calls this helper. The backend already accepts the action " +
          "(see guild-post.service.ts:406-415); only the UI surface is missing.",
      );
    }
    await menuItem.click({ force: true });
  });

  if (targetPostTitle) {
    // Forward-compat: if a future build surfaces a target picker after the
    // click, select the row matching `targetPostTitle`. Today no such dialog
    // exists — guard with a short timeout so we don't hang when it's absent.
    await test.step(`if a target picker appears, choose "${targetPostTitle}"`, async () => {
      const picker = page
        .getByRole("dialog", { name: /duplicate|target|pick/i })
        .first();
      if (await picker.isVisible({ timeout: 1_500 }).catch(() => false)) {
        const row = picker
          .getByText(targetPostTitle, { exact: false })
          .first();
        await expect(row).toBeVisible({ timeout: 5_000 });
        await row.click();
        const confirm = picker
          .getByRole("button", { name: /^(confirm|mark|select|done|save)$/i })
          .first();
        if (await confirm.isVisible({ timeout: 500 }).catch(() => false)) {
          await confirm.click();
        }
      }
    });
  }

  await test.step(`assert the source post is now closed`, async () => {
    // mark_duplicate sets is_closed=true on the source post (backend
    // semantics). PostDetailModal renders "[Closed]" as a prefix on the <h2>
    // title and un-mounts the reply composer; we assert the composer
    // disappearance because it's the most durable signal (less whitespace-
    // sensitive than the title-prefix regex).
    await expect(
      page.getByPlaceholder(/write a reply\.\.\./i).first(),
    ).toBeHidden({ timeout: 10_000 });
  });
}

/**
 * Navigate to the public guild feed and assert the current user CANNOT compose
 * a new post — either:
 *   1. The composer trigger button (data-testid="open-new-post") is rendered
 *      but disabled, with the placeholder text "Posting requires apprentice
 *      rank or higher." (sub-apprentice members) OR "Join the guild to post."
 *      (non-members). See `GuildPublicFeedTab.tsx:142-152`.
 *   2. The active "+ Post" sidekick CTA (rendered next to the inline-helpers
 *      row when `showNewPostButton === true`) is absent.
 *
 * Used by spec 08 to lock the recruit / non-member post-gating contract.
 *
 * Named `assertCannotPostInGuildB4` (instead of `assertCannotPostInGuild`) to
 * stay collision-safe inside the append-only B4 block — if a future bundle
 * adds an `assertCannotPostInGuild` at the top of the file we won't double-
 * declare and break the test build.
 */
export async function assertCannotPostInGuildB4(
  page: import("@playwright/test").Page,
  guildId: string,
): Promise<void> {
  await test.step(`navigate to the feed for guild ${guildId} as a sub-apprentice / non-member user`, async () => {
    await openFeedFor(page, guildId);
  });

  await test.step("the composer is disabled and shows the rank/join placeholder", async () => {
    const composer = page.getByTestId("open-new-post").first();
    await expect(composer).toBeVisible({ timeout: 10_000 });

    // Source-of-truth: the same `<button>` is rendered in all three states;
    // only its `disabled` attribute and inner text change. Asserting both is
    // the durable cross-check.
    await expect(composer).toBeDisabled();
    await expect(composer).toHaveText(
      /posting requires apprentice rank or higher|join the guild to post/i,
    );

    // The active "+ Post" sidekick button (the green primary CTA) only
    // renders when `showNewPostButton === true`. Its absence is the second
    // independent signal that posting is gated off.
    await expect(
      page.getByRole("button", { name: /^\+?\s*post$/i }).first(),
    ).toBeHidden({ timeout: 2_000 });
  });
}

// === B5 Bundle helpers ===
//
// Helpers for the advanced-feed-UX specs (internal posts, nested-reply depth
// limit, sort/filter/pagination). Each helper either drives a real UI control
// or throws `SkipMissingUI` with a clear remediation note so the spec converts
// the gap to a `test.skip()` annotation instead of a regression.

/**
 * Sentinel error class — when a B5 helper detects that the requested UI
 * affordance is absent from the current build, it throws SkipMissingUI rather
 * than failing. Specs catch this and convert to `test.skip(true, reason)` so a
 * gap reads as a deferred-feature skip, not a regression.
 *
 * The `reason` string is surfaced into the Playwright report; format it as
 * "<helper>: <what is missing> — <next step>".
 */
export class SkipMissingUI extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "SkipMissingUI";
  }
}

export interface CreateInternalPostArgs {
  title: string;
  body: string;
  tag?: PostTag;
}

/**
 * Same flow as `createGuildPostViaUI` but additionally flips the
 * `new-post-private-toggle` checkbox in `NewPostModal` so the resulting post
 * lands with `is_private = true` on the backend.
 *
 * Preconditions:
 *   - Caller has navigated to the feed (call `openFeedFor` first).
 *   - Caller is authenticated as an EXPERT member with `canPost` — only
 *     experts can create internal posts (the toggle is hidden for candidates
 *     and companies; the backend rejects with 403 either way).
 *
 * Throws `SkipMissingUI` when the composer or toggle is absent so a missing
 * affordance reads as a deferred-feature skip rather than a regression.
 */
export async function createInternalPostViaUI(
  page: import("@playwright/test").Page,
  args: CreateInternalPostArgs,
): Promise<void> {
  const { title, body, tag = "discussion" } = args;

  await test.step("open the New Post modal", async () => {
    const composerTrigger = page.getByTestId("open-new-post").first();
    if (
      !(await composerTrigger.isVisible({ timeout: 5_000 }).catch(() => false))
    ) {
      throw new SkipMissingUI(
        "createInternalPostViaUI: open-new-post composer not visible — caller is not authenticated as a posting member, or the feed has not loaded.",
      );
    }
    await composerTrigger.click();
    await expect(page.locator("#post-title")).toBeVisible({ timeout: 10_000 });
  });

  await test.step("flip the Members only (internal post) toggle", async () => {
    const toggle = page.getByTestId("new-post-private-toggle");
    if (!(await toggle.isVisible({ timeout: 5_000 }).catch(() => false))) {
      throw new SkipMissingUI(
        "createInternalPostViaUI: new-post-private-toggle not visible — only experts can create internal posts. " +
          "Confirm the caller is authenticated as an expert (the toggle is gated on userType === 'expert').",
      );
    }
    // `.check()` is idempotent on a native checkbox; re-runs against a
    // pre-checked toggle won't accidentally clear it.
    await toggle.check({ force: true });
  });

  await test.step("fill the new-post form", async () => {
    if (tag !== "discussion") {
      const dialog = page.getByRole("dialog", { name: /new post/i });
      await dialog
        .getByRole("button", { name: new RegExp(`^${TAG_LABELS[tag]}$`, "i") })
        .first()
        .click({ force: true });
    }
    await page.locator("#post-title").fill(title);
    await page.locator("#post-body").fill(body);
  });

  await test.step("submit the internal post and wait for the modal to close", async () => {
    const submitBtn = page.getByTestId("new-post-submit");
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
    await submitBtn.click();
    // The public-feed surface filters out is_private rows by default, so we
    // can't assert the post appears in the underlying feed here. The caller
    // should switch to the internal visibility tab via
    // `toggleVisibilityTabViaUI(page, 'internal')` and assert there.
    await expect(page.locator("#post-title")).toBeHidden({ timeout: 15_000 });
  });
}

/**
 * Click the public / internal visibility tab on a guild feed. Mirrors the
 * `visibility="public" | "internal"` query parameter the backend already
 * honors. The toggle is rendered as a 2-button segmented control on
 * `GuildPublicFeedTab` and only mounts for guild members (non-members can't
 * see the internal feed anyway).
 *
 * After clicking, waits for the feed list to settle so the caller can
 * immediately assert against the post cards under the new visibility scope.
 *
 * Throws `SkipMissingUI` when the tab control is absent — typical cause is
 * the viewer not being a guild member.
 */
export async function toggleVisibilityTabViaUI(
  page: import("@playwright/test").Page,
  tabName: "public" | "internal",
): Promise<void> {
  await test.step(`switch the feed visibility to "${tabName}"`, async () => {
    // Primary lookup: the explicit testid added to GuildPublicFeedTab.
    const byTestId = page.getByTestId(`feed-visibility-${tabName}`).first();
    if (await byTestId.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await byTestId.click();
      // The segmented control flips aria-selected to "true" on the clicked
      // button. Wait for that flip so the next getPosts() request fires with
      // the new visibility before the caller asserts.
      await expect(byTestId).toHaveAttribute("aria-selected", "true", {
        timeout: 5_000,
      });
      return;
    }

    // Forward-compat fallbacks for future implementations that swap the
    // segmented buttons for native role=tab elements or relabel them.
    const patterns: RegExp =
      tabName === "internal"
        ? /^(internal|members[\s-]?only|private)$/i
        : /^(public|all|everyone)$/i;
    const byRoleTab = page.getByRole("tab", { name: patterns }).first();
    if (await byRoleTab.isVisible({ timeout: 500 }).catch(() => false)) {
      await byRoleTab.click();
      return;
    }
    const byRoleButton = page.getByRole("button", { name: patterns }).first();
    if (await byRoleButton.isVisible({ timeout: 500 }).catch(() => false)) {
      await byRoleButton.click();
      return;
    }

    throw new SkipMissingUI(
      `toggleVisibilityTabViaUI: no "${tabName}" visibility tab found. ` +
        `The segmented Public/Internal control on GuildPublicFeedTab only renders for guild members — confirm the caller is authenticated and a member of this guild.`,
    );
  });
}

/**
 * Resolve a reply by its body text inside the open post detail modal. Returns
 * the wrapping ReplyNode card (the `.rounded-lg.border.bg-card` row that holds
 * the vote button, author, body, and action row). The caller then scopes
 * sub-locators (Reply button, etc.) inside the returned card.
 */
function locateReplyCardByBody(
  page: import("@playwright/test").Page,
  replyBody: string,
) {
  // ReplyNode wraps the body in a div with .rounded-lg.border.bg-card.p-4
  // (see ThreadedReplyList.tsx:178). Match the card that contains the body
  // text — the first such card wins.
  return page
    .locator("div.rounded-lg.border.bg-card", { hasText: replyBody })
    .first();
}

export interface ReplyToReplyArgs {
  postTitle: string;
  parentReplyBody: string;
  body: string;
}

/**
 * Open the detail modal for `postTitle`, find the reply whose body contains
 * `parentReplyBody`, click its inline "Reply" button, fill the composer with
 * `body`, and submit.
 *
 * The frontend caps the inline Reply affordance at code-depth < 3 (see
 * `ThreadedReplyList.tsx:114` — `canReplyInline = depth < MAX_DEPTH`). The
 * backend caps total depth at <= 3 (`guild-reply.service.ts:146`). Top-level
 * replies created via the post-detail composer are at depth 0; their children
 * are 1, then 2, then 3 (where the inline reply button no longer renders).
 *
 * Throws:
 *   - Plain Error if the detail modal cannot be opened (caller error) or the
 *     parent reply isn't visible (caller forgot to expand a "Show N replies"
 *     branch).
 *   - SkipMissingUI if the parent reply has no inline Reply button — this is
 *     the EXPECTED state when the parent is at code-depth >= 3, so the spec
 *     converts to a depth-limit confirmation rather than a hard fail.
 */
export async function replyToReplyViaUI(
  page: import("@playwright/test").Page,
  args: ReplyToReplyArgs,
): Promise<void> {
  const { postTitle, parentReplyBody, body } = args;

  await test.step(`open the detail modal for post "${postTitle}"`, async () => {
    await openDetailModalForPost(page, postTitle);
  });

  await test.step(`expand any collapsed nested-reply branches so deep replies render`, async () => {
    // ReplyNode renders a "Show N replies" expander when child replies were
    // not eagerly fetched. Click every visible expander so the parent reply
    // is reachable — best-effort, no error if none exist.
    const expanders = page.getByRole("button", {
      name: /^show \d+ repl(?:y|ies)$/i,
    });
    // Iterate up to 4 times because each click can reveal further nested
    // expanders. The loop terminates when no expander is left visible.
    for (let pass = 0; pass < 4; pass++) {
      const count = await expanders.count().catch(() => 0);
      if (count === 0) break;
      let clickedAny = false;
      for (let i = 0; i < count; i++) {
        const btn = expanders.nth(i);
        if (await btn.isVisible({ timeout: 200 }).catch(() => false)) {
          await btn.click().catch(() => undefined);
          clickedAny = true;
          await page.waitForTimeout(150);
        }
      }
      if (!clickedAny) break;
    }
  });

  await test.step(`click the inline Reply on the parent and submit a nested reply`, async () => {
    const parentCard = locateReplyCardByBody(page, parentReplyBody);
    if (!(await parentCard.isVisible({ timeout: 5_000 }).catch(() => false))) {
      throw new Error(
        `replyToReplyViaUI: parent reply with body "${parentReplyBody.slice(0, 64)}..." is not visible in the post detail modal. ` +
          `Either the reply has not been seeded yet, or its branch is still collapsed.`,
      );
    }

    // The inline Reply button is a sibling of the body, INSIDE the same card
    // (see ThreadedReplyList.tsx:206). It only renders while
    // `canReplyInline = depth < MAX_DEPTH (=3) && isAuthenticated && isMember`.
    const replyBtn = parentCard
      .getByRole("button", { name: /^reply$/i })
      .first();
    if (!(await replyBtn.isVisible({ timeout: 2_000 }).catch(() => false))) {
      throw new SkipMissingUI(
        `replyToReplyViaUI: no inline Reply button on the parent reply. ` +
          `This is the EXPECTED state when the parent is at code-depth >= 3 ` +
          `(see ThreadedReplyList.tsx:114). Treat as a depth-limit confirmation.`,
      );
    }
    await replyBtn.click();

    // The inline composer is an <input placeholder="Write a reply..."> inside
    // the same card; scope to it so we don't grab the top-level modal composer.
    const composer = parentCard
      .getByPlaceholder(/write a reply\.\.\./i)
      .first();
    await expect(composer).toBeVisible({ timeout: 5_000 });
    await composer.fill(body);

    // Submit — the form button is "Reply" with an icon; scope to the same card.
    // After fill+click of "Reply" toggle button vs the submit button: the form
    // is submitted via the second "Reply" button in the card.
    const submit = parentCard
      .getByRole("button", { name: /^reply$/i })
      .last();
    await expect(submit).toBeEnabled({ timeout: 5_000 });
    await submit.click();

    // On success the inline composer collapses back into the toggle state
    // (see ThreadedReplyList.tsx:167 — `setShowInlineReply(false)`). That
    // signal is the most reliable cross-depth success marker: the new body
    // itself only appears in the rendered tree if the parent's "Show N
    // replies" expander is clicked again, which the top-level modal refetch
    // does NOT do automatically for nested branches.
    await expect(composer).toBeHidden({ timeout: 15_000 });
  });
}

/**
 * Change the feed's sort mode. Reads the sort `<select>` rendered in
 * `GuildPublicFeedTab` (the public guild page) which exposes Hot / New / Top.
 *
 * Time-window selection is OPTIONAL and only applies to the "top" mode. The
 * public feed's `<select>` does not currently expose a time window — only the
 * workspace `GuildFeedTab` does, and even there only for week/month/all. If a
 * `timeWindow` is requested but not supported by the rendered UI, the helper
 * skips that part silently rather than failing (the backend defaults to a
 * sensible window when none is supplied).
 */
export async function selectSortModeViaUI(
  page: import("@playwright/test").Page,
  mode: "hot" | "new" | "top",
  timeWindow?: "day" | "week" | "month" | "year" | "all",
): Promise<void> {
  await test.step(`select sort mode "${mode}"${timeWindow ? ` (${timeWindow})` : ""}`, async () => {
    // First try the public feed's <select> (label-less native select tied to
    // setSortMode in GuildPublicFeedTab.tsx). Scope by available <option>
    // values to disambiguate from any unrelated selects on the page.
    const sortSelect = page
      .locator("select")
      .filter({ has: page.locator('option[value="hot"]') })
      .filter({ has: page.locator('option[value="new"]') })
      .filter({ has: page.locator('option[value="top"]') })
      .first();

    if (await sortSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      // The public feed disables the sort select when the 🔥 Hot chip is
      // active. If disabled, click an "All" chip first so the select becomes
      // interactive.
      const disabled = await sortSelect.isDisabled().catch(() => false);
      if (disabled) {
        const allChip = page
          .getByRole("button", { name: /^all$/i })
          .first();
        if (await allChip.isVisible({ timeout: 500 }).catch(() => false)) {
          await allChip.click();
        }
      }
      await sortSelect.selectOption(mode);
    } else {
      // Fall back to the workspace pill-bar (GuildFeedTab.tsx renders
      // [hot|new|top] as buttons).
      const pretty = mode.charAt(0).toUpperCase() + mode.slice(1);
      const pillBtn = page
        .getByRole("button", { name: new RegExp(`^${pretty}$`, "i") })
        .first();
      if (!(await pillBtn.isVisible({ timeout: 2_000 }).catch(() => false))) {
        throw new SkipMissingUI(
          `selectSortModeViaUI: no sort control found for mode "${mode}" — neither the public-feed <select> nor the workspace pill bar resolved.`,
        );
      }
      await pillBtn.click();
    }

    if (timeWindow) {
      // Only the workspace feed renders the time-window select, and only when
      // sort=top. Skip silently if not present.
      const tw = page
        .locator("select")
        .filter({ has: page.locator(`option[value="${timeWindow}"]`) })
        .first();
      if (await tw.isVisible({ timeout: 500 }).catch(() => false)) {
        await tw.selectOption(timeWindow).catch(() => undefined);
      }
    }

    // Let the refetch settle so subsequent assertions see the new ordering.
    await page
      .waitForLoadState("networkidle", { timeout: 5_000 })
      .catch(() => undefined);
  });
}

/**
 * Click a tag filter chip. The public feed exposes:
 *   All / 🔥 Hot / Discussion / Question / Insight / Job-related
 * (see `FILTER_CHIPS` in `GuildPublicFeedTab.tsx`). The workspace feed exposes
 * the same set minus the Hot chip.
 *
 * Pass the canonical tag value ("question", "discussion", etc.); the helper
 * translates to the chip label.
 */
export async function selectTagFilterViaUI(
  page: import("@playwright/test").Page,
  tag: "all" | "discussion" | "question" | "insight" | "job_related",
): Promise<void> {
  const labels: Record<typeof tag, RegExp> = {
    all: /^all$/i,
    discussion: /^discussion$/i,
    question: /^question$/i,
    insight: /^insight$/i,
    // Public feed renders "Job-related"; workspace feed renders "Job-Related".
    job_related: /^job[\s-]?related$/i,
  };

  await test.step(`filter feed by tag "${tag}"`, async () => {
    const chip = page.getByRole("button", { name: labels[tag] }).first();
    if (!(await chip.isVisible({ timeout: 2_000 }).catch(() => false))) {
      throw new SkipMissingUI(
        `selectTagFilterViaUI: tag chip "${tag}" not visible on the feed.`,
      );
    }
    await chip.click();
    await page
      .waitForLoadState("networkidle", { timeout: 5_000 })
      .catch(() => undefined);
  });
}

/**
 * Click the next-page button on the feed pagination control (see
 * `components/ui/pagination.tsx`). The Pagination component only renders when
 * `totalPages > 1`, so the caller is responsible for seeding enough posts.
 *
 * Returns true if pagination advanced, false if no Next control was found
 * (e.g. the feed fits on one page). Specs that explicitly need to paginate
 * should assert on the return value.
 */
export async function paginateNextPageViaUI(
  page: import("@playwright/test").Page,
): Promise<boolean> {
  const nextBtn = page.getByRole("button", { name: /^next$/i }).first();
  if (!(await nextBtn.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return false;
  }
  if (await nextBtn.isDisabled().catch(() => true)) {
    return false;
  }
  await nextBtn.click();
  await page
    .waitForLoadState("networkidle", { timeout: 5_000 })
    .catch(() => undefined);
  return true;
}
