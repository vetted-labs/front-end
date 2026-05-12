import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GuildGovernanceTab } from "@/components/guild/GuildGovernanceTab";

describe("GuildGovernanceTab", () => {
  it("links the new proposal CTA to the create route", () => {
    render(<GuildGovernanceTab guildId="guild-1" proposals={[]} />);

    expect(screen.getByRole("link", { name: /new proposal/i })).toHaveAttribute(
      "href",
      "/expert/governance/create",
    );
  });
});
