# Vetted: Platform Overview & Enterprise Pilot Plan

---

## Part 1: What Vetted Is

Vetted is a decentralized hiring platform where domain experts evaluate candidates through guild-based vetting, staking their reputation and tokens on the quality of their assessments. Companies post jobs, candidates apply, and guilds of verified experts independently score candidates against structured rubrics. Consensus determines outcomes. Experts who evaluate accurately build reputation and earn rewards; those who deviate from consensus get slashed.

The core thesis: hiring decisions are better when made by people with real domain expertise and real skin in the game, rather than recruiters pattern-matching on keywords.

### Three User Types

| User | Role | Auth |
|------|------|------|
| **Company** | Posts jobs, reviews guild reports, hires candidates | Email/password, JWT |
| **Candidate** | Applies to jobs, gets evaluated by guild experts | Email/password or LinkedIn OAuth, JWT |
| **Expert** | Joins guilds, evaluates candidates, stakes reputation | Wallet (MetaMask/Coinbase) + optional email, JWT + wallet signature |

### Eight Domain Guilds

Engineering, Product, Design, Marketing, Sales, Operations, Finance, HR. Each guild has its own member hierarchy, reputation ladder, and evaluation rubrics.

### Expert Hierarchy (Per Guild)

`Recruit → Apprentice → Craftsman → Officer → Master`

Progression is based on reputation score within the guild. Guild Masters are elected via governance proposals.

---

## Part 2: How Vetted Works (User Flows)

### 2.1 Expert Onboarding

