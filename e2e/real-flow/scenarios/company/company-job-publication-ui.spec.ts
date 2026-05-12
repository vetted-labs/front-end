import { test, expect } from "../../fixtures";
import {
  publishJobViaUI,
  signupCompanyViaUI,
} from "../../flows/company-job.flow";

test("company publishes an active job through the UI wizard", async ({
  page,
  cleanState: _cleanState,
}) => {
  void _cleanState;

  const company = await signupCompanyViaUI(page);
  const job = await publishJobViaUI(page, {
    title: `E2E Platform Role ${Date.now()}`,
    guildName: "Engineering",
  });

  await page.goto("/dashboard/jobs", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(job.title).first()).toBeVisible({
    timeout: 30_000,
  });

  await page.goto(`/browse/jobs/${job.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: job.title })).toBeVisible({
    timeout: 30_000,
  });
  expect(company.email).toContain("@vetted-test.com");
});
