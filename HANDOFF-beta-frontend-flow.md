# Beta Frontend Flow Handoff

Last updated: 2026-04-28 16:56 CEST

## Slice 0 Contract Gate

Status: backend contracts implemented in the backend pass. Frontend flow fixes, server-derived reviewer identity, and scoped resume download-url routes now have focused test/build proof.

### Review Identity Contract

- Backend must derive reviewer identity server-side from a verified session or wallet-auth proof.
- Backend must ignore client-controlled `wallet`, `walletAddress`, and `X-Wallet-Address` as authorization facts for review submission.
- A forged low-privilege request must fail for:
  - `POST /api/experts/guild-applications/:applicationId/review`
  - `POST /api/guilds/candidate-applications/:applicationId/review`
  - `POST /api/proposals/:applicationId/vote`
- Current frontend still sends wallet context for compatibility; this is not proof of authorization.

Backend proof/tests now cover server-derived expert guild review identity. Proposal vote and candidate guild review identity remain covered by existing authz tests.

### Deep-Link Contract

- Expert guild review links use:
  - `/expert/guild/:guildId?tab=membershipApplications&applicationId=:id&applicantType=expert`
  - `/expert/guild/:guildId?tab=membershipApplications&applicationId=:id&applicantType=candidate`
- Legacy `candidateApplicationId` is treated as `applicationId` during transition.
- Proposal voting links use `/expert/voting/applications/:applicationId`.
- Missing targets must leave the reviewer on the relevant list with a visible error message.

### Canonical Guild Identity Contract

- `guildsApi.checkMembership(userId, guildId)`, `getPublicDetail(guildId)`, `getApplicationTemplate(guildId)`, and `submitApplication(guildId, ...)` require canonical guild IDs.
- Job data should expose a canonical `guildId` or `guild_id`; if only a display name is returned, the frontend resolves it through the guild list.
- If guild resolution fails, the Apply CTA must show a visible error instead of silently returning.

### Proposal Status Contract

- Voteable proposal status is `ongoing`.
- `pending` is pre-vote/non-actionable.
- Terminal or non-actionable statuses include `approved`, `rejected`, `closed`, `finalized`, and finalized `consensus_failed` outcomes.
- Tiebreaker proposals are actionable only when backend marks the reviewer as `is_tiebreaker_reviewer` and the proposal is not finalized.

### Resume Access Contract

- Protected resume links cannot rely on plain anchors to protected backend routes because browser navigation cannot attach localStorage bearer tokens or wallet headers.
- Preferred backend contract:
  - `GET /api/applications/:applicationId/resume/download-url`
  - `GET /api/guilds/candidate-applications/:applicationId/resume/download-url`
  - `GET /api/experts/guild-applications/:applicationId/resume/download-url`
  - `GET /api/experts/applications/:applicationId/resume/download-url`
  - `GET /api/candidates/me/resume/download-url`
- Response: `{ url: string, expiresAt: string, fileName?: string }`.
- Errors: `401` expired/unauthenticated, `403` access denied, `404` no resume.

Backend now provides these scoped endpoints. Local resume files are served through signed 5-minute `/api/resume-downloads/:token` URLs rather than public `/uploads/resumes` paths.

## Resume Link Inventory

Owned or beta-critical surfaces found:

- `src/components/guild/review/ReviewProfileStep.tsx`
- `src/components/expert/applications/ExpertReviewCard.tsx`
- `src/components/guild/GuildMembershipApplicationsTab.tsx`
- `src/components/expert/VotingApplicationPage.tsx`
- `src/components/dashboard/CandidateDetailModal.tsx`
- `src/components/dashboard/CandidateModalProfile.tsx`
- `src/components/dashboard/candidates/CandidateDetailPanel.tsx`
- `src/components/candidate/ResumeSection.tsx`

Endorsement surfaces use the expert endorsement application scope:

- `src/components/endorsements/EndorsementModal.tsx`
- `src/components/endorsements/CandidateDetailsModal.tsx`

## Work Log

- Added slice-0 contract gate after devil's-advocate review blocked frontend-only acceptance.
- Completed slice 1 frontend routing and review modal hardening:
  - Review queue routes expert/candidate guild applications to `/expert/guild/:guildId?tab=membershipApplications&applicationId=:id&applicantType=...`.
  - Proposal assignments route to `/expert/voting/applications/:id`.
  - Notification URLs canonicalize stale guild-application paths, promote legacy `candidateApplicationId`, preserve `applicationId` without `applicantType`, and prefer canonical guild metadata when available.
  - `GuildDetailView` auto-opens expert or candidate targets, controls the expert/candidate sub-tab, closes stale modals on target changes, guards stale async opens, and shows retryable candidate-app load errors.
  - Review scoring uses explicit unselected state, treats explicit `0` as valid, validates both general/domain scores on submit, renders inline score errors, and fails closed on rubric/template mismatches.
