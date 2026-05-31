import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Governance is gated behind GOVERNANCE_ENABLED (VET-103). Force it on so we
// can assert the real tab content (the Create-a-Proposal CTA introduced by
// VET-101), independent of the live flag value.
vi.mock("@/config/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/constants")>();
  return { ...actual, GOVERNANCE_ENABLED: true };
});

const { GuildGovernanceTab } = await import(
  "@/components/guild/GuildGovernanceTab"
);

describe("GuildGovernanceTab", () => {
  it("surfaces a prominent Create a Proposal CTA linking to the create route", () => {
    render(<GuildGovernanceTab guildId="guild-1" proposals={[]} />);

    expect(
      screen.getByRole("link", { name: /create a proposal/i }),
    ).toHaveAttribute("href", "/expert/governance/create");
  });

  it("no longer renders the Your governance record block", () => {
    render(<GuildGovernanceTab guildId="guild-1" proposals={[]} />);

    expect(screen.queryByText(/your governance record/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/matched majority/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/proposals authored/i)).not.toBeInTheDocument();
  });
});
