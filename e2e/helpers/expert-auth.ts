import { Page, expect } from "@playwright/test";

export const MOCK_EXPERT = {
  walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
  expertId: "mock-expert-id-001",
  name: "E2E Expert",
  status: "approved",
};

export const MOCK_PENDING_EXPERT = {
  walletAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  expertId: "mock-pending-expert-002",
  name: "E2E Pending Expert",
  status: "pending",
};

/**
 * Injects expert session data into localStorage.
 * Page must already be navigated to the app domain.
 */
export async function setExpertSession(
  page: Page,
  expert = MOCK_EXPERT,
): Promise<void> {
  await page.evaluate(
    ({ walletAddress, expertId }) => {
      localStorage.setItem("walletAddress", walletAddress);
      localStorage.setItem("expertId", expertId);
      localStorage.setItem("userType", "expert");
    },
    { walletAddress: expert.walletAddress, expertId: expert.expertId },
  );
}

/**
 * Removes all expert-related keys from localStorage.
 */
export async function clearExpertSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("expertId");
    localStorage.removeItem("userType");
  });
}

/**
 * Asserts that expert session keys are present in localStorage.
 */
export async function expectExpertSession(
  page: Page,
  expert = MOCK_EXPERT,
): Promise<void> {
  const data = await page.evaluate(() => ({
    walletAddress: localStorage.getItem("walletAddress"),
    expertId: localStorage.getItem("expertId"),
    userType: localStorage.getItem("userType"),
  }));

  expect(data.walletAddress).toBe(expert.walletAddress);
  expect(data.expertId).toBe(expert.expertId);
  expect(data.userType).toBe("expert");
}

/**
 * Asserts that no expert session keys remain in localStorage.
 */
export async function expectNoExpertSession(page: Page): Promise<void> {
  const data = await page.evaluate(() => ({
    walletAddress: localStorage.getItem("walletAddress"),
    expertId: localStorage.getItem("expertId"),
  }));

  expect(data.walletAddress).toBeNull();
  expect(data.expertId).toBeNull();
}

/**
 * Mocks the expert profile API to return a mock expert profile.
 */
export async function mockExpertProfileApi(
  page: Page,
  expert = MOCK_EXPERT,
): Promise<void> {
  await page.route("**/api/experts/profile/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          id: expert.expertId,
          walletAddress: expert.walletAddress,
          fullName: expert.name,
          status: expert.status,
          reputation: 100,
          reviewCount: 10,
          consensusRate: 85,
          guilds: [],
        },
      }),
    });
  });
}

/**
 * Mocks the notifications API to return an empty list.
 */
export async function mockNotificationsApi(page: Page): Promise<void> {
  await page.route("**/api/experts/*/notifications**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { notifications: [], unreadCount: 0 },
      }),
    });
  });
}

/**
 * Mocks the governance proposals API to return an empty list.
 */
export async function mockGovernanceApi(page: Page): Promise<void> {
  await page.route("**/api/governance/proposals**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [],
      }),
    });
  });
}

/**
 * Mocks the leaderboard API to return an empty list.
 */
export async function mockLeaderboardApi(page: Page): Promise<void> {
  await page.route("**/api/experts/leaderboard**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { experts: [], stats: { totalExperts: 0, avgReviews: 0, topEarnings: 0, totalEarnings: 0 } },
      }),
    });
  });
}
