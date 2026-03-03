# Vetted Platform — QA Testing Checklist

**Test Date:** _______________
**Environment:** _______________
**Build/Branch:** _______________

## Testers

| | Name | Role | Wallet/Account |
|---|------|------|----------------|
| **Tester 1** | | | |
| **Tester 2** | | | |
| **Tester 3** | | | |

---

## Prerequisites

| # | Item | Done | Who Set It Up | Notes |
|---|------|------|---------------|-------|
| 1 | Backend API running | [ ] | | |
| 2 | Contracts deployed (VettedToken, ExpertStaking) | [ ] | | |
| 3 | Guild exists with application template | [ ] | | Guild name: |
| 4 | Job posted by company, linked to guild | [ ] | | Job title: |
| 5 | 3 expert wallets funded with ETH + VETD | [ ] | | |
| 6 | Candidate account created | [ ] | | |

---

## 1. Candidate Registration & Profile

| # | Test Step | Expected Result | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|-----------|-----------------|---------|----------|---------|----------|---------|----------|
| 1.1 | Go to `/auth/signup?type=candidate` | Signup form loads | [ ] | | [ ] | | [ ] | |
| 1.2 | Fill name, email, password and submit | Redirect to candidate dashboard | [ ] | | [ ] | | [ ] | |
| 1.3 | Go to profile, add headline + bio + experience | Profile saved | [ ] | | [ ] | | [ ] | |
| 1.4 | Upload resume (PDF) | File uploads, filename shown | [ ] | | [ ] | | [ ] | |
| 1.5 | Add LinkedIn and GitHub URLs | URLs saved and validated | [ ] | | [ ] | | [ ] | |
| 1.6 | Log out and log back in | All profile data persisted | [ ] | | [ ] | | [ ] | |

---

## 2. Candidate Guild Application (Vetting)

**Route:** `/guilds/[guildId]/apply?jobId=[jobId]`

| # | Test Step | Expected Result | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|-----------|-----------------|---------|----------|---------|----------|---------|----------|
| 2.1 | Navigate to guild, click "Apply" on a job | 3-step application form loads | [ ] | | [ ] | | [ ] | |
| 2.2 | **Step 1:** Upload resume, answer 4 general questions | All fields filled, "Next" enabled | [ ] | | [ ] | | [ ] | |
| 2.3 | **Step 2:** Answer job screening questions + cover letter | Fields validate min lengths | [ ] | | [ ] | | [ ] | |
| 2.4 | **Step 3:** Select level, answer domain questions, No-AI declaration | All required fields completed | [ ] | | [ ] | | [ ] | |
| 2.5 | Submit application | Success toast, redirect to tracking | [ ] | | [ ] | | [ ] | |
| 2.6 | Go to `/candidate/guilds` | Application shows "Active" with voting deadline | [ ] | | [ ] | | [ ] | |
| 2.7 | Verify application appears in expert voting queue | Visible to assigned experts | [ ] | | [ ] | | [ ] | |

---

## 3. Candidate Application Tracking

| # | Test Step | Expected Result | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|-----------|-----------------|---------|----------|---------|----------|---------|----------|
| 3.1 | Go to `/candidate/applications` | Lists job applications with statuses | [ ] | | [ ] | | [ ] | |
| 3.2 | Go to `/candidate/guilds` | Lists guild applications with approval progress | [ ] | | [ ] | | [ ] | |
| 3.3 | See approval/rejection vote counts | Counts update as experts vote | [ ] | | [ ] | | [ ] | |
| 3.4 | After finalization, check outcome | Shows "Approved" or "Rejected" | [ ] | | [ ] | | [ ] | |

---

## 4. Expert Wallet Registration

| # | Test Step | Expected Result | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|-----------|-----------------|---------|----------|---------|----------|---------|----------|
| 4.1 | Go to `/auth/login?type=expert` | Wallet connect prompt shown | [ ] | | [ ] | | [ ] | |
| 4.2 | Connect MetaMask or Coinbase Wallet | Wallet detected, SIWE challenge shown | [ ] | | [ ] | | [ ] | |
| 4.3 | Sign the challenge message | Wallet verified, expert profile created | [ ] | | [ ] | | [ ] | |
| 4.4 | Check localStorage | `walletAddress` and `expertId` stored | [ ] | | [ ] | | [ ] | |
| 4.5 | Refresh page | Expert stays logged in | [ ] | | [ ] | | [ ] | |

---

## 5. Expert Guild Application

**Route:** `/expert/apply`

