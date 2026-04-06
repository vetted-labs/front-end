# AI Match Scores — MVP Design Spec

## Goal

Surface the backend's existing 5-dimensional match scoring across 7 frontend views, replacing inconsistent inline calculations with a unified backend-driven experience. Badge on list views, full breakdown on detail pages. Expansion hook for LLM explanations in Phase B.

## Context

**What already exists:**

Backend (built, deployed):
- `GET /api/matching/calculate?candidateId=X&jobId=Y` → `{ totalScore, breakdown: { skills, experience, location, guild, salary } }`
- `GET /api/jobs/:id/top-matches?limit=N` → `[{ candidateId, score, breakdown }]`
- `GET /api/candidates/:id/recommended-jobs?guildId=G&limit=N` → `[{ jobId, score, breakdown }]`
- Score computation: Jaccard similarity on skills (40%), experience range (20%), location match (15%), guild membership (10%), salary overlap (15%)
- Stores results in `applications.match_score` and `match_score_analytics` table
- 123 hardcoded tech keywords for skill extraction

Frontend (partial):
- `src/lib/matchScore.ts` — client-side Jaccard similarity (skills only, no other dimensions)
- `src/components/ui/match-score-badge.tsx` — compact badge with Sparkles icon, tooltip, color coding
- `EndorsementModal.tsx` / `CandidateDetailsModal.tsx` — inline substring matching (inconsistent with matchScore.ts)
- `GuildJobsTab.tsx` / `GuildJobApplicationsTab.tsx` — display `application.matchScore` from API when available

**What's missing:**
- Frontend API client has no `matchingApi` namespace — backend endpoints aren't called
- 4 of 7 target views have zero match score display
- 2 views use inconsistent inline calculation instead of backend scores
- No breakdown component exists (only the compact badge)

## Architecture

```
matchingApi (new in api.ts)
    ├── calculate(candidateId, jobId) → MatchScoreResult
    ├── getTopMatches(jobId, limit?) → MatchScoreResult[]
    └── getRecommendedJobs(candidateId, guildId?, limit?) → RecommendedJob[]

MatchScoreBadge (exists) — compact badge for list views
    └── Shows: "85%" + color + Sparkles icon + tooltip

MatchScoreBreakdown (new component) — detail panel for detail views
    └── Shows: total score + 5 dimension bars + matched/missing skills
    └── Props: score, breakdown, matchedSkills?, missingSkills?, explanation? (Phase B hook)
```

## Types

```typescript
interface MatchScoreResult {
  totalScore: number; // 0-100
  breakdown: {
    skills: { score: number; weight: number; details?: string };
    experience: { score: number; weight: number; details?: string };
    location: { score: number; weight: number; details?: string };
    guild: { score: number; weight: number; details?: string };
    salary: { score: number; weight: number; details?: string };
  };
  matchedSkills?: string[];
  missingSkills?: string[];
}

interface RecommendedJob {
  jobId: string;
  title: string;
  company: string;
  matchScore: number;
  breakdown: MatchScoreResult["breakdown"];
}
```

## Components

### MatchScoreBreakdown (new)

File: `src/components/ui/match-score-breakdown.tsx`

Renders a card with:
- Total score number + label ("Strong Match" / "Good Match" / "Partial Match" / "Low Match") — same thresholds as MatchScoreBadge (80/60/40)
- 5 horizontal progress bars with dimension labels and percentage
- Matched skills as green tag pills, missing skills as muted tag pills
- Optional `explanation` string prop (empty for Phase A, populated in Phase B)

Uses `STATUS_COLORS` from `@/config/colors` for bar colors (positive for >=80, info for >=60, warning for >=40, neutral below).

Dimensions labeled as: Skills, Experience, Location, Guild, Salary.

### MatchScoreBadge (exists, minor update)

File: `src/components/ui/match-score-badge.tsx`

Already works. May need to accept `score` as a number directly (from backend) in addition to the current skill-list-based calculation. Check if it already does.

## 7 Integration Surfaces

### Surface 1: Browse Jobs — Badge on Job Cards

**File:** `src/components/browse/JobsListing.tsx`

For authenticated candidates, fetch recommended jobs with match scores:
```
const { data: recommendations } = useFetch(
  () => matchingApi.getRecommendedJobs(candidateId),
  { skip: !candidateId }
);
```

Create a lookup map `jobId → matchScore`. On each job card, if a score exists, render `<MatchScoreBadge score={score} />`.

