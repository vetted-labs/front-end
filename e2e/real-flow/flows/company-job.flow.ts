import { expect, type Page } from "@playwright/test";

export type CompanyCredentials = {
  email: string;
  password: string;
  companyName: string;
  token: string;
  companyId: string;
};

export type PublishedJob = {
  id: string;
  title: string;
};

const COMPANY_PASSWORD = "TestPass123!";

export async function signupCompanyViaUI(
  page: Page,
): Promise<CompanyCredentials> {
  const timestamp = Date.now();
  const email = `e2e-company-${timestamp}@vetted-test.com`;
  const companyName = `E2E Hiring Co ${timestamp}`;

  await page.goto("/auth/signup?type=company", {
    waitUntil: "domcontentloaded",
  });
  await page.getByPlaceholder("Acme Inc.").fill(companyName);
  await page
    .getByPlaceholder("https://example.com")
    .fill("https://e2e-test.com");
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("Min. 6 characters").fill(COMPANY_PASSWORD);
  await page.getByPlaceholder("Repeat password").fill(COMPANY_PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create Account" }).click();

  await page.waitForURL(/\/dashboard$/, { timeout: 30_000 });
  await expect(page.locator("body")).toContainText(/dashboard/i, {
    timeout: 30_000,
  });

  const token = await page.evaluate(
    () => localStorage.getItem("authToken") ?? "",
  );
  if (!token) throw new Error("signupCompanyViaUI: auth token was not written");
  const companyId = await page.evaluate(
    () => localStorage.getItem("companyId") ?? "",
  );
  if (!companyId)
    throw new Error("signupCompanyViaUI: company id was not written");

  return { email, password: COMPANY_PASSWORD, companyName, token, companyId };
}

export async function publishJobViaUI(
  page: Page,
  args: { title: string; guildName: string },
): Promise<PublishedJob> {
  await page.goto("/jobs/new", { waitUntil: "domcontentloaded" });

  await fillRoleStep(page, args.title);
  await clickContinue(page);

  await fillLocationStep(page);
  await clickContinue(page);

  await fillDescriptionStep(page);
  await clickContinue(page);

  await chooseGuild(page, args.guildName);
  await clickContinue(page);

  // Questions and attachments are optional in v1.
  await clickContinue(page);
  await clickContinue(page);

  const createResponse = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/jobs") && resp.request().method() === "POST",
    { timeout: 30_000 },
  );
  await page.getByRole("button", { name: "Publish job" }).last().click();
  const response = await createResponse;
  expect(response.ok(), await response.text()).toBeTruthy();

  const body = await response.json();
  const id = extractJobId(body);
  await page.waitForURL(/\/dashboard\/jobs/, { timeout: 30_000 });

  return { id, title: args.title };
}

async function fillRoleStep(page: Page, title: string): Promise<void> {
  await page.getByPlaceholder("e.g. Senior Frontend Engineer").fill(title);
  await page.getByPlaceholder("e.g. Product Engineering").fill("Platform QA");
  await page.getByRole("radio", { name: "Senior" }).click();
  await page.getByRole("radio", { name: "Full-time" }).click();

  const skills = page.getByPlaceholder(/Type to search/i);
  await skills.fill("TypeScript");
  await page.keyboard.press("Enter");
  await expect(page.getByText("TypeScript").first()).toBeVisible();
}

async function fillLocationStep(page: Page): Promise<void> {
  await page.getByRole("radio", { name: "Remote" }).click();
  await page.getByPlaceholder(/Berlin|Remote-friendly/i).fill("Remote");
  await page.locator('input[type="number"]').nth(0).fill("140000");
  await page.locator('input[type="number"]').nth(1).fill("185000");
}

async function fillDescriptionStep(page: Page): Promise<void> {
  await page
    .locator("textarea")
    .fill(
      "This is a full-stack E2E role description with enough detail to satisfy validation and appear on the public job detail page.",
    );
  await page.getByPlaceholder(/Add a requirement/i).fill("Playwright");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Playwright").first()).toBeVisible();
}

async function chooseGuild(page: Page, guildName: string): Promise<void> {
  await page.getByRole("button", { name: "Choose guild" }).click();
  const modal = page.getByText("Which guild should review this role?").first();
  await expect(modal).toBeVisible({ timeout: 30_000 });
  await page
    .getByRole("button", { name: new RegExp(guildName, "i") })
    .first()
    .click();
  await page.getByRole("button", { name: "Assign guild" }).click();
  await expect(
    page
      .getByText(new RegExp(`Assigned guild[\\s\\S]*${guildName}`, "i"))
      .first(),
  ).toBeVisible({
    timeout: 30_000,
  });
}

async function clickContinue(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: "Continue" });
  await expect(button).toBeEnabled({ timeout: 15_000 });
  await button.click();
}

function extractJobId(body: unknown): string {
  if (!body || typeof body !== "object") {
    throw new Error(`publishJobViaUI: invalid create response ${String(body)}`);
  }

  const envelope = body as {
    data?: { id?: unknown; jobId?: unknown; job?: { id?: unknown } };
    id?: unknown;
    jobId?: unknown;
  };
  const rawId =
    envelope.data?.id ??
    envelope.data?.jobId ??
    envelope.data?.job?.id ??
    envelope.id ??
    envelope.jobId;

  if (typeof rawId !== "string" || rawId.length === 0) {
    throw new Error(
      `publishJobViaUI: missing job id in response ${JSON.stringify(body)}`,
    );
  }

  return rawId;
}
