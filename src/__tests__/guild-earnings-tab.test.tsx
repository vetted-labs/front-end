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
          recentEarnings: [],
        }}
      />,
    );

    expect(screen.getByText("No recent earnings yet")).toBeInTheDocument();
    expect(screen.queryByText("No Earnings Yet")).not.toBeInTheDocument();
  });
});