| # | Test Step | Expected Result | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|-----------|-----------------|---------|----------|---------|----------|---------|----------|
| 5.1 | Select a guild to join | Application form loads | [ ] | | [ ] | | [ ] | |
| 5.2 | **Step 1:** Answer 4 general questions (Failure, Uncertainty, Motivation, Improvement) | Each meets minimum length | [ ] | | [ ] | | [ ] | |
| 5.3 | **Step 2:** Choose level (Entry / Experienced / Expert) | Level selected | [ ] | | [ ] | | [ ] | |
| 5.4 | **Step 3:** Answer domain-specific questions | Fields completed | [ ] | | [ ] | | [ ] | |
| 5.5 | Submit application | Success, redirect to `/expert/application-pending` | [ ] | | [ ] | | [ ] | |
| 5.6 | Verify application visible to existing guild members | Shows in their voting queue | [ ] | | [ ] | | [ ] | |

---

## 6. Expert Dashboard

| # | Route / Feature | What to Verify | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|-----------------|---------------|---------|----------|---------|----------|---------|----------|
| 6.1 | `/expert/voting` | Lists applications assigned for review | [ ] | | [ ] | | [ ] | |
| 6.2 | `/expert/reputation` | Shows reputation timeline | [ ] | | [ ] | | [ ] | |
| 6.3 | `/expert/earnings` | Shows earnings breakdown | [ ] | | [ ] | | [ ] | |

---

## 7. Staking VETD in a Guild

**Prerequisite:** Expert has VETD tokens in wallet.

### 7a. Stake

| # | Test Step | Expected Result | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|-----------|-----------------|---------|----------|---------|----------|---------|----------|
| 7.1 | Navigate to voting page for a guild application | Staking requirement shown | [ ] | | [ ] | | [ ] | |
| 7.2 | Check minimum stake amount | Reads `minimumStake` from contract | [ ] | | [ ] | | [ ] | |
| 7.3 | Approve VETD token spend | MetaMask: ERC20 `approve()` prompt | [ ] | | [ ] | | [ ] | |
| 7.4 | Confirm approval tx | Transaction mined, allowance set | [ ] | | [ ] | | [ ] | |
| 7.5 | Stake tokens | MetaMask: `stake(guildId, amount)` prompt | [ ] | | [ ] | | [ ] | |
| 7.6 | Confirm staking tx | Tokens locked, balance updated in UI | [ ] | | [ ] | | [ ] | |
| 7.7 | Verify `guildTotalStaked` increased | On-chain value matches UI | [ ] | | [ ] | | [ ] | |
| 7.8 | Expert can now vote | Voting interface enabled | [ ] | | [ ] | | [ ] | |

### 7b. Unstake

| # | Test Step | Expected Result | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|-----------|-----------------|---------|----------|---------|----------|---------|----------|
| 7.9 | Request unstake | `requestUnstake()` tx sent | [ ] | | [ ] | | [ ] | |
| 7.10 | 7-day lockup countdown shown | Cannot complete before lockup | [ ] | | [ ] | | [ ] | |
| 7.11 | Try to complete unstake early | Transaction fails / prevented | [ ] | | [ ] | | [ ] | |
| 7.12 | Complete unstake after lockup | Tokens returned to wallet | [ ] | | [ ] | | [ ] | |

### 7c. Staking Negative Tests

| # | Test | Expected | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|------|----------|---------|----------|---------|----------|---------|----------|
| 7.13 | Stake below guild minimum | Rejected / error shown | [ ] | | [ ] | | [ ] | |
| 7.14 | Stake with insufficient VETD balance | Error: insufficient balance | [ ] | | [ ] | | [ ] | |
| 7.15 | Unstake while active votes pending | Prevented or warned | [ ] | | [ ] | | [ ] | |
| 7.16 | Stake when contract is paused | Transaction rejected | [ ] | | [ ] | | [ ] | |

---

## 8. Voting — Standard (Schelling Point)

**Route:** `/expert/voting/applications/[applicationId]`

**Prerequisite:** Expert staked in guild + eligible to vote.

### 8a. Single Expert Vote

| # | Test Step | Expected Result | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|-----------|-----------------|---------|----------|---------|----------|---------|----------|
| 8.1 | Open application from voting queue | Full candidate profile loads | [ ] | | [ ] | | [ ] | |
| 8.2 | Check eligibility | API returns eligible | [ ] | | [ ] | | [ ] | |
| 8.3 | **Review Step 1 — Profile:** View resume, LinkedIn, GitHub, bio | All data displayed | [ ] | | [ ] | | [ ] | |
| 8.4 | **Review Step 2 — General Questions:** Score each 0–5 (Depth, Specificity, Clarity) | Scores saved, red flag deductions work | [ ] | | [ ] | | [ ] | |
| 8.5 | **Review Step 3 — Domain Questions:** Score domain expertise 0–5 | Domain scores saved | [ ] | | [ ] | | [ ] | |
| 8.6 | **Review Step 4 — Submit:** Enter score (0–100), stake, optional comment | Vote submitted | [ ] | | [ ] | | [ ] | |
| 8.7 | Check response | Shows `my_reward_amount`, `alignment_distance`, `my_reputation_change` | [ ] | | [ ] | | [ ] | |

