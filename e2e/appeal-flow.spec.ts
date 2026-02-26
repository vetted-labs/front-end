import { test, expect, Page } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";

const ENGINEERING_GUILD_ID = "f5e2c769-2069-4594-8c23-4825a935f405";
const REJECTED_PROPOSAL_ID = "eb270885-af3d-43bd-bdaf-56bae48a59ff";

const EXPERT = {
  walletAddress: "0x5b3141560e335f813047CFCB5D209fc8312B80c5",
  expertId: "a0000000-0000-0000-0000-000000000003",
  name: "Sven Daneel",
  status: "approved",
};

// Mock data matching the real backend camelCase response shape
const MOCK_GUILD_DETAIL = {
  id: ENGINEERING_GUILD_ID,
  name: "Engineering",
  description: "Software engineers, data scientists, ML engineers, and all technical builders",
  icon: "code",
  color: "#F97316",
  memberCount: 3,
  expertCount: 3,
  candidateCount: 0,
  totalMembers: 3,
  experts: [
    { id: EXPERT.expertId, fullName: EXPERT.name, role: "master", reputation: 500 },
  ],
  candidates: [],
  recentJobs: [],
  guildApplications: [],
  applications: [],
  recentActivity: [],
  openPositions: 0,
  totalProposalsReviewed: 4,
  averageApprovalTime: "2 days",
  totalVetdStaked: 170,
  statistics: { vettedProposals: 4, totalVetdStaked: 170, totalEarningsFromEndorsements: 0 },
  expertRole: "master",
  reputation: 500,
  earnings: { totalPoints: 500, totalEndorsementEarnings: 0, recentEarnings: [] },
};

const MOCK_PROPOSALS = [
  {
    id: REJECTED_PROPOSAL_ID,
    candidateName: "Dr. Stewart Weimann",
    candidateEmail: "kyler_jacobi@hotmail.com",
    candidateId: "fd42e0fe-e6df-4430-a889-cdba11c9e699",
    guildId: ENGINEERING_GUILD_ID,
    guildName: "Engineering",
    status: "rejected",
    finalized: true,
    outcome: "rejected",
    consensusScore: 9.5,
    voteCount: 3,
    votesForCount: 0,
    votesAgainstCount: 3,
    requiredStake: "44.00000000",
    votingDeadline: "2026-02-22T06:06:46.293Z",
    votingPhase: "direct",
    createdAt: "2026-02-15T06:06:46.293Z",
    updatedAt: "2026-02-22T06:06:46.293Z",
    yearsOfExperience: 7,
    skillsSummary: "Docker, Solidity, Java, Rust",
    experienceSummary: "7 years of professional experience",
    motivationStatement: "I am passionate about engineering.",
    proposalText: "I believe I would be a valuable addition.",
    achievements: [{ year: 2023, title: "Increased revenue by 50%" }],
  },
  {
    id: "909cd502-6cb0-0000-0000-000000000001",
    candidateName: "Devin Keeling V",
    candidateEmail: "devin@example.com",
    guildId: ENGINEERING_GUILD_ID,
    guildName: "Engineering",
    status: "approved",
    finalized: true,
    outcome: "approved",
    consensusScore: 75.0,
    voteCount: 3,
    votesForCount: 3,
    votesAgainstCount: 0,
    requiredStake: "44.00000000",
    votingDeadline: "2026-02-22T06:06:46.293Z",
    votingPhase: "direct",
    createdAt: "2026-02-15T06:06:46.293Z",
    updatedAt: "2026-02-22T06:06:46.293Z",
  },
];

const MOCK_PROPOSAL_DETAIL = {
  ...MOCK_PROPOSALS[0],
  isAssignedReviewer: true,
  hasVoted: true,
  myVoteScore: 10,
  alignmentDistance: 0.5,
  myReputationChange: 2,
  myRewardAmount: 5.0,
};

const MOCK_VOTE_HISTORY = [
  {
    id: "vote-001",
    expertId: EXPERT.expertId,
    expertName: "Sven Daneel",
    score: 10,
    alignmentDistance: 0.5,
    reputationChange: 2,
    rewardAmount: 5.0,
    comment: "Not qualified",
    votedAt: "2026-02-20T10:00:00Z",
  },
];

