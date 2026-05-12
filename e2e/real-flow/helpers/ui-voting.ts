// e2e/real-flow/helpers/ui-voting.ts
//
// Playwright helpers that drive the commit-reveal voting UI. The intent is
// for scenario specs to read like:
//
//   await commitVoteViaUI(page, { score: 85 });
//   await advanceTime(anvil, ONE_DAY_PLUS_ONE);
//   await fireExpertTransitions(page.request);
//   await revealVoteViaUI(page);
//
// Selectors target stable role/name queries. If the underlying components
// add `data-testid`s in the future, prefer those.

import { expect, type Page } from "@playwright/test";

/** Wait helper: poll for the on-chain-status banner to enter `confirmed`. */
async function waitForConfirmed(page: Page, timeoutMs = 60_000): Promise<void> {
  await expect(
    page.getByText(/transaction confirmed|on-chain.*confirmed/i).first(),
  ).toBeVisible({ timeout: timeoutMs });
}

/**
 * Drive a commit through the UI. Assumes:
 *   - The page is on the expert review surface for `applicationId`
 *   - A wallet is connected (call `connectWalletViaUI` first)
 *   - The connected address matches the expert's panel seat (else
 *     CommitmentForm shows a wallet-mismatch banner and the submit button
 *     stays disabled).
 *
 * The form's score slider is a `<input type="range">` (role=slider), range 0-100.
 * The submit button label is "Sign & Submit On-Chain".
 */
export async function commitVoteViaUI(
  page: Page,
  args: { score: number },
): Promise<void> {
  const slider = page.getByRole("slider").first();
  await slider.waitFor({ state: "visible", timeout: 10_000 });
  // Setting .value directly + dispatching 'input' is the only reliable way
  // to drive range inputs in Playwright — fill() doesn't apply to type=range.
  await slider.evaluate((el, value) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, args.score);

  const submit = page.getByRole("button", { name: /sign.*submit on-?chain/i });
  await expect(submit).toBeEnabled({ timeout: 10_000 });
  await submit.click();

  await waitForConfirmed(page);
}

/**
 * Drive a reveal through the UI. Assumes the page is on the same surface
 * post-commit-window. Button label is "Reveal" — adjust regex if the
 * component lands different copy.
 */
export async function revealVoteViaUI(page: Page): Promise<void> {
  const submit = page.getByRole("button", { name: /reveal/i });
  await expect(submit).toBeEnabled({ timeout: 15_000 });
  await submit.click();
  await waitForConfirmed(page);
}

/**
 * Navigate to the expert review surface for a given application. The list
 * page is `/expert/voting`; per-application drill-in uses `?applicationId=...`
 * as the canonical query param.
 */
export async function gotoExpertReview(page: Page, applicationId: string): Promise<void> {
  await page.goto(`/expert/voting?applicationId=${encodeURIComponent(applicationId)}`, {
    waitUntil: "domcontentloaded",
  });
}
