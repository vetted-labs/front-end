# Real-Flow Testing Phases

A staged roadmap for end-to-end coverage of the Vetted product through the **real** UI against a **real** local stack (anvil + backend + frontend), with **no mocks** at any layer. The headless wallet shim removes MetaMask as a blocker for Connect Wallet + SIWE + on-chain writes — every phase below assumes that infrastructure is in place.

> Companion docs:
> - `README.md` — local stack bootstrap (anvil, contracts, BE env)
> - `helpers/headless-wallet.ts` + `helpers/wallet-injection.ts` — wallet shim
> - `helpers/ui-auth.ts` — UI-driven login + wagmi programmatic helpers

---

## Wallet Shim Infrastructure (foundation)

Everything below depends on this being green.

| Piece | File | Status |
|---|---|---|
| Node-side EIP-1193 wallet | `helpers/headless-wallet.ts` | ✅ |
| Page-side `window.ethereum` stub + EIP-6963 announce | `helpers/wallet-injection.ts` | ✅ |
| Custom RainbowKit wallet entry + `injected()` connector branch | `wagmi-config.ts` (E2E branch) | ✅ |
| `__wagmiTest` programmatic harness | `src/components/Providers.tsx` (E2E branch) | ✅ |
| UI-auth helpers (`connectWalletViaUI`, `loginAsExpertViaUI`, `switchAccountUI`) | `helpers/ui-auth.ts` | ✅ |

Non-obvious requirements baked into `playwright.real-flow.config.ts`:

- `anvil --chain-id 11155111` — match BE's sepolia config; the FE wagmi chain + shim both report `0xaa36a7`.
- `NEXT_PUBLIC_E2E_MODE=true` — gates the shim wallet entry in `wagmi-config.ts` and the `__wagmiTest` harness in `Providers.tsx`. Production bundles are unaffected.
- `NEXT_PUBLIC_EXPERT_ONBOARDING_TOUR=false` — suppresses the 16-step first-run tour that overlays `/expert/dashboard`.
- `NEXT_PUBLIC_SEPOLIA_RPC_URL=http://localhost:8545` + `NEXT_PUBLIC_ANVIL_RPC_URL=http://localhost:8545` — redirect FE wagmi reads (`useReadContract`, etc.) to local anvil; the default falls back to public sepolia, which has no deployed state.
- `NEXT_PUBLIC_CONTRACT_*` — redirect every on-chain read/write to the anvil-deployed addresses. The default fallbacks in `src/contracts/abis.ts` point at real sepolia addresses that don't exist on local anvil and silently swallow tx attempts.
- **multicall3 setCode** — wagmi `useReadContract` silently batches via multicall3 at `0xcA11bde05977b3631167028862bE2a173976CA11`. anvil ships without it; first read returns `0x` and decoding throws. After deploy:
  ```sh
  RT=$(cast code --rpc-url https://ethereum-sepolia-rpc.publicnode.com 0xcA11bde05977b3631167028862bE2a173976CA11)
  cast rpc --rpc-url http://localhost:8545 anvil_setCode 0xcA11bde05977b3631167028862bE2a173976CA11 "$RT"
  ```

### Smoke suite (`__tests__/*.smoke.spec.ts`)

The shim itself ships with its own smoke project (run via `--project=smoke`). 28 tests across 11 specs — all green is the gate before any phase work:

| Spec | Tests | Layer |
|---|---|---|
| `headless-wallet.smoke.spec.ts` | 7 | Node-side shim (sign, send, chain id) |
| `wallet-injection.smoke.spec.ts` | 5 | Browser bridge (`window.ethereum`, EIP-6963) |
| `wagmi-connect.smoke.spec.ts` | 3 | Wagmi programmatic via `__wagmiTest` |
| `rk-modal.smoke.spec.ts` | 1 | RainbowKit modal → shim click path |
| `ui-detect.smoke.spec.ts` | 2 | Shim surfaces as "Installed" in RK modal |
| `ui-connect.smoke.spec.ts` | 3 | Connect → useAccount populated |
| `ui-diag.smoke.spec.ts` | 2 | Diagnostic prints (manual debugging) |
| `expert-login.smoke.spec.ts` | 2 | SIWE-equivalent login → `/expert/dashboard` |
| `candidate-to-expert-review.smoke.spec.ts` | 1 | Multi-actor flow (Phase 1+2) |
| `expert-stake.smoke.spec.ts` | 1 | Real on-chain tx via UI (Phase 4) |
| `fixtures-smoke.spec.ts` | 1 | Fixture sanity |

