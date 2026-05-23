# Vetted Frontend

Next.js frontend for Vetted, with Playwright coverage wired for Auto Mate.

## Development

```bash
npm install
npm run dev
```

The default dev server uses `.env.local` and starts on `http://localhost:3000`.
For local Auto Mate runs, use an alternate port when other projects are busy:

```bash
NEXT_PUBLIC_E2E_MODE=true npm run dev -- -p 3001
```

## Tests

```bash
npm run typecheck
npm test
npm run test:e2e
```

Real-flow tests need the backend, database, local Anvil chain, and deployed local
contracts to be running. The backend must expose the test fixture routes:

```bash
cd ../backend
NODE_ENV=test E2E_FIXTURE_ENABLED=true npm run dev
```

Run the full real-flow suite with:

```bash
npm run e2e:real-flow
```

Run one Playwright spec against an already-running frontend:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/public-pages.spec.ts
```

## Auto Mate

Auto Mate reads Playwright `test.step(...)` events to show a human-readable
progress list while a test is running. Every spec under `e2e/` now emits at
least one named step. Larger real-flow scenarios use multiple product-level
steps such as applying to a guild, reviewer approval, bidding, hire outcome,
reward forfeiture, and slashing checks.

When adding or editing Playwright tests:

- Wrap each meaningful product action in `await test.step("clear user-facing step", async () => { ... })`.
- Prefer step names that describe what the user or system is doing, not the implementation detail.
- Keep setup, navigation, interaction, and assertion phases as separate steps when the flow is longer than a smoke test.
- Do not put Vitest-only helper tests under files that Playwright will collect as specs.

Use [e2e/PLAYWRIGHT_TEMPLATE.md](e2e/PLAYWRIGHT_TEMPLATE.md) as the template
for new tests. It documents the fast UI lane, the real-flow lane, role/session
helpers, multi-page Auto Mate preview behavior, and focused verification
commands.

To slow down the browser while watching tests in Auto Mate:

```bash
PLAYWRIGHT_WATCH_UI=1 PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/public-pages.spec.ts
```

For a custom delay:

```bash
PLAYWRIGHT_SLOW_MO=500 PLAYWRIGHT_WATCH_PAUSE_MS=1000 PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test e2e/real-flow/__tests__/candidate-endorsement-ui.spec.ts
```

`PLAYWRIGHT_SLOW_MO` slows browser actions. `PLAYWRIGHT_WATCH_PAUSE_MS` is used
by real-flow watch helpers for intentional pauses between named stages.
