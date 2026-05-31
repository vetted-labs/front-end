import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GuildEarningsTab } from "@/components/guild/GuildEarningsTab";

describe("GuildEarningsTab", () => {
  it("does not say there are no earnings when totals exist but recent history is empty", () => {
    render(
      <GuildEarningsTab
        earnings={{
          totalPoints: 54,
          totalEndorsementEarnings: 139,
          totalEndorsementVetd: 139,
          totalEndorsementUsd: 27,
          recentEarnings: [],
        }}
      />,
    );

    expect(screen.getByText("No recent earnings yet")).toBeInTheDocument();
    expect(screen.queryByText("No Earnings Yet")).not.toBeInTheDocument();
  });

  it("shows endorsement earnings in both $VETD and USD", () => {
    render(
      <GuildEarningsTab
        earnings={{
          totalPoints: 54,
          totalEndorsementEarnings: 139,
          totalEndorsementVetd: 139,
          totalEndorsementUsd: 27,
          recentEarnings: [],
        }}
      />,
    );

    // $VETD token figure (no currency prefix) + USD figure ($ prefix).
    expect(screen.getByText("$VETD")).toBeInTheDocument();
    expect(screen.getByText("139")).toBeInTheDocument();
    expect(screen.getByText("$27")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
  });
});
