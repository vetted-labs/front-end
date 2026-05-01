# Analytics Endpoint Handoff

Status as of 2026-04-29: backend endpoint implementation is complete locally. Backend targeted tests pass and the backend build passes. Frontend analytics UI/tests are integrated locally, but the current real frontend branch still has a Next generated chunk issue during production build that needs separate cleanup before shipping.

## What Was Built

Backend:

- Added `GET /api/companies/me/analytics/jobs/:jobId`.
- Added typed response contract in `src/features/companies/company-analytics.types.ts`.
- Wired route/controller/service through:
  - `src/features/companies/companies.routes.ts`
  - `src/features/companies/companies.controller.ts`
  - `src/features/companies/company-analytics.service.ts`
- Added migration:
  - `db/migrations/079_proposal_vote_criteria_for_analytics.sql`
- Extended proposal vote/finalization flow to persist analytics metadata:
  - `src/features/proposals/proposals.validation.ts`
  - `src/features/proposals/proposals.service.ts`
  - `src/features/proposals/proposal-finalization.service.ts`

Frontend:

- Added matching `JobAnalyticsDetail` types in `src/types/analytics.ts`.
- Added API client method `analyticsApi.getJobAnalytics(jobId)` in `src/lib/api.ts`.
- Reworked job analytics page to use the endpoint and render the workspace:
  - `src/components/dashboard/JobAnalyticsPage.tsx`
  - `src/components/dashboard/analytics/JobAnalyticsWorkspace.tsx`
  - `src/components/dashboard/analytics/CandidateRankingTable.tsx`
  - `src/components/dashboard/analytics/CandidateEvidencePanel.tsx`
  - `src/components/dashboard/analytics/RoleInsightsGrid.tsx`
- Added local fixture mode for visual iteration only:
  - `src/components/dashboard/analytics/job-detail-fixture.ts`
  - `src/components/dashboard/analytics/job-detail-helpers.ts`

## Endpoint Contract

Request:

```http
GET /api/companies/me/analytics/jobs/:jobId
Authorization: company auth token
```

Route is protected by `verifyCompanyToken`.

Response contract:

```ts
interface JobAnalyticsDetail {
  contractVersion: "analytics-job-detail-v1";
  job: {
    id: string;
    title: string;
    guild: string | null;
    status: string;
    createdAt: string;
  };
  summary: {
    totalCandidates: number;
    endorsedCandidates: number;
    vettedOnlyCandidates: number;
    rejectedCandidates: number;
    acceptedCandidates: number;
    trackedHireOutcomes: number;
    requiredHireOutcomes: number;
    prescriptiveUnlocked: boolean;
  };
  candidates: AnalyticsCandidate[];
  insights: AnalyticsInsights;
}
```

Important semantics:

- `vettingScore` is the final consensus score.
- Per-expert scores are returned under each candidate's `reviews`.
- `publicName` is the expert display name used in product analytics.
- Rubric display should show what the rubric evaluates, for example `Technical depth` or `Ownership`, not necessarily the full internal rubric prompt.
- `selectedEndorsementAmount` is the total amount among selected endorsers.
- `totalBidAmount` is selected endorser amount plus bidders that were not selected.
- `prescriptiveUnlocked` stays false until enough hire outcomes exist. The UI can still show the locked/preview state to communicate future enterprise value.

404 behavior:

- If the job does not exist for the authenticated company, service throws `NotFoundError("Job")`.

## Data Sources

The endpoint reads from:

- `jobs`
- `candidate_proposals`
- `proposal_votes`
- `endorsement_bids`
- `hire_outcomes`
- `applications`
- `candidates`
- `candidate_guild_applications`
- `experts`

The migration adds analytics-specific persistence:

```sql
ALTER TABLE proposal_votes
  ADD COLUMN IF NOT EXISTS criteria_scores JSONB,
  ADD COLUMN IF NOT EXISTS criteria_evidence JSONB,
  ADD COLUMN IF NOT EXISTS criteria_labels JSONB,
  ADD COLUMN IF NOT EXISTS contributed_to_consensus BOOLEAN;

ALTER TABLE candidate_proposals
  ADD COLUMN IF NOT EXISTS consensus_algorithm_version VARCHAR(64),
  ADD COLUMN IF NOT EXISTS min_reviews_required INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS consensus_state VARCHAR(40) DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS consensus_ready_at TIMESTAMP;
```