---

## Phase Roadmap

Phases are ordered by **dependency**, not value. Each phase adds an axis of coverage to the matrix; once a phase lands, every later phase can assume that axis works.

### ✅ Phase 1 — Expert login + review chain through UI

**Status:** Complete (`__tests__/expert-login.smoke.spec.ts`, `__tests__/candidate-to-expert-review.smoke.spec.ts`).

**Scope:** Candidate applies to a guild via UI → expert logs in via the real Connect Wallet modal → expert dashboard surfaces the pending review → expert opens the candidate detail panel.

**Proves:**
- RainbowKit modal works against the shim end-to-end.
- Vetted's wallet-address-based auth (the SIWE-equivalent for experts) flows through `useAccount` + the dashboard guards correctly.
- Multi-actor isolation: cookies/localStorage cleared between actors, second login picks up first actor's writes.

**Key files:** `helpers/ui-auth.ts:loginAsExpertViaUI`, the onboarding-tour localStorage preset.

---

### ✅ Phase 2 (initial cut) — Review submission via BE API

**Status:** Complete via BE-API shortcut inside `candidate-to-expert-review.smoke.spec.ts`. UI form not yet driven field-by-field.

**Scope:** Expert posts review payload (`POST /api/expert/reviews/...`) to confirm the review actually persists and propagates downstream (review count, my-reviews tab).

**Why short of full UI:** The review wizard is a 4-step rubric form; selectors are stable but the form needs a dedicated driver. Drove via API in this phase so the multi-actor chain could land before the form-driver burden.

---

### ⏳ Phase 2B — Drive review wizard field-by-field via UI

**Status:** Pending.

**Scope:** Replace the BE-API review submit in Phase 2 with a real UI driver that:
- Opens the candidate review modal from the dashboard.
- Walks the 4-step wizard (rubric scores per dimension, written feedback, recommendation, confirmation).
- Submits → waits for the success toast → asserts the review appears on the my-reviews tab.

**Dependencies:** None. Pure selector work.

**Files to add:** `helpers/ui-review.ts` (form driver), update `candidate-to-expert-review.smoke.spec.ts` to use it.

**Risk:** Rubric weights / required field count may shift; pin selectors to `data-testid` where possible to avoid copy churn.

---

### ⏳ Phase 3 — Multi-reviewer consensus

**Status:** Pending.

**Scope:** Three experts log in sequentially, each submits a review for the same candidate, and the dashboard surfaces the consensus state (approve / reject / borderline).

**Dependencies:** Phase 2B (need the UI form driver to scale to N reviewers without copy/paste).

**Test isolation:** Anvil snapshot/revert per scenario; per-test cookie clear (already in `beforeEach`).

**Coverage gap this closes:** Today's `e2e/real-flow/scenarios/*.spec.ts` (Suite A) drive consensus through commit/reveal at the BE/chain layer. Phase 3 closes the UI-layer assertion (does the FE actually *render* the consensus that the chain computed?).

---

### ✅ Phase 4 — Real on-chain write via UI (staking)

**Status:** Complete (`__tests__/expert-stake.smoke.spec.ts`).

**Scope:** Expert logs in → opens StakingModal → enters amount → clicks "Stake for <guild>" → `usePermitOrApprove` signs EIP-2612 permit → `stakeWithPermit` writes on-chain.

**Proves the durable signing pipeline:** Asserts the shim received both `eth_signTypedData_v4` (the permit) and `eth_sendTransaction` (the stake call). Same pipeline backs every other real-tx UI: endorsement bidding, commit-reveal, governance proposals, withdrawal.

**Known limitation:** Exact on-chain balance delta is **not** asserted — anvil snapshot/revert ordering with worker-scoped `seedExperts` drifts the baseline between runs, and a repeated permit-nonce can quietly revert a tx that was still signed and submitted. The shim trace is the durable proof. Follow-up: deploy multicall3 + Vetted contracts inside a single deterministic fixture init so the on-chain delta becomes a reliable assertion.