For unauthenticated users, no badge shown (no candidate profile to match against).

### Surface 2: Browse Job Detail — Breakdown in Sidebar

**File:** `src/components/browse/JobDetailView.tsx`

For authenticated candidates, fetch match score for this specific job:
```
const { data: matchData } = useFetch(
  () => matchingApi.calculate(candidateId, jobId),
  { skip: !candidateId || !jobId }
);
```

Render `<MatchScoreBreakdown>` in the sidebar, above or below the company info card. Only shown when the candidate is logged in and data is available.

### Surface 3: Candidate Dashboard — Recommended Jobs Section

**File:** `src/components/candidate/CandidateDashboard.tsx`

Add a "Recommended for You" section using:
```
const { data: recommended } = useFetch(
  () => matchingApi.getRecommendedJobs(candidateId, undefined, 6),
  { skip: !candidateId }
);
```

Render as a grid of job cards (reuse existing `JobCard` or a compact version) with match score badges. Link each to `/browse/jobs/{jobId}`. Show only when recommendations exist (hide section entirely if empty or API fails).

### Surface 4: ATS Candidates — Badge on Candidate Rows

**File:** `src/components/dashboard/candidates/CandidateListPanel.tsx`

For each candidate in the list, fetch top matches for the job:
```
const { data: topMatches } = useFetch(
  () => matchingApi.getTopMatches(selectedJobId, 50),
  { skip: !selectedJobId }
);
```

Create lookup map `candidateId → matchScore`. On each candidate row, if score exists, render compact `<MatchScoreBadge>`.

### Surface 5: Candidate Detail Panel — Breakdown Card

**File:** `src/components/dashboard/candidates/CandidateDetailPanel.tsx`

When a candidate is selected and a job context exists, fetch the full match:
```
const { data: matchData } = useFetch(
  () => matchingApi.calculate(candidateId, jobId),
  { skip: !candidateId || !jobId }
);
```

Render `<MatchScoreBreakdown>` as a card in the detail panel, alongside guild report and endorsement data.

### Surface 6: Endorsement Marketplace — Badge on Application Cards

**File:** `src/components/EndorsementMarketplace.tsx`

Replace the existing inline skill matching calculation with the backend score. The `application` objects in the endorsement marketplace should have `matchScore` from the API (computed at application time). If available, use it directly. If not, fetch via `matchingApi.calculate`.

Render `<MatchScoreBadge score={application.matchScore} />` on each application card.

### Surface 7: Candidate Details Modal — Breakdown

**File:** `src/components/endorsements/CandidateDetailsModal.tsx`

Replace the inline `skillMatchData` calculation (lines 54-69) with the backend score. Fetch:
```
const { data: matchData } = useFetch(
  () => matchingApi.calculate(candidateId, jobId),
  { skip: !candidateId || !jobId }
);
```

Render `<MatchScoreBreakdown>` in the modal, replacing the current basic skill match display.

## Cleanup

After wiring all 7 surfaces to the backend:
- Remove inline skill matching from `EndorsementModal.tsx` (lines 46-59)
- Remove inline skill matching from `CandidateDetailsModal.tsx` (lines 54-69)
- Keep `src/lib/matchScore.ts` as a client-side fallback if the backend call fails — but it should only be used as a graceful degradation, not the primary source

## Phase B Expansion: LLM Explanations

Not in scope for this implementation. Design hook:

- `MatchScoreBreakdown` accepts optional `explanation?: string` prop
- When populated, renders a paragraph below the dimension bars with an AI icon
- Backend would add a `POST /api/matching/explain` endpoint that takes candidateId + jobId and returns a 2-3 sentence LLM-generated explanation
- Frontend would call this lazily (user clicks "Why this score?" button) to avoid unnecessary API costs
- No component changes needed — just populate the prop

## Error Handling

- All match score fetches use `useFetch` with `skip` when IDs aren't available
- If any fetch fails, the badge/breakdown simply doesn't render (graceful absence, not error state)
- The existing `MatchScoreBadge` already handles `undefined` score gracefully
- No toast errors for match score failures — these are supplementary data, not critical

## Not In Scope

- LLM explanation generation (Phase B)
- Match score notifications ("New job matches your profile 90%!")
- Match score analytics/trending for candidates
- Recomputing scores when candidate profile changes (backend handles this)
- Admin view of match score distribution
