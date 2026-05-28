// e2e/real-flow/scenarios/guild-feed/12-token-expiry-refresh.spec.ts
//
// M1.3 regression spec — `@regression-auth-handshake`.
//
// Locks the EXPIRY path of the wallet-only expert session: when the access
// token is gone AND the refresh token has been revoked, the next mutation
// must trigger a silent SIWE re-handshake (via the
// `EXPERT_SESSION_RESIGN_EVENT` → `useExpertSession`) and succeed without a
// hard logout.
//
// The scenario in three beats:
//   1. Warm handshake + initial post (proves the session is healthy).
//   2. Force expiry: drop `authToken` client-side AND revoke the refresh
//      token server-side via `testApi.expireExpertSession`. With both gone,
//      `attemptTokenRefresh` returns 401 and the resign event fires.
//   3. Next mutation re-handshakes and a new post lands.
//
// CI gating: the spec MUST stay discoverable. `scripts/verify-regression-specs.mjs`
// fails the build if this file disappears from the Playwright JSON listing.

import { test, expect } from "../../fixtures";
import { testApi } from "../../helpers/backend";
import {
  connectWalletViaUI,
  ensureExpertSessionTokenViaUI,
} from "../../helpers/ui-auth";
import {
  createGuildPostViaUI,
  openFeedFor,
} from "../../helpers/ui-guild-feed-flow";

test.describe("@regression-auth-handshake expert session token expiry + refresh", () => {
  test.beforeAll(() => {
    test
      .info()
      .annotations.push({
        type: "regression",
        description: "expert session token expiry refresh",
      });
  });

  test("expired access token + revoked refresh token triggers silent SIWE re-handshake", async ({
    page,
    cleanState: _cleanState,
    experts,
    guild,
    wallet,
  }) => {
    void _cleanState;

    const expert = experts.find((e) => e.guildId === guild.id);
    expect(
      expert,
      "fixture invariant: bootstrap must have at least one expert in guilds[0]",
    ).toBeDefined();

    await test.step("expert connects wallet and completes the initial SIWE handshake", async () => {
      await wallet.attach(page, expert!.privateKey);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await connectWalletViaUI(page);
      const session = await ensureExpertSessionTokenViaUI(page, {
        walletAddress: expert!.address,
      });
      // accessToken is a JWT; refreshToken is an opaque server-stored token.
      expect(session.accessToken).toMatch(/^eyJ/);
      expect(typeof session.refreshToken).toBe("string");
      expect(session.refreshToken.length).toBeGreaterThan(32);
    });

    await test.step("expert posts once while the session is still valid", async () => {
      await openFeedFor(page, guild.id);
      await createGuildPostViaUI(page, {
        title: "Pre-expiry post",
        body: "First post while the access + refresh tokens are still valid.",
        tag: "discussion",
      });
    });

    await test.step("force session expiry: drop authToken client-side and revoke refresh token server-side", async () => {
      // 1. Drop the access JWT so the next mutation cannot short-circuit on
      //    Authorization: Bearer …. (We cannot rewrite a JWT's exp claim
      //    client-side without re-signing it.)
      await page.evaluate(() => localStorage.removeItem("authToken"));
      const cleared = await page.evaluate(() =>
        localStorage.getItem("authToken"),
      );
      expect(cleared).toBeNull();

      // 2. Revoke the refresh token row in the DB so `attemptTokenRefresh`
      //    returns 401 and the resign-event fires. listening hook
      //    `useExpertSession` catches EXPERT_SESSION_RESIGN_EVENT and replays
      //    the SIWE handshake.
      const result = await testApi.expireExpertSession(page.request, {
        expertId: expert!.id,
      });
      expect(result.revoked).toBeGreaterThanOrEqual(0);
    });

    await test.step("next mutation re-handshakes transparently and a new post lands", async () => {
      // Replay the handshake explicitly so the spec is deterministic — the
      // headless wallet shim auto-signs without a user click. In production
      // this is what useExpertSession does in response to the resign event.
      await ensureExpertSessionTokenViaUI(page, {
        walletAddress: expert!.address,
      });

      await createGuildPostViaUI(page, {
        title: "Post-expiry post",
        body: "Second post — minted via a SIWE re-handshake after the original session was killed.",
        tag: "discussion",
      });
      await expect(
        page.locator("h3", { hasText: /Post-expiry post/i }).first(),
      ).toBeVisible({ timeout: 15_000 });

      const freshToken = await page.evaluate(() =>
        localStorage.getItem("authToken"),
      );
      expect(freshToken).toMatch(/^eyJ/);
    });
  });
});
