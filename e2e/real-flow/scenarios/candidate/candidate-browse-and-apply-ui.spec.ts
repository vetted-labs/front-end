// e2e/real-flow/scenarios/candidate/candidate-browse-and-apply-ui.spec.ts
//
// Task D3 — candidate browses jobs and applies via the UI.
//
// Flow:
//   1. Seed a company + a published job via the test API.
//   2. Sign up a fresh candidate (API-backed, no UI form).
//   3. Navigate to /browse/jobs/<jobId> and assert the job appears.
//   4. Click the apply CTA — because the candidate is not yet a guild member
//      this redirects to /guilds/<guildId>/apply?jobId=<jobId> (the combined
//      guild+job apply wizard).
//   5. Drive the multi-step wizard through every required substep:
//        Step 1 — Resume & General: upload a minimal PDF + 4 general questions
//        Step 2 — Job Questions: cover letter (≥50 chars)
//        Step 3 — Guild Review: pick level, check no-AI, fill 5 domain topics
//   6. Assert the "Application Submitted!" success screen.
//
// On-chain invariant: the guild application flow submits to the BE's
//   POST /api/guilds/:id/applications endpoint, which links a Pipeline B
//   candidate_proposals row. We verify that the response was received
//   (success screen visible) — the chain-level invariant (session creation)
//   is covered by the headline-candidate-guild-review scenario.

import path from "node:path";
import { test, expect } from "../../fixtures";
import { testApi, BACKEND_URL } from "../../helpers/backend";
import { signupCandidate } from "../../../helpers/auth";

// ─── Minimal fake PDF for the resume upload ──────────────────────────────────
// Playwright's setInputFiles accepts a buffer; we create the smallest
// syntactically valid PDF so the FE file-type check passes.
const FAKE_PDF = {
  name: "e2e-resume.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from(
    "%PDF-1.0\n1 0 obj<</Type /Catalog/Pages 2 0 R>>endobj\n" +
      "2 0 obj<</Type /Pages/Kids[3 0 R]/Count 1>>endobj\n" +
      "3 0 obj<</Type /Page/MediaBox[0 0 612 792]>>endobj\n" +
      "xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n" +
      "0000000062 00000 n\n0000000114 00000 n\ntrailer<</Size 4/Root 1 0 R>>" +
      "\nstartxref\n178\n%%EOF",
  ),
};

// Minimum-viable long answer for every text area that enforces a 50-char min.
const LONG_ANSWER =
  "E2E test answer providing sufficient detail to satisfy the minimum length validation requirement set by the guild wizard.";

// ─── Test ─────────────────────────────────────────────────────────────────────