async function setupMocks(page: Page) {
  // Expert profile
  await page.route("**/api/experts/profile/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          id: EXPERT.expertId,
          walletAddress: EXPERT.walletAddress,
          fullName: EXPERT.name,
          status: EXPERT.status,
          reputation: 500,
          reviewCount: 10,
          consensusRate: 85,
          guilds: [{ id: ENGINEERING_GUILD_ID, name: "Engineering", role: "master" }],
        },
      }),
    });
  });

  // Notifications
  await page.route("**/api/experts/*/notifications**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { notifications: [], unreadCount: 0 } }),
    });
  });

  // Staking status
  await page.route("**/api/blockchain/stake/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { meetsMinimum: true, stakedAmount: "100", minimumRequired: "50" } }),
    });
  });

  // Guild detail
  await page.route(`**/api/guilds/${ENGINEERING_GUILD_ID}/**`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_GUILD_DETAIL }),
    });
  });
  await page.route(`**/api/guilds/${ENGINEERING_GUILD_ID}`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_GUILD_DETAIL }),
    });
  });

  // Guild proposals list
  await page.route(`**/api/proposals/guild/${ENGINEERING_GUILD_ID}**`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: MOCK_PROPOSALS }),
    });
  });

  // Proposal detail
  await page.route(`**/api/proposals/${REJECTED_PROPOSAL_ID}**`, (route) => {
    if (route.request().url().includes("/votes")) {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_VOTE_HISTORY }),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: MOCK_PROPOSAL_DETAIL }),
      });
    }
  });

  // Commit-reveal status (may not exist)
  await page.route("**/api/proposals/*/commit-reveal/**", (route) => {
    route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Not found" }) });
  });

  // Appeal by application (no existing appeal)
  await page.route(`**/api/guilds/appeals/by-application/${REJECTED_PROPOSAL_ID}`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: null }),
    });
  });

  // Candidate applications for guild (empty)
  await page.route("**/api/guilds/*/candidate-applications**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  // Expert membership (for guild detail page)
  await page.route("**/api/guilds/*/membership**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { isMember: true, role: "master", status: "approved" } }),
    });
  });

  // Wallet verification
  await page.route("**/api/blockchain/wallet/verified/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { verified: true } }),
    });
  });

  // Guild feed
  await page.route("**/api/guilds/*/feed**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { items: [], nextCursor: null } }),
    });
  });
}

