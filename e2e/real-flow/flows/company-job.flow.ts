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

  await page.addInitScript(() => {
    try {
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith("vetted:draft:signup:")) {
          window.localStorage.removeItem(key);
        }
      }
      window.sessionStorage.removeItem("vetted:anon-tab-id");
    } catch {
      // Some intermediate documents have an opaque origin. The script runs
      // again on the app origin during the navigation below.
    }
  });
  await page.goto("/auth/signup?type=company", {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByText(/hire vetted talent/i)).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForTimeout(750);
  await fillAndExpect(page, "Acme Inc.", companyName);
  await fillAndExpect(page, "https://example.com", "https://e2e-test.com");
  await fillAndExpect(page, "you@example.com", email);
  await fillAndExpect(page, "Min. 6 characters", COMPANY_PASSWORD);
  await fillAndExpect(page, "Repeat password", COMPANY_PASSWORD);
  await page.getByRole("checkbox").check();
  await fillAndExpect(page, "Acme Inc.", companyName);

  const signupResponsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes("/api/companies") &&
      resp.request().method() === "POST",
    { timeout: 30_000 },
  ).catch(() => null);
  await page.getByRole("button", { name: "Create Account" }).click();
  const signupResponse = await signupResponsePromise;
  if (signupResponse && !signupResponse.ok()) {
    throw new Error(
      `signupCompanyViaUI: company signup failed ${signupResponse.status()} ${await signupResponse.text()}`,
    );
  }
  if (!signupResponse && !/\/dashboard(?:$|[/?#])/.test(page.url())) {
    const currentCompanyName = await page
      .getByPlaceholder("Acme Inc.")
      .inputValue()
      .catch(() => "");
    throw new Error(
      `signupCompanyViaUI: company signup request was not sent; companyName="${currentCompanyName}"`,
    );
  }

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

async function fillAndExpect(
  page: Page,
  placeholder: string,
  value: string,
): Promise<void> {
  const field = page.getByPlaceholder(placeholder);
  await expect(field).toBeVisible({ timeout: 15_000 });
  await field.fill(value);
  await expect(field).toHaveValue(value, { timeout: 15_000 });
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