---

### ⏳ Phase 5 — Withdrawal flow via UI

**Status:** Pending.

**Scope:** Expert with active stake clicks "Withdraw" → confirms in modal → `requestWithdrawal` tx (or the contract's equivalent unbond call) goes through the shim. Then optionally fast-forwards anvil past the unbonding period and finalizes.

**Dependencies:** None — Phase 4 already proved the write pipeline.

**Why separate from Phase 4:** Withdrawal has a different state machine (unbonding period, potential slashing window) and a different modal. Worth its own assertion.

---

### ⏳ Phase 6 — Company + candidate job flows

**Status:** Pending.

**Scope:**
- Company logs in (JWT path, not wallet) → posts a job via UI → job appears on browse.
- Candidate logs in → opens the job detail panel → submits an application via the JobApplicationModal.
- Expert sees the application surface on the dashboard (closes the loop with Phase 1).

**Dependencies:** None on the wallet shim — both actors use BE JWT auth. Mostly selector + form-driver work.

**Why phase 6 not 1:** The expert/wallet side was the hard part (MetaMask blocker). Once the shim was in, the wallet-gated phases got priority. Company + candidate are JWT and can be added once the wizard pattern from Phase 2B is in place.

---

### ⏳ Phase 7 (BE) — `candidate_proposals` auto-promotion

**Status:** Pending. **Owner: backend.**

**Scope:** Wire BE so that a candidate guild-application → proposal → commit/reveal pipeline auto-promotes through the states expected by `scenarios/01-approve-consensus.spec.ts` (and siblings).

**Why this blocks the existing Suite A:** Today's `scenarios/01..07` were written against a hypothetical end-state of the proposal/commit-reveal pipeline. The candidate→proposal hop is missing in BE; the suite stalls there. Phase 7 is the BE-side work to make those scenarios runnable, **and** unlocks driving the same flow through the real UI as a "phase 8" follow-on.

**Out of scope for front-end:** This phase lives in `vetted/backend`. Front-end's role is to keep `scenarios/01..07` exercising the UI assertions and surface the BE gap clearly when they fail.

---

## Phase dependency graph

```
Wallet Shim (foundation)
  ├─ Phase 1  (login + review chain)              ✅
  │    └─ Phase 2  (review submit via API)        ✅
  │         └─ Phase 2B (review wizard via UI)    ⏳
  │              └─ Phase 3  (multi-reviewer)     ⏳
  ├─ Phase 4  (on-chain stake via UI)             ✅
  │    └─ Phase 5  (withdrawal via UI)            ⏳
  └─ Phase 6  (company + candidate job flows)     ⏳

Phase 7 (BE) ──→ unlocks running scenarios/01..07 end-to-end
```

---

## Operating principles

1. **No mocks, anywhere.** The whole point of real-flow is to catch integration bugs the unit suites can't. If a layer can't be exercised, document the gap; don't paper over it.
2. **Shim signing pipeline is the durable proof.** When test isolation makes on-chain balance assertions flaky, assert the RPC method trace through the shim — that's what proves the production pipeline ran.
3. **One actor per browser context.** Cookies + localStorage cleared between actors in `beforeEach`. Wagmi `cookieStorage` can shadow a disconnect; isolate via context rather than fighting wagmi's UX-level disconnect.
4. **Pin selectors to roles + text, not CSS.** The whole suite assumes refactors of styling will not break tests. If a copy change breaks a selector, the test caught a real product-side decision — accept it or use `data-testid`.
5. **Each phase ships its own test before its dependents start.** No "I'll add the assertion later." The phase is done when its test is green in CI and the next phase can rely on it.

---

## Running

```sh
# Foundation smoke (gate before phase work)
npm run e2e:real-flow -- --project=smoke

# Existing scenario projects (review chain, endorsement)
npm run e2e:real-flow -- --project=review
npm run e2e:real-flow -- --project=endorsement

# Single phase test (debug)
npx playwright test e2e/real-flow/__tests__/expert-stake.smoke.spec.ts \
  --config=e2e/real-flow/playwright.real-flow.config.ts --debug
```
