import { test, expect } from "../../fixtures";
import { loginAsExpertViaUI } from "../../helpers/ui-auth";
import { testApi } from "../../helpers/backend";

test("expert dismisses a notification and the count drops", async ({
  page,
  cleanState: _cleanState,
  experts,
  wallet,
}) => {
  // NOTE: testApi.seedExpertNotifications stub — failure expected until BE lands endpoint.
  const [expert] = experts;
  await testApi.seedExpertNotifications(page.request, {
    expertId: expert.id,
    items: [
      { type: "review_assigned", body: "New candidate assigned." },
      { type: "reward_available", body: "You have 100 VTTD to claim." },
    ],
  });

  void _cleanState;

  await wallet.attach(page, expert.privateKey);
  await loginAsExpertViaUI(page, expert.address);
  await page.goto("/expert/notifications", { waitUntil: "domcontentloaded" });

  // Each notification row is a `<button class="group ...">` in the shared
  // NotificationsShell. Both seeded notifications start unread.
  const notifications = page.locator("button.group");
  await expect(notifications).toHaveCount(2, { timeout: 15_000 });

  // The "Unread" filter tab carries a count badge; it should read "2" before
  // any are dismissed.
  const unreadTab = page.getByRole("button", { name: /^Unread/ });
  await expect(unreadTab.locator("span").first()).toHaveText("2", {
    timeout: 15_000,
  });

  // Hover the first row to reveal its inline "Mark as read" affordance, then
  // dismiss it (marks read without navigating).
  const firstNotification = notifications.first();
  await firstNotification.hover();
  await firstNotification
    .locator('div[role="button"][aria-label="Mark as read"]')
    .click();

  // The dismissed notification is now read, so the Unread count drops to "1".
  await expect(unreadTab.locator("span").first()).toHaveText("1", {
    timeout: 15_000,
  });

  // And under the Unread filter, only the one remaining unread row is shown.
  await unreadTab.click();
  await expect(notifications).toHaveCount(1, { timeout: 15_000 });
});