Historical data caveat:

- Old proposal votes will not have `criteria_scores`, `criteria_evidence`, or `criteria_labels` unless backfilled or re-evaluated.
- Old consensus rows may have partial metadata. The service falls back where possible, but detailed rubric analytics require the new persisted fields.

## Verification Run Locally

Backend targeted tests passed:

```bash
npm test -- src/features/proposals/__tests__/proposal-vote-criteria.service.test.ts src/features/proposals/__tests__/proposal-finalization-analytics-metadata.test.ts src/features/companies/__tests__/company-analytics.job-detail.service.test.ts src/features/companies/__tests__/company-analytics.job-detail.controller.test.ts
```

Backend build passed:

```bash
npm run build
```

Frontend targeted tests passed:

```bash
npm test -- src/__tests__/analytics-job-detail.test.ts src/__tests__/analytics-workspace.test.tsx src/__tests__/analytics-page-fixture-mode.test.tsx
```

Frontend production build did not pass in the current real frontend branch:

```bash
npm run build
```

Observed failure after compile/typecheck:

```text
Cannot find module './5611.js'
Require stack:
- .next/server/webpack-runtime.js
- .next/server/pages/_document.js
```

The real frontend dev server also hit generated vendor chunk misses for packages such as `@wagmi` and `@rainbow-me`. This appears to be a branch-level Next generated chunk issue, not an analytics contract/type failure. The isolated analytics worktree built and ran successfully.

## Local Preview

Current working preview from the isolated analytics frontend worktree:

```text
http://localhost:50521/dashboard/analytics/job-google-backend-pilot
```

That preview uses the isolated worktree, not the real frontend repo. Fixture mode is intentionally development-only:

```bash
NEXT_PUBLIC_ANALYTICS_FIXTURE_MODE=true
```

There is no production fallback to fixture data.

## Ship Checklist

1. Apply migration `079_proposal_vote_criteria_for_analytics.sql`.
2. Deploy backend with the new endpoint.
3. Confirm company auth can access `GET /api/companies/me/analytics/jobs/:jobId`.
4. Confirm proposal vote creation sends/persists criteria scores, labels, evidence, and consensus contribution.
5. Decide whether historical votes need a backfill for criteria analytics.
6. Fix the current frontend Next generated chunk issue before production shipping.
7. Run frontend build again after the chunk issue is fixed.
8. Smoke test the analytics page against a real job with proposal votes, bids, and hire outcome rows.

## Files Added Or Changed For Analytics

Backend:

- `db/migrations/079_proposal_vote_criteria_for_analytics.sql`
- `src/features/companies/company-analytics.types.ts`
- `src/features/companies/company-analytics.service.ts`
- `src/features/companies/companies.controller.ts`
- `src/features/companies/companies.routes.ts`
- `src/features/companies/__tests__/company-analytics.job-detail.service.test.ts`
- `src/features/companies/__tests__/company-analytics.job-detail.controller.test.ts`
- `src/features/proposals/proposals.validation.ts`
- `src/features/proposals/proposals.service.ts`
- `src/features/proposals/proposal-finalization.service.ts`
- `src/features/proposals/__tests__/proposal-vote-criteria.service.test.ts`
- `src/features/proposals/__tests__/proposal-finalization-analytics-metadata.test.ts`

Frontend:

- `src/types/analytics.ts`
- `src/lib/api.ts`
- `src/components/dashboard/JobAnalyticsPage.tsx`
- `src/components/dashboard/analytics/CandidateEvidencePanel.tsx`
- `src/components/dashboard/analytics/CandidateRankingTable.tsx`
- `src/components/dashboard/analytics/JobAnalyticsWorkspace.tsx`
- `src/components/dashboard/analytics/RoleInsightsGrid.tsx`
- `src/components/dashboard/analytics/job-detail-fixture.ts`
- `src/components/dashboard/analytics/job-detail-helpers.ts`
- `src/__tests__/analytics-job-detail.test.ts`
- `src/__tests__/analytics-page-fixture-mode.test.tsx`
- `src/__tests__/analytics-workspace.test.tsx`