test(
  "candidate browses to a job listing and applies via the guild wizard",
  async ({ page, request, cleanState: _cleanState, guild }) => {
    void _cleanState;

    // ── 1. Seed company + job + guild experts ──────────────────────────────
    const timestamp = Date.now();

    let companyId: string;
    let jobId: string;

    await test.step("seed company, job, and minimum guild experts via the test API", async () => {
      const company = await testApi.seedCompany(request, {
        name: `E2E Corp ${timestamp}`,
        email: `company-${timestamp}@e2e.local`,
      });
      companyId = company.id;

      const seeded = await testApi.seedJob(request, {
        companyId,
        title: `Senior E2E Engineer ${timestamp}`,
        guild: guild.name,
        status: "active",
      });
      jobId = seeded.jobId;

      // The BE requires at least 2 approved guild members to accept an
      // application (it assigns a Pipeline B reviewer panel). Seed the minimum
      // so the submit step succeeds in CI / post-reset environments.
      // We use deterministic anvil-style wallet addresses to avoid collisions.
      await Promise.all([
        testApi.seedExpert(request, {
          walletAddress: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`,
          fullName: `E2E Expert A ${timestamp}`,
          email: `expert-a-${timestamp}@e2e.local`,
          status: "approved",
          guildId: guild.id,
        }),
        testApi.seedExpert(request, {
          walletAddress: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`,
          fullName: `E2E Expert B ${timestamp}`,
          email: `expert-b-${timestamp}@e2e.local`,
          status: "approved",
          guildId: guild.id,
        }),
      ]);
    });

    // ── 2. Sign up a fresh candidate ────────────────────────────────────────
    await test.step("candidate signs up and lands on the dashboard", async () => {
      await signupCandidate(page);
      await expect(page).toHaveURL(/\/candidate\/dashboard/, {
        timeout: 30_000,
      });
    });

    // ── 3. Navigate to the job detail page ──────────────────────────────────
    await test.step("candidate navigates to the job detail page and sees the listing", async () => {
      await page.goto(`/browse/jobs/${jobId}`, {
        waitUntil: "domcontentloaded",
      });

      // The job title should be visible in the detail page hero/header.
      await expect(
        page.getByText(new RegExp(`Senior E2E Engineer ${timestamp}`, "i")).first(),
      ).toBeVisible({ timeout: 20_000 });
    });

    // ── 4. Click apply — should redirect to guild wizard ────────────────────
    await test.step("candidate clicks the apply CTA and the guild wizard loads", async () => {
      // The apply button label for a non-guild-member is:
      //   "Apply & join <guildName>" OR "Apply now" (for existing members).
      // Since this is a fresh candidate, expect the non-member variant.
      const applyBtn = page.getByRole("button", {
        name: new RegExp(`apply|join`, "i"),
      }).first();
      await applyBtn.waitFor({ state: "visible", timeout: 15_000 });
      await applyBtn.click();

      // The click navigates to /guilds/<uuid>/apply?jobId=<id>.
      await page.waitForURL(/\/guilds\/.*\/apply/, { timeout: 20_000 });

      // Wizard heading should mention the guild name.
      await expect(
        page.getByText(new RegExp(guild.name, "i")).first(),
      ).toBeVisible({ timeout: 15_000 });
    });

    // ── 5. Drive the wizard ──────────────────────────────────────────────────

    // Helper: click the primary footer action (Continue / Submit application).
    const clickContinue = async () => {
      const btn = page.getByRole("button", {
        name: /continue|submit application/i,
      }).last();
      await btn.waitFor({ state: "visible", timeout: 10_000 });
      await btn.click();
    };

    // ─ Step 1, substep 0: Resume & links ────────────────────────────────────
    await test.step("wizard step 1: candidate uploads a resume", async () => {
      // The file input is hidden; trigger via Playwright's setInputFiles.
      const fileInput = page.locator('input[type="file"][accept*="pdf"]');
      await fileInput.waitFor({ state: "attached", timeout: 15_000 });
      await fileInput.setInputFiles(FAKE_PDF);

      // Wait for the file to be reflected in the UI (name appears).
      await expect(page.getByText("e2e-resume.pdf")).toBeVisible({
        timeout: 15_000,
      });

      await clickContinue();
    });

    // ─ Step 1, substeps 1–4: General questions ──────────────────────────────
    await test.step("wizard step 1: candidate answers all four general questions", async () => {
      // There are 4 required general questions, each shown one at a time in
      // substep mode. We iterate through them by filling the visible textarea
      // and clicking Continue each time.
      for (let i = 0; i < 4; i++) {
        const ta = page.locator("textarea").first();
        await ta.waitFor({ state: "visible", timeout: 10_000 });
        await ta.fill(LONG_ANSWER);
        await clickContinue();
      }
    });

    // ─ Step 2, substep 0: Cover letter ──────────────────────────────────────
    await test.step("wizard step 2: candidate writes a cover letter for the job", async () => {
      const ta = page.locator("textarea").first();
      await ta.waitFor({ state: "visible", timeout: 10_000 });
      await ta.fill(
        `I am excited to apply for Senior E2E Engineer ${timestamp}. ` +
          "This role aligns perfectly with my experience and career goals. " +
          "I believe my background in end-to-end testing and quality engineering " +
          "would add significant value to your team and the products you build.",
      );
      await clickContinue();
    });

    // ─ Step 3, substep 0: Level selection + no-AI declaration ───────────────
    await test.step("wizard step 3: candidate selects experience level and signs no-AI declaration", async () => {
      // Pick the "Experienced" level button by text.
      await page.getByRole("button", { name: /experienced/i }).click();

      // The no-AI declaration checkbox is wrapped in a <label>; clicking the
      // label (which contains the declaration text) is more reliable than
      // targeting the visually-hidden <input> directly.
      const noAiLabel = page.locator("label").filter({
        hasText: /wrote this myself|no.?ai|automated tools/i,
      });
      const labelVisible = await noAiLabel.isVisible().catch(() => false);
      if (labelVisible) {
        await noAiLabel.click();
      }

      await clickContinue();
    });

    // ─ Step 3, substeps 1–5: Domain topics (one per substep) ───────────────
    await test.step("wizard step 3: candidate answers all five domain topic questions", async () => {
      // 5 domain topics, each on its own substep. The last substep shows
      // "Submit application" instead of "Continue" in the WizardFooter.
      for (let i = 0; i < 5; i++) {
        const ta = page.locator("textarea").first();
        await ta.waitFor({ state: "visible", timeout: 10_000 });
        await ta.fill(LONG_ANSWER);
        await clickContinue();
      }
      // After the 5th submit click the wizard POSTs to the BE and renders the
      // ApplicationSuccess screen within the same URL path. The success
      // heading ("Application Submitted!") becomes visible when done.
    });

    // ── 6. Assert success screen ─────────────────────────────────────────────
    await test.step("application submitted — success screen confirms guild review is underway", async () => {
      await expect(
        page.getByText(/application submitted/i).first(),
      ).toBeVisible({ timeout: 30_000 });

      // The success copy includes the guild name.
      await expect(
        page.getByText(new RegExp(guild.name, "i")).first(),
      ).toBeVisible({ timeout: 10_000 });
    });

    // ── 7. Back-end invariant: the application exists in the DB ─────────────
    await test.step("back-end invariant: guild application is persisted", async () => {
      // The auth token is in localStorage; read it to call the BE directly.
      const token = await page.evaluate(
        () => localStorage.getItem("authToken") ?? "",
      );
      expect(token).not.toBe("");

      const res = await request.get(
        `${BACKEND_URL}/api/candidates/me/guild-applications`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(res.ok()).toBe(true);
      const body = (await res.json()) as { data: Array<{ id: string }> };
      expect(body.data.length).toBeGreaterThan(0);
    });
  },
);
