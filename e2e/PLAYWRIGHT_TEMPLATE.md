# Vetted Playwright Template

This repo has two Playwright lanes:

- `e2e/{candidate,hiring,expert,shared}/*.spec.ts`: fast UI checks (persona-grouped), may use mocked API routes + direct API signup helpers.
- `e2e/real-flow/**/*.spec.ts`: full-stack scenarios that use backend seed APIs, Anvil, contracts, and the headless wallet.

Auto Mate reads test names and `test.step(...)` labels directly. Write tests as product workflows, not as implementation scripts.

## Standard Spec Shape

```ts
import { test, expect } from "@playwright/test";
import { signupCandidate } from "./helpers/auth";

test.describe("Candidate applications", () => {
  test("candidate opens applications and starts browsing jobs", async ({
    page,
  }) => {
    await test.step("candidate signs in with a clean session", async () => {
      await signupCandidate(page);
      await expect(page.getByText("Loading your dashboard...")).toBeHidden({
        timeout: 15_000,
      });
    });

    await test.step("candidate opens My Applications", async () => {
      await page.goto("/candidate/applications", {
        waitUntil: "domcontentloaded",
      });
      await expect(
        page.getByRole("heading", { name: "My Applications" }),
      ).toBeVisible();
    });

    await test.step("candidate uses the Browse Jobs call to action", async () => {
      await page.getByRole("button", { name: "Browse Jobs" }).click();
      await expect(page).toHaveURL(/\/browse\/jobs/);
      await expect(
        page.getByPlaceholder(/title, skill, or company/i),
      ).toBeVisible();
    });
  });
});
```

## Auto Mate Rules

- Use one readable `test(...)` name per user outcome.
- Wrap every product phase in `await test.step("human action/outcome", async () => { ... })`.
- Put important visible actions in the spec or in helpers that are called from a visible step.
- For multi-role tests, prefer separate contexts for separate people. Auto Mate follows the newest active page.
- Always create new contexts with inherited `baseURL`:

```ts
const context = await page
  .context()
  .browser()!
  .newContext({
    baseURL: new URL(page.url()).origin,
    bypassCSP: true,
  });
```

- Avoid `networkidle` unless the page truly becomes idle. Prefer `domcontentloaded` plus visible assertions.
- Avoid `waitForTimeout` except when deliberately slowing Auto Mate watch mode.

## Session Rules

- `signupCandidate(page)` creates a real backend candidate, clears stale expert/company state, mirrors auth localStorage, and lands on `/candidate/dashboard`.
- Expert tests that need wagmi must use `e2e/real-flow/helpers/ui-auth.ts` plus wallet injection.
- Do not hand-write localStorage in specs unless testing auth storage itself. Add a helper instead.
- If a test needs two users at once, create separate contexts instead of mutating one page mid-flow.

## Real-Flow Rules

- Seed through `testApi` or real-flow fixtures.
- Use `cleanState`/snapshot fixtures for blockchain state.
- Assert one user-visible outcome and one backend/chain invariant for critical flows.
- Keep scenario files small. Move repeated UI work into `e2e/real-flow/flows/*` or `e2e/real-flow/helpers/*`.

## Naming

- Good: `candidate applies to guild and reviewers approve application`
- Good: `expert places endorsement bid and reward becomes visible`
- Avoid: `page renders`, `test step 1`, `works`, `Verify: test name`

## Before Marking A Test Done

Run the smallest focused command first:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/path/to/file.spec.ts --reporter=line --retries=0
```

Then run discovery so Auto Mate can list it:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test --list
```

## Human-Readable `test.step()` Standard

Every test must be watchable — a person running it should see, step by step,
what user action is happening. Required structure:

- Wrap each meaningful PHASE in `await test.step("<product-stage label>", ...)`.
- Phases, in order: **setup** → **navigate** → **interact** → **assert**.
- Labels describe the PRODUCT action, not the test mechanics:
  - GOOD: `"candidate submits the Engineering guild application"`
  - GOOD: `"3 experts each commit a review score"`
  - BAD:  `"Verify: candidate guild application test"` (generic wrapper)
  - BAD:  `"step 1"` / `"setup mocks"`
- One `test(...)` per user outcome. One `test.step(...)` per phase.
- A single catch-all `test.step("Verify: <test name>")` wrapper does NOT
  satisfy this standard — it carries no narrative value in watch mode.

Mocked-lane specs (`e2e/*.spec.ts`) are being upgraded incrementally to this
standard; new specs follow it from day one.
