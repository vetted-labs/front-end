// Phase 1 of the full-stack UI rewrite: expert SIWE login via the real UI.
//
// Establishes the canonical pattern for any subsequent expert-authed test:
//   1. attach the headless wallet to the page with an expert's key
//   2. loginAsExpertViaUI() — navigates to /auth/login?type=expert,
//      connects via wagmi's injected connector (= our shim), waits for
//      the auto-redirect to /expert/dashboard
//   3. perform expert actions; useAccount() now returns the expert's
//      address and any writeContractAsync call signs through the shim

import { test, expect } from "../fixtures";
import { loginAsExpertViaUI, readWagmiAddress } from "../helpers/ui-auth";

test.beforeEach(async ({ context }) => {
  // Wagmi persists connection hints in cookieStorage; clear between tests so
  // each starts from a clean session.
  await context.clearCookies();
});

test("expert connects wallet → auto-login → lands on dashboard", async ({
  page,
  experts,
  wallet,
  cleanState: _cleanState,
}) => {
  const expert = experts[0];

  await wallet.attach(page, expert.privateKey);
  await loginAsExpertViaUI(page, expert.address);

  // We're on the expert dashboard. Verify wagmi knows about us + the URL
  // matches + something dashboard-y rendered.
  expect(page.url()).toMatch(/\/expert\/dashboard/);
  expect((await readWagmiAddress(page))?.toLowerCase()).toBe(
    expert.address.toLowerCase(),
  );

  // Sanity check: the expert layout includes the address chip or a logout
  // affordance. Look for either — copy may shift over time.
  await expect(
    page
      .getByRole("button", { name: /log\s*out|disconnect/i })
      .or(
        page.getByText(
          new RegExp(`${expert.address.slice(0, 6)}.{0,5}${expert.address.slice(-4)}`, "i"),
        ),
      )
      .first(),
  ).toBeVisible({ timeout: 15_000 });
});

test("two experts can log in sequentially with different identities", async ({
  page,
  experts,
  wallet,
  cleanState: _cleanState,
}) => {
  const [expertA, expertB] = experts;

  // First expert
  const handle = await wallet.attach(page, expertA.privateKey);
  await loginAsExpertViaUI(page, expertA.address);
  expect((await readWagmiAddress(page))?.toLowerCase()).toBe(
    expertA.address.toLowerCase(),
  );

  // Switch identity and re-login. Clear cookies so the fresh session
  // doesn't auto-restore the previous expert.
  await page.context().clearCookies();
  await handle.switchAccount(expertB.privateKey);
  await loginAsExpertViaUI(page, expertB.address);

  expect((await readWagmiAddress(page))?.toLowerCase()).toBe(
    expertB.address.toLowerCase(),
  );
});