- Completed slice 2 candidate job/guild apply hardening:
  - Job detail preserves backend canonical `guildId`/`guild_id`, resolves display-name guilds through the guild list, shows apply blockers, treats membership `404` as not-member, and routes join flow to canonical guild IDs.
  - Candidate resume/social profile reuse now uses authenticated `candidateApi.getProfile()`.
  - Non-candidate authenticated sessions are not allowed into the candidate apply modal.
  - Direct `/guilds/:guildId/apply?jobId=:jobId` routes redirect when the fetched job belongs to a different guild and fail visibly when job questions cannot load.
  - `GuildApplicationFlow` renders `DetailSkeleton` while loading and shows nonfatal profile warnings.
- Completed proposal/status and loading slice:
  - Voteable proposal status is centralized as `ongoing`.
  - Selected-guild proposal fetches now use `ongoing`, not `pending`.
  - Proposal cards only expose vote actions for non-finalized, unvoted, assigned/tiebreaker `ongoing` proposals.
  - Application lists, shared `DataSection`, guild detail, guild application flow, and shared notifications page no longer return blank `null` loading states.
- Centralized resume access UX:
  - Added `resumeApi.getDownloadUrl()` and `ProtectedResumeLink`.
  - Review/application surfaces use the signed/authenticated download-url contract where an application/profile scope is available and show access errors instead of hard-coded protected anchors.
  - Backend signed/authenticated resume endpoints have been implemented.
- Completed backend contract pass:
  - `POST /api/experts/guild-applications/:applicationId/review` derives reviewer identity from `req.expertId`; `walletAddress` is optional compatibility input only.
  - `POST /api/guilds/candidate-applications/:applicationId/review` and `POST /api/proposals/:applicationId/vote` continue to use authenticated expert identity, with focused authz tests.
  - Added `GET /api/applications/:applicationId/resume/download-url`, `GET /api/guilds/candidate-applications/:applicationId/resume/download-url`, `GET /api/experts/guild-applications/:applicationId/resume/download-url`, and `GET /api/candidates/me/resume/download-url`.
  - Frontend review/vote/read API calls now pass `requiresAuth: true` so bearer tokens are attached to hardened routes, including proposal commit-reveal, expert analytics, notification, proposal assignment, and endorsement listing/sync calls.
  - Expert wallet verification and approved expert login now store backend-issued expert bearer/refresh tokens and clear stale candidate/company localStorage identity.
  - Application and guild-application resume URLs now use the submitted resume snapshot path. Candidate self-download still uses the current candidate profile resume.
- Reviewer/devil's-advocate gates run and applied:
  - Fixed no-link notification `applicationId` loss.
  - Fixed stale async auto-open and stale modal target changes.
  - Fixed candidate-app load failure being misreported as missing target.
  - Fixed hidden job step blocking applicants after job fetch failure.
  - Fixed direct guild-application job/guild mismatch.
  - Fixed rubric mismatch behavior to fail closed instead of silently skipping scores.
  - Fixed expert token contract gaps found in final review: approved experts now receive/persist bearer tokens, and protected expert/proposal reads attach those tokens.
  - Fixed final review issue where application resume download endpoints preferred live candidate profile resumes over submitted resume snapshots.
  - Redacted signed resume token URLs from backend request logging.
  - Fixed endorsement resume links to use the expert endorsement signed URL scope instead of the company application scope.
  - Expert application submission now treats wallet verification and resume upload as blocking before showing success. Backend keeps applications on existing `pending` status without reviewer assignments until resume upload activates review. Unassigned pending applications are retryable; assigned pending applications cannot be reset by reapplying.
  - Backend now fails closed for approved experts applying to additional guilds until a dedicated multi-guild application model exists, avoiding global loss of approved expert access.
  - Candidate self profile reloads now retain the stored resume path so signed self-download and "use profile resume" still work without exposing resumes on public candidate profiles.
  - Pending expert resume replacement now uses a row-locked backend update to prevent concurrent evidence swaps.

## Tests Run

- `npm test -- src/__tests__/review-flow-helpers.test.ts src/__tests__/job-guild-routing.test.ts src/__tests__/proposal-review.test.ts` passed: 19 tests.
- `npx vitest run src/__tests__/expert-auth-state.test.ts` passed: 2 tests.
- `npm run typecheck` passed.
- `git diff --check` passed.
- `npm run lint` passed with warnings only.
- Backend pass verification:
  - `VITEST_SKIP_DB_SETUP=true npx vitest run ...` passed for 20 backend authz/resume test files, 73 tests.
  - `npm run build` passed in `backend`.
  - Targeted backend eslint on touched implementation files passed.
  - Targeted frontend eslint on touched implementation files passed.
  - Targeted frontend eslint passed with 2 pre-existing `<img>` warnings.

## Remaining Risks

- Signed resume download URLs are bearer URLs for browser navigation. They expire after 5 minutes, but they are not single-use.
- Legacy submitted application resume snapshot URLs can return 404 if they reference files deleted before this hardening pass or point outside the allowed `uploads/resumes` namespace.
