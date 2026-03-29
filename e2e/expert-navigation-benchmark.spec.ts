import { test, expect, Page } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import {
  setupCommonExpertMocks,
  MOCK_EXPERT_PROFILE,
  MOCK_EARNINGS_BREAKDOWN,
  MOCK_REPUTATION_TIMELINE,
  MOCK_GUILD,
  MOCK_APPLICATION_ACTIVE,
} from "./helpers/guild-mocks";

/* ───────────────────────────────────────────────────────────
 * Expert Navigation Performance Benchmark
 *
 * Measures page.goto → content visible for every expert page.
 * Run:  npx playwright test e2e/expert-navigation-benchmark.spec.ts
 * ─────────────────────────────────────────────────────────── */

interface RouteConfig {
  name: string;
  href: string;
  /** Multiple possible content texts — first match wins (some pages show wallet-required state) */
  contentTexts: string[];
}

interface BenchmarkResult {
  route: string;
  href: string;
  navToCommitMs: number;
  commitToContentMs: number;
  totalMs: number;
  contentFound: string;
  apiCalls: number;
  apiEndpoints: string[];
  domNodes: number;
  errors: string[];
}

const ROUTES: RouteConfig[] = [
  {
    name: "Dashboard",
    href: "/expert/dashboard",
    contentTexts: ["Dashboard", "Loading"],
  },
  {
    name: "Notifications",
    href: "/expert/notifications",
    contentTexts: ["Notifications"],
  },
  {
    name: "Applications",
    href: "/expert/voting",
    contentTexts: ["Reviews", "Connect your wallet"],
  },
  {
    name: "Endorsements",
    href: "/expert/endorsements",
    contentTexts: ["Endorsement Marketplace"],
  },
  {
    name: "My Guilds",
    href: "/expert/guilds",
    contentTexts: ["My Guilds", "No profile data"],
  },
  {
    name: "Guild Ranks",
    href: "/expert/guild-ranks",
    contentTexts: ["Advance Your Guild Rank", "Wallet not connected"],
  },
  {
    name: "Proposals",
    href: "/expert/governance",
    contentTexts: ["Shape the", "Protocol"],
  },
  {
    name: "Earnings",
    href: "/expert/earnings",
    contentTexts: ["Earnings", "Connect your wallet"],
  },
  {
    name: "Reputation",
    href: "/expert/reputation",
    contentTexts: ["Reputation Score", "Connect your wallet"],
  },
  {
    name: "Leaderboard",
    href: "/expert/leaderboard",
    contentTexts: ["Leaderboard"],
  },
  {
    name: "Withdrawals",
    href: "/expert/withdrawals",
    contentTexts: ["Staking Portfolio", "Wallet Not Connected"],
  },
];

