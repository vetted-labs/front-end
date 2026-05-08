# Real Flow E2E Suites

Cross-stack Playwright suites that exercise the full candidate-review flow (Suite A) and endorsement flow (Suite B) against a real local stack — anvil + local backend + local frontend, no mocks.

## Prerequisites

1. **Anvil** running on `:8545`:
   ```sh
   anvil
   ```
2. **Smart-contracts deployed** to anvil with `deployments-local.json` emitted:
   ```sh
   cd ../smart-contracts
   forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   export GUILD_REGISTRY_ADDRESS=$(jq -r .GuildRegistry deployments/local-latest.json)
   export VETTED_TOKEN_ADDRESS=$(jq -r .VettedToken deployments/local-latest.json)
   forge script script/SetupTestingGuild.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
3. **Advance anvil time past the mint rate-limit window** before minting. `VettedToken` enforces a 1-day `MINT_RATE_LIMIT`; without this step `MintTokens.s.sol` reverts with `MintRateLimitExceeded`:
   ```sh
   cast rpc evm_increaseTime 86401 && cast rpc evm_mine
   ```
4. **Mint test tokens**:
   ```sh
   forge script script/MintTokens.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
5. **Backend** running on `:4000` with `E2E_FIXTURE_ENABLED=true`:
   ```sh
   cd ../backend
   E2E_FIXTURE_ENABLED=true ENDORSEMENT_RETENTION_SECONDS=5 ENDORSEMENT_CHALLENGE_SECONDS=10 npm run dev
   ```

   `E2E_FIXTURE_ENABLED=true` also gates `FinalizeProposalsCron.start` and `BlockchainOpsCron.start` (per T7 of the plan). The cron jobs MUST stay disabled in test mode — tests drive cron-equivalent work via `/api/test/drain` and `/api/test/endorsement/*`. If you see `isRunning lock held` errors, a cron started against intent — confirm `E2E_FIXTURE_ENABLED=true` is actually exported in the BE process env.
6. **Frontend** auto-starts via Playwright config on `:3030`.

### Suite-level setup script (copy-paste)

```sh
# One-time: bring up local stack
anvil &  # in one terminal

cd ../smart-contracts
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export GUILD_REGISTRY_ADDRESS=$(jq -r .GuildRegistry deployments/local-latest.json)
export VETTED_TOKEN_ADDRESS=$(jq -r .VettedToken deployments/local-latest.json)
forge script script/SetupTestingGuild.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
cast rpc evm_increaseTime 86401 && cast rpc evm_mine  # MINT_RATE_LIMIT reset
forge script script/MintTokens.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

cd ../backend
E2E_FIXTURE_ENABLED=true ENDORSEMENT_RETENTION_SECONDS=5 ENDORSEMENT_CHALLENGE_SECONDS=10 npm run dev &

# Mint Suite B tokens (do this after BE is up):
cd ../front-end
# Run a small bootstrap script or curl the /api/test/seed/* endpoints to populate E2E_COMPANY_TOKEN + E2E_EXPERT_TOKENS env vars.

npm run e2e:real-flow
```

## Run

### Required env vars for Suite B scenarios

Suite B (endorsement flow) drives the BE directly with seeded JWTs. Export these before invoking the runner:

- `E2E_COMPANY_TOKEN` — JWT for the seeded test company. Mint via `POST /api/test/seed/company` (see Patch 3 in the commit log).
- `E2E_EXPERT_TOKENS` — JSON array of expert JWTs (e.g. `'["jwt1","jwt2","jwt3"]'`), or set `E2E_EXPERT_TOKEN_<i>` per expert. Mint via `POST /api/test/seed/expert-token` after seeding the experts themselves.
- `ENDORSEMENT_RETENTION_SECONDS=5` — fast-clock for retention tests (default is 90 days, which would make the suite untestable).
- `ENDORSEMENT_CHALLENGE_SECONDS=10` — fast-clock for dispute expiration.

The retention/challenge env vars must be set on the **backend process**, not just the test runner — they're read at BE startup.

### Commands

```sh
npm run e2e:real-flow                          # both suites
npm run e2e:real-flow -- --project=review      # Suite A only
npm run e2e:real-flow -- --project=endorsement # Suite B only
```

## Debug a single failing scenario

```sh
E2E_KEEP_STATE=1 npx playwright test e2e/real-flow/scenarios/04-no-reveal-slashing.spec.ts --config=e2e/real-flow/playwright.real-flow.config.ts --debug
```

`E2E_KEEP_STATE=1` skips the `afterEach` revert so anvil + DB stay frozen for inspection.

## Known gaps surfaced by the suite (not blockers; tracked)

- No public BE `GET` for `endorsement_disputes.status` — Suite B scenarios 05/06 assert dispute resolution **indirectly** (via downstream side-effects on rewards/slashing) rather than reading the dispute row.
- `applyToGuildViaUI` writes `job_id = NULL` — Suite B scenarios synthesize a UUID and use `createJob` directly to attach a real job. Suite A is unaffected.
- The candidate UI doesn't render literal `"hired"` / `"approved"` strings — UI spot-checks use the list-page status pills + permissive matchers (avoid `getByText('hired')`).

## Adding a new scenario

1. Copy an existing `.spec.ts` as template.
2. Modify scores / behavior / expected outcome.
3. Update the spec file's scenario table. Spec PR before test PR.
4. Run locally; commit.