test.describe("Appeal flow: Guild → Proposals → Rejected Application → Appeal", () => {

  test("navigates from guild detail to rejected proposal and sees appeal form", async ({ page }) => {
    // Set up expert session and mocks
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page, EXPERT);
    await setupMocks(page);

    // Step 1: Navigate to guild detail page
    await page.goto(`/expert/guilds/${ENGINEERING_GUILD_ID}`, { waitUntil: "networkidle" });

    // Should see guild name
    await expect(page.getByText("Engineering").first()).toBeVisible({ timeout: 15000 });

    // Step 2: Click "Candidate Proposals" sub-tab
    const proposalsTab = page.getByRole("button", { name: "Candidate Proposals" });
    await expect(proposalsTab).toBeVisible({ timeout: 10000 });
    await proposalsTab.click();

    // Step 3: Should see the rejected proposal
    await expect(page.getByText("Dr. Stewart Weimann")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Rejected").first()).toBeVisible();

    // Step 4: Click the View button on the rejected proposal
    const viewButton = page.getByRole("button", { name: "View" }).first();
    await expect(viewButton).toBeVisible();
    await viewButton.click();

    // Step 5: Should navigate to proposal detail page
    await page.waitForURL(`**/expert/voting/applications/${REJECTED_PROPOSAL_ID}`, { timeout: 10000 });

    // Step 6: Should see the candidate name
    await expect(page.getByText("Dr. Stewart Weimann").first()).toBeVisible({ timeout: 15000 });

    // Step 7: Should see finalization display with "Rejected" outcome
    await expect(page.getByText("Application Rejected").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("REJECTED").first()).toBeVisible();

    // Step 8: Should see the appeal form
    await expect(page.getByText("Believe this rejection was incorrect?")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Appeal This Rejection/i })).toBeVisible();
  });

  test("proposal detail page renders finalization data correctly", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page, EXPERT);
    await setupMocks(page);

    // Go directly to the proposal detail page
    await page.goto(`/expert/voting/applications/${REJECTED_PROPOSAL_ID}`, { waitUntil: "networkidle" });

    // Candidate header
    await expect(page.getByText("Dr. Stewart Weimann").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Engineering").first()).toBeVisible();

    // Finalization section
    await expect(page.getByText("Application Rejected")).toBeVisible({ timeout: 10000 });

    // Consensus score
    await expect(page.getByText("9.5")).toBeVisible();

    // Participation count
    await expect(page.getByText("3").first()).toBeVisible();

    // Your Performance section
    await expect(page.getByText("Your Performance")).toBeVisible();
    await expect(page.getByText("10/100")).toBeVisible(); // my vote score
  });

  test("appeal submission form opens and validates", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page, EXPERT);
    await setupMocks(page);

    await page.goto(`/expert/voting/applications/${REJECTED_PROPOSAL_ID}`, { waitUntil: "networkidle" });

    // Wait for the appeal section
    const appealButton = page.getByRole("button", { name: /Appeal This Rejection/i });
    await expect(appealButton).toBeVisible({ timeout: 15000 });

    // Click to expand appeal form
    await appealButton.click();

    // Should see the form elements
    await expect(page.getByText("File Appeal")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Justification")).toBeVisible();
    await expect(page.getByText("Stake Amount")).toBeVisible();
    await expect(page.getByPlaceholder(/Explain specifically/i)).toBeVisible();

    // Submit button should be disabled (no justification yet)
    const submitButton = page.getByRole("button", { name: /File Appeal/i }).first();
    await expect(submitButton).toBeDisabled();

    // Type a short justification (< 100 chars)
    await page.getByPlaceholder(/Explain specifically/i).fill("Too short");

    // Submit button should still be disabled
    await expect(submitButton).toBeDisabled();

    // Type a valid justification (100+ chars)
    const longJustification = "This candidate was incorrectly rejected. Their extensive experience in distributed systems and blockchain development is well-documented and meets guild standards.";
    await page.getByPlaceholder(/Explain specifically/i).fill(longJustification);

    // Submit button should now be enabled
    await expect(submitButton).toBeEnabled();

    // Cancel button should work
    await page.getByRole("button", { name: "Cancel" }).click();

    // Should go back to the collapsed state
    await expect(page.getByRole("button", { name: /Appeal This Rejection/i })).toBeVisible();
  });

  test("existing appeal shows status banner instead of form", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page, EXPERT);
    await setupMocks(page);

    // Override the appeal endpoint to return an existing appeal
    await page.route(`**/api/guilds/appeals/by-application/${REJECTED_PROPOSAL_ID}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "appeal-001",
            application_id: REJECTED_PROPOSAL_ID,
            status: "panel_assigned",
            appeal_reason: "This candidate was incorrectly rejected.",
            stake_amount: "50.00000000",
            appeal_number: 1,
            appealed_by_expert_id: EXPERT.expertId,
            guild_id: ENGINEERING_GUILD_ID,
            guild_name: "Engineering",
            panel_members: [
              {
                expert_id: "a0000000-0000-0000-0000-000000000001",
                expert_name: "Taieb Chaouch",
                vote: null,
                reasoning: null,
              },
            ],
            created_at: "2026-02-26T13:00:00Z",
          },
        }),
      });
    });

    await page.goto(`/expert/voting/applications/${REJECTED_PROPOSAL_ID}`, { waitUntil: "networkidle" });

    // Should NOT show the appeal submission form
    await expect(page.getByText("Application Rejected")).toBeVisible({ timeout: 15000 });

    // Should show appeal status banner instead
    await expect(page.getByText(/Appeal/i).first()).toBeVisible({ timeout: 10000 });

    // Should NOT show "Appeal This Rejection" button
    await expect(page.getByRole("button", { name: /Appeal This Rejection/i })).not.toBeVisible();
  });
});
