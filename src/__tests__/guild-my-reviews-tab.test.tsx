import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GuildMyReviewsTab } from "@/components/guild/GuildMyReviewsTab";
import type { GuildApplication } from "@/types";

describe("GuildMyReviewsTab", () => {
  it("links active expert reviews to the voting review modal route", () => {
    render(
      <GuildMyReviewsTab
        guildId="guild-1"
        expertId="expert-1"
        applications={[
          {
            id: "expert-app-1",
            candidate_name: "Sven Wallet 2",
            candidate_email: "sven@example.com",
            guild_id: "guild-1",
            guild_name: "Finance",
            status: "pending",
            created_at: "2026-05-01T00:00:00Z",
            voting_deadline: "2026-05-14T00:00:00Z",
            vote_count: 0,
            required_stake: 0,
            finalized: false,
            item_type: "expert_application",
          } as GuildApplication,
        ]}
        submittedReviews={[]}
        isLoading={false}
      />,
    );

    expect(screen.getByRole("link", { name: /start review/i })).toHaveAttribute(
      "href",
      "/expert/voting?reviewAppId=expert-app-1&reviewType=expert&guildId=guild-1",
    );
  });
});