### 8b. Multi-Expert Consensus (ALL 3 TESTERS)

**This is the critical test. All 3 testers vote on the same application.**

| # | Test Step | Expected Result | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|-----------|-----------------|---------|----------|---------|----------|---------|----------|
| 8.8 | **T1** votes: score ____, stake ____ VETD | Vote recorded | [ ] | Score: | — | — | — | — |
| 8.9 | **T2** votes: score ____, stake ____ VETD | Vote recorded | — | — | [ ] | Score: | — | — |
| 8.10 | **T3** votes: score ____, stake ____ VETD | Vote recorded | — | — | — | — | [ ] | Score: |
| 8.11 | Finalize application after deadline | Consensus calculated (stake-weighted) | [ ] | Consensus: | [ ] | | [ ] | |
| 8.12 | Check T1 reputation change | Change based on alignment distance | [ ] | Rep +/-: | — | — | — | — |
| 8.13 | Check T2 reputation change | Change based on alignment distance | — | — | [ ] | Rep +/-: | — | — |
| 8.14 | Check T3 reputation change | Change based on alignment distance | — | — | — | — | [ ] | Rep +/-: |
| 8.15 | Experts close to consensus got rewards | Reputation increased | [ ] | | [ ] | | [ ] | |
| 8.16 | Experts far from consensus got slashed | Reputation decreased | [ ] | | [ ] | | [ ] | |
| 8.17 | Candidate outcome correct | Approved if above threshold, else rejected | [ ] | Outcome: | [ ] | | [ ] | |
| 8.18 | `total_rewards_distributed` correct | Reward pool matches expected | [ ] | Total: | [ ] | | [ ] | |

### 8c. Voting Negative Tests

| # | Test | Expected | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|------|----------|---------|----------|---------|----------|---------|----------|
| 8.19 | Vote on unassigned application | Eligibility check fails | [ ] | | [ ] | | [ ] | |
| 8.20 | Vote after deadline passed | Vote rejected | [ ] | | [ ] | | [ ] | |
| 8.21 | Score outside 0–100 range | Validation error | [ ] | | [ ] | | [ ] | |
| 8.22 | Vote without minimum stake | Error shown | [ ] | | [ ] | | [ ] | |
| 8.23 | Double-vote on same application | Rejected or updates first | [ ] | | [ ] | | [ ] | |

---

## 9. Commit-Reveal Voting

### 9a. Commit Phase

| # | Test Step | Expected Result | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|-----------|-----------------|---------|----------|---------|----------|---------|----------|
| 9.1 | Enable commit-reveal for an application | Phase status = `"commit"` | [ ] | | [ ] | | [ ] | |
| 9.2 | Phase indicator renders | Shows "Commit Phase" with deadline | [ ] | | [ ] | | [ ] | |
| 9.3 | Decide score, generate nonce locally | Nonce stored (expert must remember!) | [ ] | Nonce: | [ ] | Nonce: | [ ] | Nonce: |
| 9.4 | Generate hash via API | `generateHash()` returns hash | [ ] | | [ ] | | [ ] | |
| 9.5 | Submit commitment | Commitment recorded | [ ] | | [ ] | | [ ] | |
| 9.6 | Cannot see other experts' votes | Hidden during commit phase | [ ] | | [ ] | | [ ] | |

### 9b. Reveal Phase

| # | Test Step | Expected Result | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|-----------|-----------------|---------|----------|---------|----------|---------|----------|
| 9.7 | Phase transitions to "reveal" after commit deadline | Phase status = `"reveal"` | [ ] | | [ ] | | [ ] | |
| 9.8 | Reveal vote with correct score + nonce | Hash verified, vote accepted | [ ] | | [ ] | | [ ] | |
| 9.9 | All experts reveal (or deadline passes) | Phase → `"finalized"` | [ ] | | [ ] | | [ ] | |
| 9.10 | Consensus calculated from revealed votes | Same Schelling math as standard | [ ] | | [ ] | | [ ] | |

### 9c. Commit-Reveal Negative Tests

