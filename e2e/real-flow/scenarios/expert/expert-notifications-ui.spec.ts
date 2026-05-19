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

  // Find notification buttons (they have the left stripe and contain a dismiss button).
  const notifications = page.locator('button').filter({
    has: page.locator('div.absolute.left-0'),
  });
  await expect(notifications).toHaveCount(2);

  // Hover over the first notification to reveal the dismiss button.
  const firstNotification = notifications.first();
  await firstNotification.hover();

  // Click the dismiss button (div with role="button" containing X icon).
  const dismissButton = firstNotification.locator('div[role="button"][aria-label="Mark as read"]');
  await dismissButton.click();

  // Wait for the notification to be dismissed and recount.
  await expect(notifications).toHaveCount(1);
});
