# E2E Tests — Navigation Guide

Two lanes, both grouped by **persona** so you can find a flow fast.

## Lane 1 — Fast UI (`e2e/<persona>/*.spec.ts`)
Real frontend, **mocked** API/chain (`page.route`). Fast render/flow regression net.
Run against a dev server (`NEXT_PUBLIC_E2E_MODE=true npm run dev -- -p 3030`).

| Folder | Persona | What's here |
|---|---|---|
| `e2e/candidate/` | Candidate | profile, applications, guild application + tracking, job application |
| `e2e/hiring/` | Company / hiring | auth, dashboard, job posting, company profile |
| `e2e/expert/` | Expert | login, profile, voting (queue/detail/flow), reputation, earnings, staking, slashing, commit-reveal, onboarding tour, route protection, appeal |
| `e2e/shared/` | Cross-cutting | navigation + route protection, negative/error paths, bug regressions |

```bash
npm run test:e2e            # whole fast lane (excludes real-flow)
npm run test:e2e:candidate  # one persona
npm run test:e2e:hiring
npm run test:e2e:expert
PLAYWRIGHT_BASE_URL=http://localhost:3030 npx playwright test e2e/expert/expert-voting-queue.spec.ts
```

## Lane 2 — Real-flow (`e2e/real-flow/**`)
Real frontend **+ real backend + anvil**, no mocks. Own config + stack
(`e2e/real-flow/playwright.real-flow.config.ts`). See `e2e/real-flow/README.md`
for bootstrap. Persona buckets:

| Path | Persona / purpose |
|---|---|
| `real-flow/scenarios/candidate/` | Candidate browse/apply/login/signup/messaging/notifications |
| `real-flow/scenarios/hiring/` | Company accept-candidate, job publication, team invite, view applicants |
| `real-flow/scenarios/expert/` | Voting, governance, leaderboard, rewards, withdrawal, notifications |
| `real-flow/scenarios/cross-role/` | Job → hire / not-hired-slashing (multi-persona) |
| `real-flow/scenarios/*.spec.ts` | Protocol/consensus scenarios (commit-reveal 01-07, headline, multi-reviewer, slashing-panel) |
| `real-flow/endorsement/scenarios/` | Endorsement bid → hire → reward/dispute |
| `real-flow/__tests__/` | Wallet-shim + UI smoke |
| `real-flow/oracle/`, `experiments/`, `bootstrap/` | Math oracle, volume harness, deterministic bootstrap (infra) |

```bash
npm run e2e:bootstrap -- 3                       # seed 3 guilds × 10 staked experts
npm run e2e:real-flow                            # whole real-flow lane
npm run e2e:real-flow -- --project=review        # one project (review|endorsement|smoke|platform)
```

## Shared test infra
- `e2e/helpers/` — fast-lane helpers (auth, company-auth, expert-auth, guild-mocks).
- `e2e/real-flow/helpers/` — real-flow helpers (wallet shim, chain, contracts, backend fixtures, UI drivers).
- `e2e/PLAYWRIGHT_TEMPLATE.md` — authoring rules (read before adding/refactoring specs).
