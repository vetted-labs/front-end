import { expect, type Page } from "@playwright/test";
import type { Expert } from "../fixtures";
import { attachWallet } from "../helpers/wallet-injection";
import { loginAsExpertViaUI } from "../helpers/ui-auth";

const WORKSPACE_TABS = [
  "Queue",
  "My Reviews",
  "Governance",
  "Feed",
  "Members",
  "Earnings",
  "Leaderboard",
] as const;

export async function openExpertGuildWorkspaceViaUI(
  basePage: Page,
  args: {
    expert: Expert;
    guildId: string;
  },
): Promise<Page> {
  const browser = basePage.context().browser();
  if (!browser) throw new Error("openExpertGuildWorkspaceViaUI: browser handle unavailable");

  const context = await browser.newContext({
    baseURL: new URL(basePage.url()).origin,
    bypassCSP: true,
  });
  const page = await context.newPage();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.localStorage.removeItem("authToken");
    window.localStorage.removeItem("candidateId");
    window.localStorage.removeItem("candidateEmail");
    window.localStorage.removeItem("userType");
  });
  await attachWallet(page, args.expert.privateKey, {
    rpcUrl: process.env.ANVIL_RPC_URL,
  });
  await loginAsExpertViaUI(page, args.expert.address);
  await page.goto(`/expert/guild/${encodeURIComponent(args.guildId)}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: /workspace/i }).first()).toBeVisible({
    timeout: 30_000,
  });
  return page;
}

export async function expectWorkspaceShellViaUI(page: Page): Promise<void> {
  await expect(page.getByText(/your queue/i).first()).toBeVisible();
  await expect(page.getByText(/active commits/i).first()).toBeVisible();
  await expect(page.getByText(/stake locked/i).first()).toBeVisible();
  await expect(page.getByText(/pending payouts/i).first()).toBeVisible();
  await expect(page.getByText(/^reputation$/i).first()).toBeVisible();

  for (const tab of WORKSPACE_TABS) {
    await expect(page.getByRole("button", { name: new RegExp(tab, "i") }).first()).toBeVisible();
  }
}

export async function expectWorkspaceQueueShowsAssignedApplicationViaUI(
  page: Page,
  applicationId: string,
): Promise<void> {
  await clickWorkspaceTabViaUI(page, "Queue");
  await expect(page.getByText(/due soon/i).first()).toBeVisible();
  await expect(page.getByText(/waiting on you/i).first()).toBeVisible();
  await expect(page.getByText(/unclaimed in this guild/i).first()).toBeVisible();
  await expect(candidateReviewLink(page, applicationId)).toBeVisible({ timeout: 30_000 });
}

export async function expectWorkspaceMyReviewsShowsAssignedApplicationViaUI(
  page: Page,
  applicationId: string,
): Promise<void> {
  await clickWorkspaceTabViaUI(page, "My Reviews");
  await expect(page).toHaveURL(/tab=reviews/);
  for (const filter of ["Active", "Awaiting reveal", "Reveal open", "Past", "Slashed", "All"]) {
    await expect(page.getByRole("button", { name: new RegExp(filter, "i") }).first()).toBeVisible();
  }
  await expect(candidateReviewLink(page, applicationId)).toBeVisible({ timeout: 30_000 });
}

export async function expectWorkspaceNonReviewTabsRenderViaUI(page: Page): Promise<void> {
  await clickWorkspaceTabViaUI(page, "Governance");
  await expect(page).toHaveURL(/tab=governance/);
  await expect(page.getByText(/open proposals/i).first()).toBeVisible();
  await expect(page.getByText(/your governance record/i).first()).toBeVisible();

  await clickWorkspaceTabViaUI(page, "Feed");
  await expect(page).toHaveURL(/tab=feed/);
  await expect(page.getByText(/^guild feed/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /hot/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /new/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /top/i }).first()).toBeVisible();

  await clickWorkspaceTabViaUI(page, "Members");
  await expect(page).toHaveURL(/tab=members/);
  await expect(page.getByRole("button", { name: /experts/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /candidates/i }).first()).toBeVisible();

  await clickWorkspaceTabViaUI(page, "Earnings");
  await expect(page).toHaveURL(/tab=earnings/);
  await expect(page.getByText(/total points earned/i).first()).toBeVisible();
  await expect(page.getByText(/endorsement earnings/i).first()).toBeVisible();
  await expect(page.getByText(/recent earnings history/i).first()).toBeVisible();

  await clickWorkspaceTabViaUI(page, "Leaderboard");
  await expect(page).toHaveURL(/tab=leaderboard/);
  await expect(page.getByText(/top experts/i).first()).toBeVisible();
  await expect(page.getByRole("combobox").first()).toBeVisible();
}

async function clickWorkspaceTabViaUI(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(name, "i") }).first().click();
}

function candidateReviewLink(page: Page, applicationId: string) {
  return page
    .locator(`a[href*="reviewAppId=${applicationId}"][href*="reviewType=candidate"]`)
    .first();
}
