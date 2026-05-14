// e2e/real-flow/playwright.real-flow.config.ts
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3030";

// The real-flow stack runs a dedicated e2e backend (default :4100, see
// backend/.env.e2e) so it can coexist with a dev backend on :4000. Test-side
// helpers/fixtures already honour BACKEND_URL, but the *browser* reads
// NEXT_PUBLIC_API_URL — which .env.local pins to :4000. Without forwarding
// BACKEND_URL into the dev server's NEXT_PUBLIC_API_URL, the UI fetches
// (e.g. expertApi.getProfile during wallet login) hit the un-seeded :4000
// backend, 404, and bounce the expert to /expert/apply instead of the
// dashboard.
const backendUrl = process.env.BACKEND_URL || "http://localhost:4100";
const watchSlowMo = process.env.PLAYWRIGHT_WATCH_UI === "1" ? 250 : 0;
const slowMo = Number(process.env.PLAYWRIGHT_SLOW_MO ?? watchSlowMo);
const launchOptions = slowMo > 0 ? { slowMo } : undefined;

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["html", { outputFolder: "playwright-report-real-flow" }],
    ["list"],
  ],
  timeout: 120_000,
  use: {
    baseURL,
    bypassCSP: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions,
  },
  projects: [
    {
      name: "review",
      testMatch: /scenarios\/.*\.spec\.ts/,
      testIgnore: /endorsement\//,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "endorsement",
      testMatch: /endorsement\/scenarios\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Smoke project for fixture/helpers sanity checks under
    // `e2e/real-flow/__tests__/`. Kept separate from the scenario projects
    // so a CI run scoped to `--project=review|endorsement` skips them.
    {
      name: "smoke",
      testMatch: /__tests__\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "platform",
      testMatch:
        /scenarios\/(candidate|company|cross-role|expert|protocol)\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // E2E flags:
    //  - NEXT_PUBLIC_E2E_MODE=true wires the foundry chain + headless wallet
    //    connector into wagmi-config (see wagmi-config.ts).
    //  - NEXT_PUBLIC_EXPERT_ONBOARDING_TOUR=false suppresses the 16-step
    //    first-run reviewer tour that overlays /expert/dashboard.
    //  - NEXT_PUBLIC_CONTRACT_* overrides redirect every on-chain read/write
    //    to the anvil-deployed contracts (default fallbacks in
    //    src/contracts/abis.ts point at real sepolia addresses, which don't
    //    exist on local anvil and silently swallow tx attempts).
    command: [
      "cd ../.. && npx dotenv -e .env.local -- env",
      "NEXT_PUBLIC_E2E_MODE=true",
      "NEXT_PUBLIC_EXPERT_ONBOARDING_TOUR=false",
      // Point the browser at the e2e backend (BACKEND_URL, default :4100) —
      // NOT the :4000 dev backend that .env.local configures. Must come after
      // the `dotenv ... env` dump so it overrides the .env.local value.
      `NEXT_PUBLIC_API_URL=${backendUrl}`,
      // FE wagmi reads (`useReadContract`, etc.) need to hit local anvil,
      // not public sepolia. Default fallback in `http(undefined)` uses the
      // chain's public RPC, which has none of our deployed state.
      "NEXT_PUBLIC_SEPOLIA_RPC_URL=http://localhost:8545",
      "NEXT_PUBLIC_ANVIL_RPC_URL=http://localhost:8545",
      "NEXT_PUBLIC_CONTRACT_TOKEN=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      "NEXT_PUBLIC_CONTRACT_STAKING=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
      "NEXT_PUBLIC_CONTRACT_ENDORSEMENT=0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
      "NEXT_PUBLIC_CONTRACT_REPUTATION=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
      "NEXT_PUBLIC_CONTRACT_REWARD=0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
      "NEXT_PUBLIC_CONTRACT_SLASHING=0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",
      "NEXT_PUBLIC_CONTRACT_GUILD_REGISTRY=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
      "NEXT_PUBLIC_CONTRACT_VETTING=0xE68a768Cc18039b50382d64405Fb4C7700966054",
      "npx next dev --turbopack --port 3030",
    ].join(" "),
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