async function setupAllMocks(page: Page) {
  await setupCommonExpertMocks(page);

  await page.route("**/api/governance/proposals**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) }));

  await page.route("**/api/guilds", (route) => {
    if (route.request().url().includes("/guilds/")) return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [MOCK_GUILD] }) });
  });

  await page.route("**/api/experts/earnings/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: MOCK_EARNINGS_BREAKDOWN }) }));

  await page.route("**/api/experts/reputation/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: MOCK_REPUTATION_TIMELINE }) }));

  await page.route("**/api/experts/leaderboard**", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          experts: [{ id: "exp-1", fullName: "Top Expert", walletAddress: "0xabc", reputation: 500, reviewCount: 50, totalEarnings: 200, approvalCount: 45, rejectionCount: 5 }],
          stats: { totalExperts: 1, avgReviews: 50, topEarnings: 200, totalEarnings: 200 },
        },
      }),
    }));

  await page.route("**/api/proposals/assigned/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) }));

  await page.route("**/api/proposals/guild/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [MOCK_APPLICATION_ACTIVE] }) }));

  await page.route("**/api/blockchain/staking/sync", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: {} }) }));

  await page.route("**/api/endorsements**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { data: [], total: 0 } }) }));

  await page.route("**/api/blockchain/reputation/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { reputation: 350 } }) }));

  await page.route("**/api/experts/guilds/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { ...MOCK_GUILD, guildApplications: [MOCK_APPLICATION_ACTIVE] } }) }));

  await page.route("**/api/guilds/*/candidate-applications**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) }));

  await page.route("**/api/blockchain/endorsements/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) }));

  await page.route("**/api/blockchain/staking/unstake/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { hasRequest: false } }) }));

  await page.route("**/api/endorsements/given**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) }));

  // Catch-all for unmatched API calls
  await page.route("**/api/**", (route) => {
    const url = route.request().url();
    if (url.includes("/_next/")) return route.fallback();
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
  });
}

test.describe("Expert Navigation Benchmark", () => {
  test("measure all expert page navigations", async ({ page }) => {
    test.setTimeout(180_000);

    const results: BenchmarkResult[] = [];

    // Track API calls per navigation
    let apiCalls: string[] = [];
    page.on("response", (response) => {
      const url = response.url();
      if (url.includes("/api/") && !url.includes("/_next/")) {
        apiCalls.push(url.replace(/.*\/api\//, "/api/").split("?")[0]);
      }
    });

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 150));
    });

    // Setup mocks and auth
    await setupAllMocks(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
    await page.evaluate(() => localStorage.setItem("expertStatus", "approved"));

    // Warm up: compile expert routes
    await page.goto("/expert/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);

    // ── Benchmark each route ──
    for (const route of ROUTES) {
      apiCalls = [];
      consoleErrors.length = 0;

      const t0 = performance.now();
      await page.goto(route.href, { waitUntil: "commit" });
      const tCommit = performance.now();

      // Race all possible content texts — first match wins
      // For each text, try heading AND text in parallel (some pages use <p> not <h1>)
      let contentFound = "";
      try {
        const result = await Promise.race([
          ...route.contentTexts.flatMap((text) => [
            page.getByRole("heading", { name: text }).first()
              .waitFor({ state: "visible", timeout: 10000 }).then(() => text),
            page.getByText(text, { exact: false }).first()
              .waitFor({ state: "visible", timeout: 10000 }).then(() => text),
          ]),
          new Promise<string>((resolve) => setTimeout(() => resolve("TIMEOUT"), 10500)),
        ]);
        contentFound = result;
      } catch {
        contentFound = "NOT_FOUND";
      }

      await page.waitForLoadState("networkidle").catch(() => {});
      const tContent = performance.now();

      // Check for redirect
      const finalUrl = page.url();
      if (!finalUrl.includes(route.href)) {
        consoleErrors.push(`REDIRECTED→${finalUrl.replace(/.*localhost:\d+/, "")}`);
      }

      const metrics = await page.evaluate(() => ({
        domNodes: document.querySelectorAll("*").length,
      }));

      results.push({
        route: route.name,
        href: route.href,
        navToCommitMs: Math.round(tCommit - t0),
        commitToContentMs: Math.round(tContent - tCommit),
        totalMs: Math.round(tContent - t0),
        contentFound,
        apiCalls: apiCalls.length,
        apiEndpoints: [...new Set(apiCalls)],
        domNodes: metrics.domNodes,
        errors: [...consoleErrors],
      });

      await page.waitForTimeout(150);
    }

    // ── Print results ──
    const sorted = [...results].sort((a, b) => b.totalMs - a.totalMs);

    console.log("\n");
    console.log("╔═══════════════════╦═════════╦═══════════╦═════════╦═════╦═══════╦════════════════════════════════╗");
    console.log("║ Route             ║ Nav→Cmt ║ Cmt→Cntnt ║  TOTAL  ║ API ║  DOM  ║ Content / Status              ║");
    console.log("╠═══════════════════╬═════════╬═══════════╬═════════╬═════╬═══════╬════════════════════════════════╣");

    for (const r of sorted) {
      const name = r.route.padEnd(17);
      const nav = `${r.navToCommitMs}ms`.padStart(7);
      const cmt = `${r.commitToContentMs}ms`.padStart(9);
      const tot = `${r.totalMs}ms`.padStart(7);
      const api = String(r.apiCalls).padStart(3);
      const dom = String(r.domNodes).padStart(5);
      const found = r.contentFound.slice(0, 30).padEnd(30);
      console.log(`║ ${name} ║ ${nav} ║ ${cmt} ║ ${tot} ║ ${api} ║ ${dom} ║ ${found} ║`);
    }

    console.log("╠═══════════════════╩═════════╩═══════════╩═════════╩═════╩═══════╩════════════════════════════════╣");

    const avg = Math.round(results.reduce((s, r) => s + r.totalMs, 0) / results.length);
    const max = Math.max(...results.map(r => r.totalMs));
    const min = Math.min(...results.map(r => r.totalMs));
    const totalApi = results.reduce((s, r) => s + r.apiCalls, 0);
    const avgDom = Math.round(results.reduce((s, r) => s + r.domNodes, 0) / results.length);
    console.log(`║ AVG: ${avg}ms  MIN: ${min}ms  MAX: ${max}ms  TOTAL API: ${totalApi}  AVG DOM: ${avgDom}`.padEnd(99) + "║");
    console.log("╚" + "═".repeat(99) + "╝");

    // ── Analysis ──
    console.log("\n🔍 BOTTLENECK ANALYSIS:");

    // Pages stuck in disconnected state (didn't show real content)
    const walletBlocked = results.filter(r =>
      r.contentFound.includes("wallet") || r.contentFound.includes("Wallet") ||
      r.contentFound === "TIMEOUT" || r.contentFound === "NOT_FOUND" ||
      r.errors.some(e => e.includes("REDIRECT"))
    );
    if (walletBlocked.length > 0) {
      console.log("\n  ⚠ Pages blocked by missing wagmi wallet (use useExpertAccount instead of useAccount):");
      walletBlocked.forEach(r =>
        console.log(`    ${r.route}: rendered "${r.contentFound}" ${r.errors.length ? `[${r.errors[0]}]` : ""}`)
      );
    }

    // Slowest pages (that actually rendered real content)
    const realContent = results.filter(r =>
      !r.contentFound.includes("wallet") && !r.contentFound.includes("Wallet") &&
      r.contentFound !== "TIMEOUT" && r.contentFound !== "NOT_FOUND" &&
      !r.errors.some(e => e.includes("REDIRECT"))
    );
    if (realContent.length > 0) {
      console.log("\n  Slowest fully-rendered pages (commit → content):");
      [...realContent].sort((a, b) => b.commitToContentMs - a.commitToContentMs)
        .forEach(r => console.log(`    ${r.route}: ${r.commitToContentMs}ms (${r.apiCalls} API, ${r.domNodes} DOM)`));
    }

    // Heaviest DOM
    console.log("\n  Heaviest DOM (top 3):");
    [...results].sort((a, b) => b.domNodes - a.domNodes).slice(0, 3)
      .forEach(r => console.log(`    ${r.route}: ${r.domNodes} nodes`));

    // Most API calls
    console.log("\n  Most API calls (top 3):");
    [...results].sort((a, b) => b.apiCalls - a.apiCalls).slice(0, 3)
      .forEach(r => console.log(`    ${r.route}: ${r.apiCalls} → [${r.apiEndpoints.join(", ")}]`));

    // JS errors
    const withErrors = results.filter(r => r.errors.some(e => !e.includes("REDIRECT")));
    if (withErrors.length > 0) {
      console.log("\n  ❌ Console errors:");
      withErrors.forEach(r => r.errors.filter(e => !e.includes("REDIRECT")).forEach(e =>
        console.log(`    ${r.route}: ${e.slice(0, 120)}`)
      ));
    }

    // JSON for before/after
    console.log("\n\nBENCHMARK_JSON:");
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      label: "AFTER optimizations",
      summary: { avgMs: avg, minMs: min, maxMs: max, totalApiCalls: totalApi, avgDomNodes: avgDom },
      routes: sorted.map(r => ({
        route: r.route, href: r.href,
        navToCommitMs: r.navToCommitMs, commitToContentMs: r.commitToContentMs, totalMs: r.totalMs,
        contentFound: r.contentFound,
        apiCalls: r.apiCalls, apiEndpoints: r.apiEndpoints,
        domNodes: r.domNodes, errors: r.errors,
      })),
    }, null, 2));

    expect(results.length).toBe(ROUTES.length);
  });

  test("measure sidebar click navigations (client-side)", async ({ page }) => {
    test.setTimeout(180_000);

    interface ClickResult {
      route: string;
      href: string;
      clickToSkeletonMs: number;
      clickToContentMs: number;
      contentFound: string;
      apiCalls: number;
      domNodes: number;
      errors: string[];
    }

    const results: ClickResult[] = [];

    let apiCalls: string[] = [];
    page.on("response", (response) => {
      const url = response.url();
      if (url.includes("/api/") && !url.includes("/_next/")) {
        apiCalls.push(url.replace(/.*\/api\//, "/api/").split("?")[0]);
      }
    });

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 150));
    });

    // Setup
    await setupAllMocks(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
    await page.evaluate(() => localStorage.setItem("expertStatus", "approved"));

    // Mock wallet verification as already verified (prevents modal blocking sidebar)
    await page.route("**/api/blockchain/wallet/verified/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { verified: true } }) }));

    // Full load of dashboard — warm up everything (JS, providers, sidebar)
    await page.goto("/expert/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Close any modal that might have appeared
    const laterBtn = page.getByRole("button", { name: "Later" });
    if (await laterBtn.isVisible().catch(() => false)) {
      await laterBtn.click();
      await page.waitForTimeout(300);
    }

    // Benchmark COLD first-click navigations (no route precompiled yet)
    // Skip Dashboard since we're already on it
    const sidebarRoutes = ROUTES.filter(r => r.href !== "/expert/dashboard");

    for (const route of sidebarRoutes) {
      apiCalls = [];
      consoleErrors.length = 0;

      // Find the sidebar link
      const link = page.getByRole("link", { name: route.name }).first();
      const isVisible = await link.isVisible().catch(() => false);

      if (!isVisible) {
        results.push({
          route: route.name, href: route.href, clickToSkeletonMs: -1, clickToContentMs: -1,
          contentFound: "LINK NOT VISIBLE", apiCalls: 0, domNodes: 0, errors: ["sidebar link not found"],
        });
        continue;
      }

      // Click and measure — track both skeleton appearance and final content
      const t0 = performance.now();
      await link.click();

      // Measure how fast the skeleton appears (instant view switch)
      let tSkeleton = t0;
      try {
        // The skeleton has shimmer pulse elements — look for the skeleton wrapper
        await page.locator("[class*='animate-pulse'], [class*='bg-muted']").first()
          .waitFor({ state: "visible", timeout: 3000 });
        tSkeleton = performance.now();
      } catch {
        // No skeleton detected — page may have rendered directly
        tSkeleton = performance.now();
      }

      // Wait for URL change
      try {
        await page.waitForURL(`**${route.href}**`, { timeout: 5000 });
      } catch { /* may already be on URL */ }

      // Wait for final content
      let contentFound = "";
      try {
        const result = await Promise.race([
          ...route.contentTexts.flatMap((text) => [
            page.getByRole("heading", { name: text }).first()
              .waitFor({ state: "visible", timeout: 8000 }).then(() => text),
            page.getByText(text, { exact: false }).first()
              .waitFor({ state: "visible", timeout: 8000 }).then(() => text),
          ]),
          new Promise<string>((resolve) => setTimeout(() => resolve("TIMEOUT"), 8500)),
        ]);
        contentFound = result;
      } catch {
        contentFound = "NOT_FOUND";
      }

      const tContent = performance.now();
      const metrics = await page.evaluate(() => ({
        domNodes: document.querySelectorAll("*").length,
      }));

      results.push({
        route: route.name,
        href: route.href,
        clickToSkeletonMs: Math.round(tSkeleton - t0),
        clickToContentMs: Math.round(tContent - t0),
        contentFound,
        apiCalls: apiCalls.length,
        domNodes: metrics.domNodes,
        errors: [...consoleErrors],
      });

      await page.waitForTimeout(200);
    }

    // Print
    const sorted = [...results].sort((a, b) => b.clickToContentMs - a.clickToContentMs);

    console.log("\n");
    console.log("╔══════════════════════════════════════════════════════════════════════════════════════════════╗");
    console.log("║                  CLIENT-SIDE NAVIGATION (Sidebar Click)                                    ║");
    console.log("╠═══════════════════╦═══════════════╦══════════════╦═════╦═══════╦════════════════════════════╣");
    console.log("║ Route             ║ Click→Skeleton║ Click→Cntnt  ║ API ║  DOM  ║ Content                    ║");
    console.log("╠═══════════════════╬═══════════════╬══════════════╬═════╬═══════╬════════════════════════════╣");

    for (const r of sorted) {
      const name = r.route.padEnd(17);
      const skel = `${r.clickToSkeletonMs}ms`.padStart(13);
      const time = `${r.clickToContentMs}ms`.padStart(12);
      const api = String(r.apiCalls).padStart(3);
      const dom = String(r.domNodes).padStart(5);
      const found = r.contentFound.slice(0, 26).padEnd(26);
      console.log(`║ ${name} ║ ${skel} ║ ${time} ║ ${api} ║ ${dom} ║ ${found} ║`);
    }

    console.log("╠═══════════════════╩═══════════════╩══════════════╩═════╩═══════╩════════════════════════════╣");

    const valid = results.filter(r => r.clickToContentMs > 0);
    const avgSkel = valid.length > 0 ? Math.round(valid.reduce((s, r) => s + r.clickToSkeletonMs, 0) / valid.length) : 0;
    const avg = valid.length > 0 ? Math.round(valid.reduce((s, r) => s + r.clickToContentMs, 0) / valid.length) : 0;
    const max = valid.length > 0 ? Math.max(...valid.map(r => r.clickToContentMs)) : 0;
    const min = valid.length > 0 ? Math.min(...valid.map(r => r.clickToContentMs)) : 0;
    console.log(`║ SKELETON AVG: ${avgSkel}ms | CONTENT AVG: ${avg}ms  MIN: ${min}ms  MAX: ${max}ms`.padEnd(94) + "║");
    console.log("╚" + "═".repeat(94) + "╝");

    console.log("\nCLICK_NAV_JSON:");
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      label: "Client-side sidebar navigation",
      summary: { avgSkeletonMs: avgSkel, avgContentMs: avg, minMs: min, maxMs: max },
      routes: sorted,
    }, null, 2));

    expect(valid.length).toBeGreaterThan(0);
  });
});
