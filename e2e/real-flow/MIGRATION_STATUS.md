# Commit-Reveal / Dual-Review-System Migration Status

> Captured against backend commit `4017bd7`, front-end commit `b319dc8`, on 2026-05-14.

---

## Migration status: IN PROGRESS

The auto-reveal design is **implemented and the default path**, but the legacy manual-reveal code paths have **not been deleted** — they remain as deprecated stubs kept for backward compatibility with proposals/applications that entered the reveal phase before the migration.

### Evidence

**Backend — explicit deprecation markers:**

- `src/features/proposals/commit-reveal.service.ts:283-292`
  ```
  @deprecated Use auto-reveal via submitCommitment. Kept for backward compatibility.
  ```
  `revealVote()` logs `[DEPRECATED] revealVote called … Use auto-reveal instead.`

- `src/features/experts/expert-commit-reveal.service.ts:624-637`
  Same `@deprecated` tag and `[DEPRECATED]` log on `ExpertCommitRevealService.revealVote()`.

- `src/features/proposals/commit-reveal-automation.service.ts:340, 360`
  Two `@deprecated Kept for backward compatibility with old proposals stuck in reveal phase.`

- `src/features/experts/expert-commit-reveal-automation.service.ts:139, 187-192`
  Comment: *"Backward compat: old applications in reveal phase → auto-reveal when reveal_deadline passes."*
  A `legacyFinalized` counter (line 9, 133, 157, 181) tracks this remediation path at runtime.

**Backend — legacy routes still registered:**

- `src/features/proposals/proposals.routes.ts:86`
  `router.post('/:proposalId/reveal', …, CommitRevealController.revealVote)` — route live, calls deprecated service method.

- `src/features/experts/experts.routes.ts:208-211`
  `router.post('/guild-applications/:applicationId/reveal', …, ExpertCommitRevealController.revealVote)` — route live, calls deprecated service method.

**Backend — DB columns kept for compat:**

- `reveal_deadline` column still read in `expert-commit-reveal.service.ts:731, 771, 774` and referenced by the backward-compat automation query (`expert-commit-reveal-automation.service.ts:190-192`). New applications get `reveal_deadline = NULL` (`expert-application-helpers.ts:407`).

**Backend — new path commit message:**

- `9a5543f feat(reviews): harden expert + proposal commit-reveal flow` (2026-05-08) — fixes the silent-data-loss path in the new auto-reveal design; the commit message explicitly states "Auto-reveal trigger advisory-locked + awaited inside the commit transaction."

**Frontend — no manual reveal UI exists:**

- `src/components/expert/VotingInterface.tsx` — only two non-finalized phases rendered: `direct` (score slider) and `commit` (CommitmentForm). No reveal panel.
- `src/components/CommitmentForm.tsx:84` — post-commit copy reads "It will be **revealed automatically** when all reviewers commit."
- `src/components/expert/VotingApplicationPage.tsx` — `crPhase` model is `direct | commit | finalized`; no reveal phase branch.
- `src/lib/api.ts:2111-2213` (`reviewsApi`) — exposes `getDraft / putDraft / getCommitHash / submit / getState / retrySession`; no `reveal` call.
- `SCENARIO_OUTCOME_MATRIX.md:72` (on-disk, gitignored) — "No reveal-phase screen exists in the frontend — phase model is `direct | commit | finalized`. Reveal is automatic backend-side. Do not assert a reveal screen."

---

## Current intended review path

New E2E scenarios should target the **auto-reveal path**:

1. Expert calls `POST /review/commit-hash` to get the server-derived expected hash.
2. Expert signs `commitVote(expectedCommitHash)` on-chain via `VettingManager`.
3. Expert calls `POST /review/submit` (with `{ score, txHash }`) to persist the commitment.
4. When the **last assigned reviewer commits** (or the commit deadline passes), the backend automation (`CommitRevealAutomationService.autoRevealAndFinalize` / `autoRevealAndFinalize` in the expert variant) reveals all votes and triggers finalization atomically — **no explicit reveal action from the expert is needed**.

**Frontend entry point:** `CommitmentForm` component (`src/components/CommitmentForm.tsx`), reached from `VotingInterface` when `crPhase.phase === "commit"`.

**Backend entry points:**
- Expert guild applications: `POST /api/experts/guild-applications/:applicationId/review/submit`
- Candidate proposals: `POST /api/proposals/:proposalId/review/submit`

---

## Legacy paths — do NOT target

The following code paths exist in the codebase but are explicitly deprecated and should **not** be the basis for new E2E scenarios:

| Path | File(s) | Marker |
|---|---|---|
| `POST /api/proposals/:proposalId/reveal` | `proposals.routes.ts:86` → `CommitRevealController.revealVote` → `CommitRevealService.revealVote` | `@deprecated` + `[DEPRECATED]` log warning |
| `POST /api/experts/guild-applications/:applicationId/reveal` | `experts.routes.ts:208` → `ExpertCommitRevealController.revealVote` → `ExpertCommitRevealService.revealVote` | `@deprecated` + `[DEPRECATED]` log warning |
| Automation backward-compat branch for `voting_phase = 'reveal'` proposals | `commit-reveal-automation.service.ts:340-360`, `expert-commit-reveal-automation.service.ts:187-202` | `@deprecated Kept for backward compatibility` |
| `reveal_deadline` column (non-null) | `expert-commit-reveal.service.ts:640-652` — only reached from deprecated `revealVote()` | New applications receive `reveal_deadline = NULL` |

These stubs drain the queue of applications that were mid-flight before the migration. Once the queue is empty they are candidates for deletion; a future cleanup commit should remove them and the `reveal_deadline` deadline guards.

---

## Recommendation

Scenarios 8 and 11 in `SCENARIO_OUTCOME_MATRIX.md` (commit-reveal: some-don't-reveal, hash mismatch) were written with both designs in mind. Per this investigation:

- **Scenario 8** ("all commit, some don't reveal") should be written as *"all commit, automation triggers, no manual reveal required"* — the "missed reveal window" UI path (`ViewReviewModal`'s red alert at `src/components/expert/applications/ViewReviewModal.tsx:263`) is a display-only state for historical votes, not a flow that new scenarios need to drive.
- **Scenario 11** ("reveal hash mismatch → InvalidCommitment revert") maps to the on-chain `commitVote` call rejecting a bad hash, not to a separate reveal tx. The matrix note "n/a (hash verified at commit time in new design)" is correct.
