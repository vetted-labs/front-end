import { test, expect } from "@playwright/test";
import { setExpertSession } from "./helpers/expert-auth";
import {
  MOCK_APPLICATION_SLASHED,
  MOCK_APPLICATION_MILD_SLASH,
  MOCK_APPLICATION_FINALIZED,
  setupVotingDetailMocks,
} from "./helpers/guild-mocks";

const SLASHED_ID = MOCK_APPLICATION_SLASHED.id;
const MILD_ID = MOCK_APPLICATION_MILD_SLASH.id;
const FINALIZED_ID = MOCK_APPLICATION_FINALIZED.id;

const CR_FINALIZED = { phase: "finalized" };

/** vote entry for the mock expert matching MOCK_EXPERT.expertId */
const makeVoteEntry = (overrides: {
  id: string;
  score: number;
  alignment_distance: number;
  reputation_change: number;
  reward_amount: number;
  slashing_tier: string;
  slash_percent: number;
}) => ({
  id: overrides.id,
  expert_id: "mock-expert-id-001",
  score: overrides.score,
  alignment_distance: overrides.alignment_distance,
  reputation_change: overrides.reputation_change,
  reward_amount: overrides.reward_amount,
  slashing_tier: overrides.slashing_tier,
  slash_percent: overrides.slash_percent,
  created_at: "2026-03-10T10:00:00Z",
});

const VOTE_SEVERE = makeVoteEntry({
  id: "vote-severe-001",
  score: 90,
  alignment_distance: 54.8,
  reputation_change: -20,
  reward_amount: 0,
  slashing_tier: "severe",
  slash_percent: 25,
});

const VOTE_MILD = makeVoteEntry({
  id: "vote-mild-001",
  score: 85,
  alignment_distance: 13.0,
  reputation_change: -5,
  reward_amount: 3.0,
  slashing_tier: "mild",
  slash_percent: 5,
});

const VOTE_ALIGNED = makeVoteEntry({
  id: "vote-aligned-001",
  score: 82,
  alignment_distance: 3.5,
  reputation_change: 10,
  reward_amount: 12.5,
  slashing_tier: "aligned",
  slash_percent: 0,
});

test.describe("Slashing finalization display", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await setExpertSession(page);
  });

  test("severe slashing — shows Rejected banner, severe tier, -25%, -20 rep, Low alignment", async ({ page }) => {
    await setupVotingDetailMocks(page, SLASHED_ID, {
      application: MOCK_APPLICATION_SLASHED,
      voteHistory: [VOTE_SEVERE],
      crPhase: CR_FINALIZED,
    });
    await page.goto(`/expert/voting/applications/${SLASHED_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Application Rejected").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("severe").first()).toBeVisible();
    await expect(page.getByText("-25%").first()).toBeVisible();
    await expect(page.getByText("-20").first()).toBeVisible();
    await expect(page.getByText(/Low alignment/i).first()).toBeVisible();
  });

  test("mild slashing — shows Approved banner, mild tier, -5%, Moderate alignment", async ({ page }) => {
    await setupVotingDetailMocks(page, MILD_ID, {
      application: MOCK_APPLICATION_MILD_SLASH,
      voteHistory: [VOTE_MILD],
      crPhase: CR_FINALIZED,
    });
    await page.goto(`/expert/voting/applications/${MILD_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Application Approved").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("mild").first()).toBeVisible();
    await expect(page.getByText("-5%").first()).toBeVisible();
    await expect(page.getByText(/Moderate alignment/i).first()).toBeVisible();
  });

  test("aligned (no slash) — shows Approved banner, aligned tier, +10 rep, 12.50 VETD, High alignment", async ({ page }) => {
    await setupVotingDetailMocks(page, FINALIZED_ID, {
      application: MOCK_APPLICATION_FINALIZED,
      voteHistory: [VOTE_ALIGNED],
      crPhase: CR_FINALIZED,
    });
    await page.goto(`/expert/voting/applications/${FINALIZED_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Application Approved").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("aligned").first()).toBeVisible();
    await expect(page.getByText("+10").first()).toBeVisible();
    await expect(page.getByText("12.50 VETD").first()).toBeVisible();
    await expect(page.getByText(/High alignment/i).first()).toBeVisible();
  });

  test("IQR stats — shows Median 35.0 and IQR 14.0 from application iqr data", async ({ page }) => {
    await setupVotingDetailMocks(page, SLASHED_ID, {
      application: MOCK_APPLICATION_SLASHED,
      voteHistory: [VOTE_SEVERE],
      crPhase: CR_FINALIZED,
    });
    await page.goto(`/expert/voting/applications/${SLASHED_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("Application Rejected").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Median 35\.0/i).first()).toBeVisible();
    await expect(page.getByText(/IQR 14\.0/i).first()).toBeVisible();
  });
});
