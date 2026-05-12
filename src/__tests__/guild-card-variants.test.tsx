import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GuildCard } from "@/components/guild/card";
import type { ExpertGuild, Guild } from "@/types";

const baseExpertGuild: ExpertGuild = {
  id: "g-1",
  name: "Engineering",
  description: "",
  memberCount: 8,
  expertRole: "master",
  reputation: 500,
  totalEarnings: 0,
  joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 47).toISOString(),
  pendingProposals: 1,
  ongoingProposals: 0,
  closedProposals: 12,
  topMembers: [
    { id: "m1", fullName: "Sven Kim" },
    { id: "m2", fullName: "Jane Marx" },
  ],
};

const basePublicGuild: Guild = {
  id: "g-1",
  name: "Engineering",
  description: "",
  expertCount: 48,
  totalProposalsReviewed: 1247,
  openPositions: 6,
};

describe("GuildCard variants render", () => {
  it("workspace shows pending banner, name, members hero, and ticker", () => {
    render(
      <GuildCard
        variant="workspace"
        guild={baseExpertGuild}
        catalogueIndex={2}
        currentUserId="m1"
      />,
    );
    expect(screen.getByText(/pending review/i)).toBeInTheDocument();
    expect(screen.getByText("Engineering.")).toBeInTheDocument();
    expect(screen.getByText("08")).toBeInTheDocument();
    expect(screen.getByText("Staked")).toBeInTheDocument();
  });
  it("marketplace shows N OPEN tag and 'Experts' label", () => {
    render(
      <GuildCard variant="marketplace" guild={basePublicGuild} catalogueIndex={2} />,
    );
    expect(screen.getByText(/6 OPEN/)).toBeInTheDocument();
    expect(screen.getByText("Experts")).toBeInTheDocument();
  });
  it("widget compact still shows name and ticker", () => {
    render(
      <GuildCard
        variant="widget"
        guild={baseExpertGuild}
        catalogueIndex={2}
        currentUserId="m1"
      />,
    );
    expect(screen.getByText("Engineering.")).toBeInTheDocument();
    expect(screen.getByText("Rep")).toBeInTheDocument();
  });
  it("profile shows tenure row, hides member hero", () => {
    render(
      <GuildCard variant="profile" guild={baseExpertGuild} catalogueIndex={2} />,
    );
    expect(screen.getByText(/Member since/i)).toBeInTheDocument();
    expect(screen.queryByText("Members")).not.toBeInTheDocument();
  });
});