| # | Test | Expected | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|------|----------|---------|----------|---------|----------|---------|----------|
| 9.11 | Reveal with wrong nonce | Hash mismatch, rejected | [ ] | | [ ] | | [ ] | |
| 9.12 | Reveal during commit phase | Rejected | [ ] | | [ ] | | [ ] | |
| 9.13 | Commit during reveal phase | Rejected | [ ] | | [ ] | | [ ] | |
| 9.14 | Don't reveal before deadline | Abstain, stake at risk | [ ] | | [ ] | | [ ] | |
| 9.15 | Commit with 0 stake | Rejected | [ ] | | [ ] | | [ ] | |

---

## 10. Slashing & Reputation

### 10a. Reputation Timeline

**Route:** `/expert/reputation`

| # | Test Step | Expected Result | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|-----------|-----------------|---------|----------|---------|----------|---------|----------|
| 10.1 | Reputation page loads | Timeline with entries shown | [ ] | | [ ] | | [ ] | |
| 10.2 | After accurate vote: `change_amount` | Positive (reward) | [ ] | Amount: | [ ] | Amount: | [ ] | Amount: |
| 10.3 | After inaccurate vote: `change_amount` | Negative (slash) | [ ] | Amount: | [ ] | Amount: | [ ] | Amount: |
| 10.4 | `reason` field correct | `voting_accuracy_reward` or `_slash` | [ ] | | [ ] | | [ ] | |
| 10.5 | `slash_percent` displayed | Shows % of rep lost | [ ] | | [ ] | | [ ] | |
| 10.6 | `consensus_score` displayed | Matches finalized consensus | [ ] | | [ ] | | [ ] | |
| 10.7 | `alignment_distance` displayed | Distance from consensus shown | [ ] | | [ ] | | [ ] | |

### 10b. Tier Transitions

| Tier | Rep Range | Reward Weight |
|------|-----------|--------------|
| Foundation | 0–999 | 1.0x |
| Established | 1,000–1,999 | 1.25x |
| Authority | 2,000+ | 1.5x |

| # | Test | Expected | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|------|----------|---------|----------|---------|----------|---------|----------|
| 10.8 | Expert crosses Foundation → Established | Tier label updates in UI | [ ] | | [ ] | | [ ] | |
| 10.9 | Expert slashed below tier threshold | Tier drops, label updates | [ ] | | [ ] | | [ ] | |
| 10.10 | Authority expert vs Foundation expert | 1.5x vs 1.0x reward multiplier | [ ] | | [ ] | | [ ] | |

### 10c. Earnings

| # | Test Step | Expected Result | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|-----------|-----------------|---------|----------|---------|----------|---------|----------|
| 10.11 | Go to `/expert/earnings` | Earnings breakdown loads | [ ] | | [ ] | | [ ] | |
| 10.12 | `vetting_reward` entry present | Matches accurate vote reward | [ ] | | [ ] | | [ ] | |
| 10.13 | Breakdown by guild correct | Right guild attribution | [ ] | | [ ] | | [ ] | |

---

## Auth Edge Cases

| # | Test | Expected | T1 Pass | T1 Notes | T2 Pass | T2 Notes | T3 Pass | T3 Notes |
|---|------|----------|---------|----------|---------|----------|---------|----------|
| 11.1 | Expert accesses candidate routes | Redirected / forbidden | [ ] | | [ ] | | [ ] | |
| 11.2 | Candidate accesses expert voting | Redirected / forbidden | [ ] | | [ ] | | [ ] | |
| 11.3 | Expired JWT on candidate request | Auto-refresh, retry transparent | [ ] | | [ ] | | [ ] | |
| 11.4 | Expert disconnects wallet mid-tx | Graceful error, can reconnect | [ ] | | [ ] | | [ ] | |

---

## Happy Path Summary

```
1. CANDIDATE signs up → profile → resume
                    |
2. CANDIDATE applies to guild (3-step form)
                    |
3. EXPERTS connect wallet → stake VETD in guild
                    |
4. EXPERTS review candidate (4-step review)
   - Standard: score → submit
   - Commit-reveal: commit hash → reveal score
                    |
5. Application FINALIZED after deadline
   - Approved → candidate joins guild
   - Rejected → candidate notified
                    |
6. REPUTATION updated for each expert
   - Close to consensus → reward (rep UP)
   - Far from consensus → slash (rep DOWN)
   - Tier transitions at 1000 / 2000 rep
```

---

## Sign-Off

| Tester | All Tests Passed | Blockers Found | Signature | Date |
|--------|-----------------|----------------|-----------|------|
| Tester 1 | [ ] Yes  [ ] No | | | |
| Tester 2 | [ ] Yes  [ ] No | | | |
| Tester 3 | [ ] Yes  [ ] No | | | |

**Overall Status:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

**Blocker Details:**

**General Notes:**
