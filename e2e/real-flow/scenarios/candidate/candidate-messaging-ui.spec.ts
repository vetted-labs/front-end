// e2e/real-flow/scenarios/candidate/candidate-messaging-ui.spec.ts
//
// Task F1 — candidate replies in a messaging thread and verifies persistence.
//
// NOTE: testApi.seedMessageThread is a stub — failure expected until BE lands
// the endpoint POST /api/test/seed/message-thread (track as DIV-XXX).
//
// Flow:
//   1. Sign up a fresh candidate (API-backed, no UI form).
//   2. Seed a message thread between the candidate and a recruiter via the test API.
//   3. Navigate to /candidate/messages and assert the thread is visible.
//   4. Click the thread to open the conversation panel.
//   5. Assert the initial recruiter message is visible.
//   6. Type and send a reply from the candidate.
//   7. Assert the reply appears in the thread.
//   8. Reload the page and assert the reply persists.
//
// On-persistence invariant: the message round-trip (POST + store + GET) is
// covered by the backend's messaging service. This test verifies the FE
// renders seeded threads and poll-updates correctly.

import { test, expect } from "../../fixtures";
import { signupCandidate } from "../../../helpers/auth";
import { testApi } from "../../helpers/backend";

test(
  "candidate replies in a thread and the message persists across reload",
  async ({ page, request, cleanState: _cleanState }) => {
    void _cleanState;

    // ── 1. Sign up a fresh candidate ────────────────────────────────────────
    const creds = await signupCandidate(page);

    // ── 2. Seed a message thread (stub until BE wires the endpoint) ───────────
    let thread: Awaited<ReturnType<typeof testApi.seedMessageThread>>;

    await test.step(
      "seed a message thread between candidate and recruiter via test API",
      async () => {
        try {
          thread = await testApi.seedMessageThread(request, {
            candidateEmail: creds.email,
            recruiterName: "Sam Recruiter",
            initialBody: "Hi! Are you open to chat next week?",
          });
        } catch (error) {
          throw new Error(
            `Failed to seed message thread — POST /api/test/seed/message-thread not yet wired on backend. ${error}`,
          );
        }
      },
    );

    // ── 3. Navigate to /candidate/messages and assert thread is visible ──────
    await test.step("navigate to messages page and assert thread appears", async () => {
      await page.goto("/candidate/messages", {
        waitUntil: "domcontentloaded",
      });

      // The conversation list on the left shows recruiter name (company name
      // comes from the thread seed data). Look for "Sam Recruiter".
      await expect(
        page.getByText(/sam recruiter/i),
      ).toBeVisible({ timeout: 15_000 });
    });

    // ── 4. Click the thread to open the conversation panel ───────────────────
    await test.step("click the thread to open the conversation", async () => {
      await page.getByText(/sam recruiter/i).click();

      // Once opened, the right pane (lg+) renders the conversation header
      // with the recruiter name + the message thread below.
      await expect(
        page.getByText(/sam recruiter/i),
      ).toBeVisible({ timeout: 15_000 });
    });

    // ── 5. Assert the initial recruiter message is visible ────────────────────
    await test.step("assert the initial recruiter message is visible", async () => {
      await expect(
        page.getByText(/open to chat/i),
      ).toBeVisible({ timeout: 15_000 });
    });

    // ── 6. Type and send a reply from the candidate ─────────────────────────
    await test.step("candidate types and sends a reply", async () => {
      const messageInput = page.getByRole("textbox", { name: /message/i });
      await messageInput.waitFor({ state: "visible", timeout: 15_000 });
      await messageInput.fill("Yes — Tuesday works.");

      const sendButton = page.getByRole("button", { name: /send/i });
      await sendButton.click();

      // Allow a brief moment for the message to appear in the thread.
      // The FE's handleSendMessage callback appends to the messages array
      // and the ConversationThread re-renders.
      await page.waitForTimeout(500);
    });

    // ── 7. Assert the reply appears in the thread ──────────────────────────
    await test.step("assert the candidate reply appears in the thread", async () => {
      await expect(
        page.getByText(/Tuesday works/i),
      ).toBeVisible({ timeout: 15_000 });
    });

    // ── 8. Reload the page and assert the reply persists ────────────────────
    await test.step("reload and verify the reply persists", async () => {
      await page.reload({ waitUntil: "domcontentloaded" });

      // Re-open the conversation (it may not be selected after reload).
      const threadRow = page.getByText(/sam recruiter/i).first();
      await threadRow.waitFor({ state: "visible", timeout: 15_000 });
      await threadRow.click();

      // Assert both the original message and the candidate reply are visible.
      await expect(
        page.getByText(/open to chat/i),
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        page.getByText(/Tuesday works/i),
      ).toBeVisible({ timeout: 15_000 });
    });
  },
);