1. Expert connects wallet (MetaMask or Coinbase Wallet)
2. Selects a guild to apply to (e.g., Engineering)
3. Fills out multi-step application:
   - Resume and social links (LinkedIn, portfolio)
   - General questions (learning from failure, decision-making under uncertainty, motivation, how they'd improve the guild)
   - Guild-specific questions pulled from the guild's application template (varies by expertise level)
   - No-AI declaration checkbox
   - Wallet verification (signature challenge)
4. Application submitted → 3-5 existing guild members randomly assigned as reviewers
5. Each reviewer independently scores the applicant against structured criteria (technical ability, communication, cultural fit, domain-specific rubrics)
6. Majority decision: if approvals ≥ ⌊(panel size / 2)⌋ + 1 → approved; same threshold for rejection
7. Approved → expert becomes a `recruit` in the guild with 0 reputation
8. Rejected → can appeal (stakes to challenge, fresh arbitration panel reviews)

### 2.2 Candidate Evaluation (The Core Vetting Flow)

This is the mechanism the entire platform is built around.

**Step 1: Candidate enters the system**
- Candidate applies to a job posted by a company
- OR candidate applies directly to a guild for membership
- Application includes resume, cover letter, screening question answers, social links

**Step 2: Panel selection**
- 3-5 guild experts randomly selected as reviewers from eligible guild members
- Selection considers reputation tier, recent activity, and expertise match
- Reviewers are assigned via `candidate_guild_application_reviewer_assignments`

**Step 3: Independent scoring**
- Each reviewer scores the candidate against the guild's rubric (criteria like technical skill, communication, cultural fit — each scored individually)
- Reviewers cannot see each other's scores
- Each reviewer also provides a confidence level (1-5) and written feedback
- Overall score derived from criteria scores (0-100 scale)

**Step 4: Consensus calculation (IQR algorithm)**
- All reviewer scores collected after panel completes
- Interquartile Range (IQR) calculated:
  1. Sort scores ascending
  2. Calculate Q1 (25th percentile), median, Q3 (75th percentile)
  3. IQR = Q3 - Q1
  4. Inclusion band: [median - 0.75 × IQR, median + 0.75 × IQR]
  5. Consensus score = average of scores within the inclusion band
  6. Scores outside the band are "outliers" — penalized
- Bimodal detection: if scores cluster into two distinct groups (gap > 30 points, each cluster spread < 25 points), a tiebreaker reviewer is assigned. Tiebreaker's score determines which cluster "wins."
- Outcome: consensus score ≥ 60 → **approved**, < 60 → **rejected**

**Step 5: Reputation consequences**

| Deviation from Consensus | Reputation Change | Stake Slashed |
|---|---|---|
| Aligned (within IQR) | +10 | 0% |
| Mild (1–1.5× IQR) | -5 | 5% |
| Moderate (1.5–2× IQR) | -10 | 15% |
| Severe (>2× IQR) | -20 | 25% |

**Step 6: Rewards**
- Total reward pool = 10 VETD × number of aligned voters
- Distributed proportionally by reputation tier weight:
  - Foundation (0-999 rep): 1.0× weight
  - Established (1,000-1,999 rep): 1.25× weight  
  - Authority (2,000+ rep): 1.50× weight
- Formula: `Your Reward = (Your Weight / Total Aligned Weights) × Pool`

**Step 7: Results surface**
- Company sees: guild report with consensus score, pass/fail, aggregated feedback
- Candidate sees: outcome, any feedback shared
- Experts see: their score vs. consensus, reputation change, reward earned, slashing if any

### 2.3 Commit-Reveal Voting (On-Chain Variant)

For higher-stakes evaluations, the platform supports a two-phase voting protocol:

1. **Commit phase** (default 48 hours): Experts submit a hash of their score + nonce. Score is hidden.
   - Hash: `keccak256(solidityPacked([score, nonce]))`
   - On-chain: vetting session created via smart contract
2. **Reveal phase**: Experts submit their plaintext score + nonce. System verifies hash matches.
   - Score mapped from 0-100 (backend) to 1-10 (contract)
3. **Finalization**: Same IQR consensus as direct voting, but with cryptographic guarantees that scores weren't changed after seeing others.

Auto-reveal triggers when all panelists have committed.

### 2.4 Endorsement & Hire Accountability

After a candidate passes guild vetting and gets a job application:

1. **Endorsement bidding** (24 hours): Any guild expert can stake VETD tokens endorsing a candidate for a specific role. Top 3 endorsers by bid amount are active.
2. **Company hires**: Company reports hire outcome.
   - **Hired**: Top 3 endorsers earn 7% of final compensation, split equally.
     - 50% paid immediately
     - 50% locked for 90 days (retention period)
   - **Not hired**: Top 3 endorsers slashed 10% of their bid. Can appeal within 14 days.
3. **90-day retention tracking**:
   - Candidate performs well → locked rewards released to endorsers
   - Performance issue reported → locked rewards forfeited
   - Company rates the hire (1-5)
4. **Disputes**: Either party can file a dispute. Arbitration panel of guild experts votes. Appeal window of 7 days.

### 2.5 Company Experience

1. **Post jobs**: Title, description, skills, salary range, location, screening questions. Jobs link to a specific guild.
2. **Receive applications**: Pipeline view (pending → reviewing → interviewed → accepted/rejected)
3. **Guild reports**: For each candidate, see the guild's consensus score, number of reviewers, feedback summary, pass/fail recommendation.
4. **Candidate messaging**: Direct messaging with candidates, meeting scheduling.
5. **Dashboard**: Active jobs count, total applicants, average time-to-hire, recent activity feed, hiring pipeline kanban.
6. **Multi-recruiter teams**: Admin/manager/recruiter roles. Invite by email, role-based access control.
7. **Activity log**: Audit trail of all company actions (job created, status changed, messages sent, meetings scheduled).

### 2.6 Governance

Guild experts can create and vote on governance proposals:
- Parameter changes (evaluation thresholds, reward amounts)
- Guild master elections (term-based, tracked in `guild_master_terms`)
- Guild rule changes
- Voting power weighted by reputation + guild master multiplier

### 2.7 Guild Community

Each guild has a social feed:
- Posts, replies, reactions
- Polls (with vote casting)
- Question/answer format (accepted answers)
- Moderation tools

---

## Part 3: Technical Architecture

### 3.1 Frontend

**Stack**: Next.js 15 (App Router), React 19, TypeScript (strict), TailwindCSS 4, Radix UI primitives

**Provider chain** (wraps the entire app):
```
WagmiProvider → QueryClientProvider → RainbowKitProvider → ThemeProvider → AuthProvider + ErrorBoundary
```

**Auth**: `AuthContext` manages three user types. Stores JWT tokens + user type + IDs in localStorage. Experts can auth via wallet alone (no token required). Automatic token refresh on 401 responses. `auth-token-refreshed` custom event syncs API layer with context.

**API layer** (`src/lib/api.ts`, ~1,800 lines): Single `apiRequest<T>()` function handles:
- Bearer token injection (candidates/companies) or X-Wallet-Address header (experts)
- Response envelope unwrapping (`{ success, data }` → `data`)
- GET request deduplication (prevents 429s from concurrent identical requests)
- Automatic 401 → token refresh → retry
- Error sanitization (XSS prevention)
- `FormData` support for file uploads

22 API namespaces: `authApi`, `jobsApi`, `companyApi`, `candidateApi`, `expertApi`, `guildsApi`, `guildFeedApi`, `blockchainApi`, `guildApplicationsApi`, `governanceApi`, `endorsementAccountabilityApi`, `messagingApi`, `commitRevealApi`, `notificationsApi`, `companyNotificationsApi`, `candidateNotificationsApi`, `teamApi`, `applicationsApi`, `dashboardApi`, `guildAppealApi`, `analyticsApi`, `matchingApi`

**Route structure**:
```
/auth/login, /auth/signup, /auth/linkedin/callback
/candidate/dashboard, /candidate/profile, /candidate/applications, /candidate/guilds, /candidate/messages
/company/dashboard, /company/jobs, /company/candidates, /company/settings
/expert/dashboard, /expert/reputation, /expert/endorsements, /expert/earnings, /expert/proposals
/guilds, /guilds/[guildId], /guilds/[guildId]/apply
/browse (job browsing)
/jobs/[jobId], /jobs/new
/dashboard/overview, /dashboard/candidates, /dashboard/jobs/[jobId], /dashboard/settings
```

**Key patterns**:
- Page files are thin shells; all logic in components
- `useFetch`/`useApi` hooks for data fetching (never manual useState + useEffect + try/catch)
- `useRequireAuth(userType)` for auth guards
- `useClientPagination` for client-side pagination
- Color tokens via centralized `@/config/colors` (never hardcoded Tailwind colors)
- Error display: `toast.error()` for transient, `<Alert>` for persistent

**Component count**: ~200+ components across 51 directories. Key areas:
- `src/components/expert/` (41 files) — evaluation UI, reputation, earnings
- `src/components/guild/` (28 files) — guild management, reviews, applications
- `src/components/dashboard/` (24 files) — company dashboard
- `src/components/endorsements/` (13 files) — endorsement marketplace
- `src/components/candidate/` (14 files) — candidate profile and applications
- `src/components/ui/` (48 files) — shared primitive components

### 3.2 Backend

**Stack**: Node.js, Express 5, TypeScript, PostgreSQL (via `pg`), Redis (caching + rate limiting), ethers.js 6 (blockchain), Zod 4 (validation), Pino (logging), Resend (email)

**Architecture**: Controller → Service → Database (pool.query or withTransaction). All errors are typed (`NotFoundError`, `ConflictError`, `ValidationError`, `ForbiddenError`, `UnauthorizedError`). Async handler wrapper catches errors and maps to HTTP status codes.

**Auth**: JWT access tokens (15 min) + refresh tokens (30 days) with rotation and reuse detection. Device fingerprinting. Multi-session support. Three middleware variants: `verifyCandidateToken`, `verifyCompanyToken`, `verifyExpertToken`, plus `verifyAnyUser`.

**Security**: Helmet, CORS (configurable origins), Redis-backed rate limiting, Row-Level Security context, request timeout (30s default, 60s for blockchain routes), request logging.

**Database**: PostgreSQL, 75 migrations. Key table groups:
- **Core**: `companies`, `candidates`, `experts`, `guilds`, `jobs`, `applications`
- **Evaluation**: `candidate_guild_applications`, `candidate_guild_application_reviews`, `candidate_guild_application_reviewer_assignments`, `candidate_proposals`, `proposal_votes`, `proposal_reviewer_assignments`
- **Reputation**: `expert_reputation_log`, `expert_earnings`, `guild_memberships` (with `reputation_in_guild`, `earnings_in_guild`)
- **Endorsement**: `endorsements`, `endorsement_bids`, `hire_outcomes`, `endorsement_rewards`, `endorsement_disputes`, `arbitration_panel_members`
- **Governance**: `governance_proposals`, `governance_votes`, `guild_master_terms`
- **Blockchain**: `expert_guild_stakes`, `expert_reputation_blockchain`, `pending_blockchain_ops`, `blockchain_transactions`, `blockchain_events`, `slashing_records`
- **Operations**: `company_team_members`, `company_activity_log`, `expert_notifications`, `company_notifications`, `notification_outbox`, `audit_log`

**Guild application templates**: Stored as JSONB in `guild_application_templates`. Each template defines questions, stage, level, topic. Rubrics are per-guild, per-level.

**Company team system**: `company_team_members` table with roles (admin/manager/recruiter), invitation flow (pending → active), soft deactivation.

**Background jobs** (node-cron):
- Blockchain ops processing (30s interval)
- Proposal finalization (60s)
- Session cleanup (daily)
- Audit cleanup (monthly)
- Blockchain event listener (5 min)

**On-chain outbox pattern**: All blockchain operations (reward distribution, vetting session creation, stake syncing) go through `pending_blockchain_ops` table. A cron job picks them up and executes them against smart contracts. This decouples the user-facing flow from blockchain latency.

### 3.3 Operational

**Deployment**: Frontend on Vercel, backend on Railway (inferred from proxy trust and CORS config).

**Environment**: `NEXT_PUBLIC_API_URL` points frontend to backend. `dotenv-cli` loads `.env.local` in dev.

**Monitoring**: Pino structured logging. Admin health endpoint (`/api/v1/admin/health/detailed`, protected by CRON_SECRET). Rate limit stats endpoint.

**Email**: Resend for transactional email (notifications, invitations).

**Blockchain**: Ethereum-compatible chain. Smart contracts for staking, reputation, vetting sessions, rewards. ethers.js v6 for interaction. Contract ABIs loaded from config.

---

## Part 4: The Enterprise Pilot Idea

### What It Is

A controlled pilot with one or two partner companies to prove that Vetted's evaluation architecture works in a real hiring environment. The company's own team becomes the evaluation panel — same infrastructure as the full Vetted protocol, scoped to one organization instead of domain guilds.

**This is not a pivot.** Expert seeding into public guilds continues. This is a parallel proof track that runs alongside the main product.

### Why It Matters

Three problems solved simultaneously:

1. **Real outcome data**: Theoretical white papers don't convince investors. A case study with actual candidates, actual evaluations, and actual hire outcomes does.
2. **Cold-start bypass**: Instead of waiting for guilds to fill with experts before the mechanism can run, we get it running immediately with an existing team.
3. **Credibility**: One real story beats a hundred theoretical arguments. Named company, real numbers, real outcomes.

### How It Maps to Vetted

| Vetted Protocol | Enterprise Pilot |
|---|---|
| Domain guild (e.g., Engineering) | Company's internal evaluation team |
| External expert | Team member / internal evaluator |
| Guild application | Company onboards their team |
| Candidate guild application | Candidate enters the evaluation pipeline |
| Random panel selection | Random evaluator selection from company team |
| Independent scoring against rubric | Same — 10-minute scoring session |
| IQR consensus | Same algorithm — surfaces agreement and divergence |
| Reputation score | "Proof of taste" — accuracy track record per evaluator |
| VETD staking / slashing | Points-based simulation (symbolic, not economic) |
| Endorsement | Optional: team members stake confidence on specific candidates |
| Hire outcome tracking | Same — 90-day retention, performance signals |

### What Changes

**Removed**: Blockchain, wallets, token economics, commit-reveal, governance, external guild discovery, smart contract interactions.

**Simplified**: Auth is email/password only (no wallet). Reputation uses points not tokens. Slashing is symbolic (point deductions, not financial). No guild master elections — the company admin owns everything.

**Added**: Company-specific rubric builder (Week 0 co-creation). HR pre-filter option (candidates screened before reaching broader team). Evaluator onboarding flow (invite by email, no guild application process). Pilot-specific reporting dashboard (for case study data).

### Pilot Timeline

**Week 0 (setup)**: Meet with company decision-maker. Walk through current hiring process. Co-define evaluation rubrics for open roles. Team members create accounts.

**Weeks 1-2 (first candidates)**: Candidates enter system. Random evaluators assigned. Each evaluator spends ~10 minutes scoring against rubric independently. Consensus forms or doesn't. System surfaces pass/fail with reasoning.

**Weeks 3-8 (running)**: More candidates flow through. Company sees patterns — where evaluators agree, where they diverge, which criteria actually differentiate. Endorsement layer optional in this phase. Each team member builds internal reputation score.

**Weeks 9-10 (wrap)**: Review everything. Candidate volume, consensus strength, evaluation accuracy vs. hire outcomes. Company feedback. Raw material for case study.

**Post-pilot**: Track 90-day retention and performance for any hires. Cost comparison vs. previous approach. Time-to-decision metrics.

### What We Get

- A written case study (investor-grade)
- Video/testimonial from company decision-maker (ideally)
- Real data on panel consensus, evaluation accuracy, process fit
- Proof that the architecture works in a live environment

---

## Part 5: Implementation Approach

### Architecture Decision: Parallel Routes, Shared Core

Don't feature-flag every component. Don't fork the app. Instead:

- **Backend**: New `src/features/pilot/` module that wraps existing guild, review, consensus, and reputation services with company-scoping. Existing services stay untouched.
- **Frontend**: New `/pilot/` route group with its own page shells, reusing existing components (leaderboard, reputation timeline, stat cards, modals, UI primitives).

This keeps the main app clean, lets the pilot diverge where needed, and can be removed or promoted to a full feature later.

### Backend Changes

**Database (1-2 migrations)**:
```
companies table:
  + is_pilot_company BOOLEAN DEFAULT false
  + pilot_guild_id UUID REFERENCES guilds(id)

company_team_members table:
  + is_evaluator BOOLEAN DEFAULT false
  + evaluator_points INTEGER DEFAULT 0
  + evaluations_completed INTEGER DEFAULT 0
  + accuracy_score DECIMAL(5,2)

New: pilot_evaluation_rubrics table
  - company_id, role_name, criteria (JSONB), created_by, created_at

New: pilot_evaluation_batches table (optional)
  - company_id, role_name, status, candidate_count, evaluations_completed
```

**New feature module** (`src/features/pilot/`):
- `pilot.routes.ts` — ~10-15 endpoints mounted on `/api/v1/pilot/`
- `pilot.controller.ts` — thin controller
- `pilot-setup.service.ts` — company onboarding, rubric creation, evaluator activation
- `pilot-evaluation.service.ts` — wraps candidate review service, scoped to company team. Reuses existing panel assignment logic and IQR consensus, but draws from `company_team_members WHERE is_evaluator = true` instead of guild members.
- `pilot-reputation.service.ts` — wraps reputation service with points instead of tokens. No blockchain sync. Same aligned/misaligned tiers but with point values.
- `pilot-reporting.service.ts` — aggregates pilot data for case study (consensus patterns, evaluator accuracy, time-to-decision, candidate volume)

**What gets reused directly (no changes)**:
- `voting-consensus.service.ts` — IQR algorithm works as-is
- `applications.service.ts` — application pipeline
- `company-notifications.service.ts` — notification delivery
- `company-team.service.ts` — team management
- `hire-accountability.service.ts` — outcome tracking (minus blockchain reward distribution)
- Auth middleware (company token verification)
- Zod validation patterns
- Error handling (typed errors, async handler)

### Frontend Changes

**New route group** (`src/app/pilot/`):
```
src/app/pilot/
├── layout.tsx              — Pilot-specific sidebar (simpler than expert layout)
├── page.tsx                — Pilot dashboard overview
├── setup/page.tsx          — Rubric builder, team evaluator activation
├── evaluate/page.tsx       — Queue of candidates to evaluate
├── candidate/[id]/page.tsx — Scoring interface for a single candidate
├── results/page.tsx        — Consensus results per candidate
├── leaderboard/page.tsx    — Team accuracy rankings
└── report/page.tsx         — Pilot summary / case study data
```

**New components (~5-7)**:
- `PilotDashboard` — Overview: candidates in pipeline, pending evaluations, team accuracy summary
- `EvaluationCard` — The 10-minute scoring interface. Rubric criteria displayed, 0-100 slider per dimension, confidence level, written feedback. This is the most important component — it needs to feel fast and effortless.
- `RubricBuilder` — Company admin creates/edits evaluation criteria per role. JSONB structure matching existing `guild_application_templates` format.
- `PilotOnboarding` — Team member activation flow. Company admin invites evaluators; they click a link, set a password, done. No wallet, no guild application.
- `ConsensusResultsView` — Adapted from `FinalizedView`. Shows where evaluators agreed/diverged, consensus score, outcome. No blockchain/slashing display.
- `PilotLeaderboard` — Adapted from `GuildLeaderboardTab`. Ranks evaluators by accuracy score instead of reputation.
- `PilotReport` — Aggregated pilot metrics for case study generation.

**Reused components (props/config changes only)**:
- `StatCard` — dashboard KPIs
- `ReputationTimeline` — evaluator accuracy history
- `GuildLeaderboardTab` — evaluator rankings (rename columns)
- `CandidateDetailModal` — candidate profile view
- `EmptyState`, `Alert`, `Modal`, `Button`, etc. — all UI primitives
- `ApplicationStatusBadge` — pipeline status display

### Auth for Evaluators

Extend the existing `company_team_members` model rather than creating a new user type. Evaluators are team members with `is_evaluator = true`. They authenticate the same way company users do (email/password, JWT). The pilot dashboard checks this flag.

This means:
- No changes to `AuthContext` user types
- Company admin sees pilot features if `is_pilot_company = true`
- Evaluators access `/pilot/evaluate` using their existing company team auth
- All existing company middleware works

### What Stays Out of MVP

- Blockchain anything
- Wallet connection
- Token economics / VETD
- Commit-reveal protocol
- Governance
- External guild discovery
- Guild master elections
- Endorsement bidding (optional Phase 2)
- Guild feed / community
- Candidate self-service application (company uploads candidates in MVP)

---

## Part 6: Open Questions

### Product & Design

1. **Candidate entry point**: Do candidates apply through a Vetted-branded interface, or does the company upload/import them? If candidates use Vetted directly, they'll see the full platform — is that desired during a private pilot? If the company uploads them, we need a CSV import or manual entry form.

2. **Branding**: Should the pilot UI be Vetted-branded or white-labeled for the partner company? Full Vetted branding reinforces "same infrastructure." White-labeling makes the company feel ownership. Affects how the case study reads.

3. **Evaluator anonymity**: In the full Vetted model, expert identities are revealed after finalization. In an internal team, everyone knows each other. Does showing who scored what create social pressure? Should scores stay permanently anonymous within the company? Or is transparency part of the value?

4. **Rubric depth**: How structured should the scoring rubric be? Options range from "rate this candidate 0-100" (simple, fast) to "score across 7 weighted criteria with justification for each" (rich data, slower). The 10-minute promise constrains this. What's the minimum rubric that produces useful signal?

5. **Consensus threshold**: The existing 60/100 threshold for approval — does this make sense for an internal company context? Should the company be able to set their own threshold? Should it be per-role?

6. **Panel size**: 3-5 reviewers works for guilds with hundreds of experts. If a 15-person company has 2-3 open roles, and candidates flow through at 3-5/week, will evaluators feel overloaded? What's the right panel size for a small team? Is 3 enough?

7. **HR pre-filter**: The pilot doc mentions optionally routing candidates through HR first. How does this work in the system? Does the HR person review and approve before the candidate enters the evaluation pool? Or do they just tag/categorize?

8. **What does "10 minutes" actually look like?** The pilot promises evaluators spend ~10 minutes per candidate. That means the scoring UI needs to present: candidate resume/profile, rubric criteria, and scoring inputs — all in one view with zero friction. Is there an existing analog in the expert review flow, or does this need to be purpose-built?

### Technical

9. **Database isolation**: Should pilot data live in the same tables as main Vetted data (with `company_id` scoping), or in separate pilot-specific tables? Same tables means all existing queries and joins work. Separate tables means cleaner separation but more code.

10. **Points vs. reputation**: The pilot uses "points" instead of reputation to avoid confusion with the real token-backed system. But the IQR algorithm and slashing tiers are the same. Should the point values match reputation values (±10, ±20) or be on a different scale? Should we call it "accuracy score" instead of "reputation"?

11. **Notifications**: Should pilot evaluators get the same notification types as experts (new candidate to review, deadline approaching, results ready)? Email notifications too, or just in-app? The existing `company_notifications` system covers companies but not individual team members acting as evaluators.

12. **Reporting granularity**: What metrics does the case study actually need? The pilot doc mentions: panel consensus patterns, evaluation accuracy vs. hire outcomes, cost comparison, time-to-decision. Do we build a dedicated reporting dashboard, or is this a manual data pull at the end?

13. **Multi-role evaluation**: If a company has roles across engineering and operations, should there be separate evaluation rubrics per role (likely yes), and separate evaluator pools per role? Or does the whole team evaluate every candidate regardless of department?

14. **Existing candidate/company accounts**: If the pilot company already has a Vetted company account, do we upgrade it? If candidates who enter the pilot already have Vetted candidate accounts, do those link? Or is the pilot a completely isolated track?

### Operational & Business

15. **Pilot company selection**: The doc describes the ideal partner (10+ people, 2-3 functions, actively hiring, single decision-maker, Web3-native or remote-first). Do we have warm intro paths to companies fitting this profile? What if the first partner doesn't fit all criteria — which ones are non-negotiable?

16. **Weekly check-in scope**: The 30-minute weekly COO check-in with the company champion — is this just "how's it going" or does it include looking at data together? Should the pilot dashboard have a shared view the COO can present during these calls?

17. **Case study negotiation**: The doc pushes for fully named partnership first, falls back to anonymized. When in the process does this get decided — before the pilot starts, or after results are in? If before, does it go in the agreement?

18. **Team bandwidth**: CTO adapts the product, COO owns the pilot, CEO continues expert seeding. How much CTO time does the product adaptation actually require? The doc says "scoping and configuration, not a rebuild" — is that accurate given the changes listed above?

19. **Candidate sourcing**: The pilot needs 20-30 candidates over 10 weeks. Where do they come from? The company's existing pipeline? Job boards? Does Vetted help source, or is that entirely the company's responsibility?

20. **Success criteria**: What specifically makes the pilot a "success" vs. "failure"? Is it evaluation volume (20-30 candidates processed)? Consensus quality (evaluators agree above some threshold)? Hire outcomes (candidates rated highly by the system actually perform well)? Company satisfaction (they'd do it again)? All of the above?

21. **What happens after**: If the pilot succeeds, what's the immediate next step? Onboard a second company? Start converting the pilot company to external guilds? Use the case study to raise? The answer shapes how much we invest in making the pilot infrastructure reusable vs. throwaway.

22. **Transition path to full Vetted**: The doc mentions two outcomes — company keeps it internal (still on Vetted infrastructure) or graduates to external guilds. What does "graduating" actually look like technically? Is it flipping `is_pilot_company` to false and opening their evaluations to external experts? Or is it a migration?

23. **Pricing post-pilot**: The pilot is free. If the company wants to keep using it, what do they pay? Is this the `enterprise` subscription tier that already exists in the `companies` table? What does it include?

---

## Appendix: Key Files Reference

### Backend
| Area | File |
|------|------|
| Auth middleware | `src/features/auth/auth.middleware.ts` |
| Token service | `src/features/auth/token.service.ts` |
| Guild management | `src/features/guilds/guild-management.service.ts` |
| Guild membership | `src/features/guilds/guild-membership.service.ts` |
| Candidate review | `src/features/candidate-proposals/candidate-proposal-review.service.ts` |
| IQR consensus | `src/features/proposals/voting-consensus.service.ts` |
| Proposal finalization | `src/features/proposals/proposal-finalization.service.ts` |
| Reputation | `src/features/experts/reputation.service.ts` |
| Hire accountability | `src/features/endorsements/hire-accountability.service.ts` |
| Commit-reveal | `src/features/proposals/commit-reveal.service.ts` |
| Company teams | `src/features/companies/company-team.service.ts` |
| Company notifications | `src/features/companies/company-notifications.service.ts` |
| App/routes | `src/app.ts` |
| Schema | `src/db/migrations/001_initial_schema.sql` |

### Frontend
| Area | File |
|------|------|
| Auth context | `src/contexts/AuthContext.tsx` |
| API client | `src/lib/api.ts` |
| Provider stack | `src/app/layout.tsx` |
| Expert review UI | `src/components/expert/ReviewSubmitStep.tsx` |
| Finalization display | `src/components/expert/FinalizedView.tsx` |
| Reputation explanation | `src/components/expert/HowReputationWorks.tsx` |
| Endorsement marketplace | `src/components/expert/EndorsementsPage.tsx` |
| Guild application flow | `src/components/guild/GuildApplicationFlow.tsx` |
| Company dashboard | `src/components/dashboard/CompanyDashboardOverview.tsx` |
| Guild types | `src/types/guild.ts` |
| Expert types | `src/types/expert.ts` |
| Candidate types | `src/types/candidate.ts` |
| Color tokens | `src/config/colors.ts` |
| Constants | `src/config/constants.ts` |
