// H1 — Company invites a teammate
//
// Route: /dashboard/settings → "Team" tab
//   The team section is not a standalone page but a tab inside the unified
//   SettingsPage component (src/components/dashboard/SettingsPage.tsx).
//   There is no dedicated /company/settings/team or /company/team route in
//   src/app/; navigating to /dashboard/settings and clicking the "Team" nav
//   item is the only supported path.
//
// UI entry points (from src/components/company/TeamManagement.tsx and
//   src/components/company/InviteTeamMemberDialog.tsx):
//   • "Invite" button (with UserPlus icon) — opens the modal
//   • Modal title: "Invite Team Member"
//   • Fields: Full Name (text), Email (email), Role (select, default "recruiter")
//   • Submit: "Send Invite" button
//
// BE endpoint for team invites (teamApi.invite) — status UNKNOWN at time of
//   authoring (2026-05-19). If the endpoint does not exist the test will fail
//   after the "Send Invite" click with a toast error. The spec is committed as
//   scaffolding; see TESTING_PHASES.md for the tracking ticket.
//
// On success the InviteTeamMemberDialog closes, TeamManagement refetches, and
//   the new member row appears with status badge text "Pending"
//   (TEAM_MEMBER_STATUS_CONFIG.pending.label in src/config/constants.ts).

import { test, expect } from "../../fixtures";
import { signupCompanyViaUI } from "../../flows/company-job.flow";

test("company admin invites a teammate and they appear pending", async ({
  page,
  cleanState: _cleanState,
}) => {
  void _cleanState;

  await test.step("company admin signs up and reaches the dashboard", async () => {
    await signupCompanyViaUI(page);
  });

  await test.step("company admin navigates to Settings → Team tab", async () => {
    await page.goto("/dashboard/settings", { waitUntil: "domcontentloaded" });

    // The left-rail nav item for Team is a <button> whose accessible name is
    // "Team Members and roles" (label + description).
    await page.getByRole("button", { name: /team/i }).click();

    // Confirm the Team section is now visible — TeamManagement renders an h2
    // with "Team" text as the card header
    await expect(
      page.getByRole("heading", { name: /team/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  const inviteeEmail = `mate-${Date.now()}@e2e.local`;
  const inviteeName = "E2E Teammate";

  await test.step("company admin opens the Invite dialog", async () => {
    await page.getByRole("button", { name: /invite/i }).click();

    // Modal should appear
    await expect(
      page.getByRole("heading", { name: /invite team member/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  await test.step("company admin fills in the invite form and submits", async () => {
    // The dialog uses unassociated <label>s, so target inputs by placeholder.
    await page.getByPlaceholder("Jane Smith").fill(inviteeName);
    await page.getByPlaceholder("jane@company.com").fill(inviteeEmail);

    // Role defaults to "recruiter" — leave as-is for this scenario

    await page.getByRole("button", { name: /send invite/i }).click();
  });

  await test.step("invitee appears in the team list with Pending status", async () => {
    // After a successful invite the dialog closes, the list refetches, and the
    // new member row is rendered by TeamMemberList. The row contains the
    // invitee's email and a status badge with label "Pending"
    // (TEAM_MEMBER_STATUS_CONFIG.pending.label).
    //
    // NOTE: If the BE invite endpoint is not yet implemented, the toast will
    // show an error and this assertion will fail. The spec is still committed
    // as scaffolding — see file-level comment.
    // The invitee email also appears transiently in the success toast, so
    // scope to the persistent team member row (a <p> in the list).
    await expect(
      page.locator("p", { hasText: inviteeEmail }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^pending$/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
