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
    await test.step("expert session and API mocks are established", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page, EXPERT);
      await setupMocks(page);
    });

    await test.step("expert opens the Engineering guild detail page", async () => {
      await page.goto(`/expert/guilds/${ENGINEERING_GUILD_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Engineering").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("expert opens the Candidate Proposals sub-tab and sees the rejected application", async () => {
      const proposalsTab = page.getByRole("button", { name: "Candidate Proposals" });
      await expect(proposalsTab).toBeVisible({ timeout: 10000 });
      await proposalsTab.click();

      await expect(page.getByText("Dr. Stewart Weimann")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Rejected").first()).toBeVisible();
    });

    await test.step("expert clicks View on the rejected proposal and the appeal form is shown", async () => {
      const viewButton = page.getByRole("button", { name: "View" }).first();
      await expect(viewButton).toBeVisible();
      await viewButton.click();

      await page.waitForURL(`**/expert/voting/applications/${REJECTED_PROPOSAL_ID}`, { timeout: 10000 });

      await expect(page.getByText("Dr. Stewart Weimann").first()).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Application Rejected").first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("REJECTED").first()).toBeVisible();
      await expect(page.getByText("Believe this rejection was incorrect?")).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("button", { name: /Appeal This Rejection/i })).toBeVisible();
    });
  });

  test("proposal detail page renders finalization data correctly", async ({ page }) => {
    await test.step("expert session and API mocks are established", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page, EXPERT);
      await setupMocks(page);
    });

    await test.step("expert navigates directly to the rejected proposal detail page", async () => {
      await page.goto(`/expert/voting/applications/${REJECTED_PROPOSAL_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Dr. Stewart Weimann").first()).toBeVisible({ timeout: 15000 });
    });

    await test.step("finalization section shows the rejection outcome, consensus score, and expert performance", async () => {
      await expect(page.getByText("Engineering").first()).toBeVisible();
      await expect(page.getByText("Application Rejected")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("9.5")).toBeVisible();
      await expect(page.getByText("3").first()).toBeVisible();
      await expect(page.getByText("Your Performance")).toBeVisible();
      await expect(page.getByText("10/100")).toBeVisible();
    });
  });

  test("appeal submission form opens and validates", async ({ page }) => {
    await test.step("expert session and API mocks are established", async () => {
      await page.goto("/", { waitUntil: "networkidle" });
      await setExpertSession(page, EXPERT);
      await setupMocks(page);
    });

    await test.step("expert opens the proposal detail page and expands the appeal form", async () => {
      await page.goto(`/expert/voting/applications/${REJECTED_PROPOSAL_ID}`, { waitUntil: "networkidle" });

      const appealButton = page.getByRole("button", { name: /Appeal This Rejection/i });
      await expect(appealButton).toBeVisible({ timeout: 15000 });
      await appealButton.click();

      await expect(page.getByText("File Appeal")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Justification")).toBeVisible();
      await expect(page.getByText("Stake Amount")).toBeVisible();
      await expect(page.getByPlaceholder(/Explain specifically/i)).toBeVisible();
    });

    await test.step("submit button stays disabled until the justification meets the minimum length", async () => {
      const submitButton = page.getByRole("button", { name: /File Appeal/i }).first();
      await expect(submitButton).toBeDisabled();

      await page.getByPlaceholder(/Explain specifically/i).fill("Too short");
      await expect(submitButton).toBeDisabled();

      const longJustification = "This candidate was incorrectly rejected. Their extensive experience in distributed systems and blockchain development is well-documented and meets guild standards.";
      await page.getByPlaceholder(/Explain specifically/i).fill(longJustification);
      await expect(submitButton).toBeEnabled();
    });

    await test.step("Cancel collapses the form back to the appeal trigger button", async () => {
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("button", { name: /Appeal This Rejection/i })).toBeVisible();
    });
  });

  test("existing appeal shows status banner instead of form", async ({ page }) => {
    await test.step("expert session, API mocks, and an existing appeal are established", async () => {
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
    });

    await test.step("expert opens the rejected proposal detail page", async () => {
      await page.goto(`/expert/voting/applications/${REJECTED_PROPOSAL_ID}`, { waitUntil: "networkidle" });
      await expect(page.getByText("Application Rejected")).toBeVisible({ timeout: 15000 });
    });

    await test.step("appeal status banner is shown and the submission form is not available", async () => {
      await expect(page.getByText(/Appeal/i).first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole("button", { name: /Appeal This Rejection/i })).not.toBeVisible();
    });
  });
});
