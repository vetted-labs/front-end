import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ApplicationFinalizationDisplay } from "@/components/ApplicationFinalizationDisplay";

vi.mock("@/lib/api", () => ({
  guildAppealApi: {
    getAppealByApplication: vi.fn().mockResolvedValue(null),
    fileAppeal: vi.fn(),
    getAppeal: vi.fn(),
    getGuildAppeals: vi.fn(),
    voteOnAppeal: vi.fn(),
    checkAppealEligibility: vi.fn(),
  },
}));

vi.mock("@/lib/hooks/useFetch", () => ({
  useFetch: () => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const baseApplication = {
  id: "app-1",
  finalized: false,
};

describe("ApplicationFinalizationDisplay", () => {
  // Test 1: Returns null when not finalized and no consensus_failed
  it("returns null when not finalized and no consensus_failed", () => {
    const { container } = render(
      <ApplicationFinalizationDisplay application={baseApplication} />
    );
    expect(container.firstChild).toBeNull();
  });

  // Test 2: Shows consensus failed banner (not finalized, consensus_failed=true, tiebreaker_required=false)
  it("shows consensus failed banner when consensus_failed and no tiebreaker required", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          ...baseApplication,
          consensus_failed: true,
          tiebreaker_required: false,
        }}
      />
    );

    expect(screen.getByText("Consensus Could Not Be Reached")).toBeInTheDocument();
    expect(
      screen.getByText(/The system is assigning a tiebreaker expert/)
    ).toBeInTheDocument();
  });

  // Test 3: Shows tiebreaker assigned message when tiebreaker_required=true
  it("shows tiebreaker assigned message when tiebreaker_required is true", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          ...baseApplication,
          consensus_failed: true,
          tiebreaker_required: true,
        }}
      />
    );

    expect(screen.getByText("Consensus Could Not Be Reached")).toBeInTheDocument();
    expect(
      screen.getByText(/A tiebreaker expert has been assigned/)
    ).toBeInTheDocument();
  });

  // Test 4: Shows compact consensus failed
  it("shows compact consensus failed banner", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          ...baseApplication,
          consensus_failed: true,
          tiebreaker_required: true,
        }}
        compact={true}
      />
    );

    expect(screen.getByText("Consensus Failed")).toBeInTheDocument();
    expect(screen.getByText("Tiebreaker expert assigned")).toBeInTheDocument();
  });

  // Test 4b: Compact consensus failed without tiebreaker
  it("shows compact consensus failed assigning tiebreaker message", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          ...baseApplication,
          consensus_failed: true,
          tiebreaker_required: false,
        }}
        compact={true}
      />
    );

    expect(screen.getByText("Consensus Failed")).toBeInTheDocument();
    expect(screen.getByText("Assigning tiebreaker...")).toBeInTheDocument();
  });

  // Test 5: Finalized approved shows "Application Approved", consensus score, vote count
  it("shows approved outcome with score and reviewer count", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          id: "app-1",
          finalized: true,
          outcome: "approved",
          consensus_score: 78.5,
          vote_count: 5,
        }}
      />
    );

    expect(screen.getByText("Application Approved")).toBeInTheDocument();
    expect(screen.getByText("78.5")).toBeInTheDocument();
    expect(screen.getByText(/5 reviewers/)).toBeInTheDocument();
  });

  // Test 6: Finalized rejected shows "Application Rejected"
  it("shows rejected outcome", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          id: "app-1",
          finalized: true,
          outcome: "rejected",
          consensus_score: 32,
          vote_count: 4,
        }}
      />
    );

    expect(screen.getByText("Application Rejected")).toBeInTheDocument();
  });

  // Test 7: Compact approved: "Approved" + "Consensus: X/100"
  it("compact mode shows Approved and consensus score", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          id: "app-1",
          finalized: true,
          outcome: "approved",
          consensus_score: 82.3,
          vote_count: 3,
        }}
        compact={true}
      />
    );

    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Consensus: 82.3/100")).toBeInTheDocument();
  });

  // Test 8: Compact rejected shows "Rejected"
  it("compact mode shows Rejected", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          id: "app-1",
          finalized: true,
          outcome: "rejected",
          consensus_score: 40,
          vote_count: 3,
        }}
        compact={true}
      />
    );

    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  // Test 9: Slashing tier "aligned" displays
  it("shows aligned slashing tier", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          id: "app-1",
          finalized: true,
          outcome: "approved",
          consensus_score: 75,
          vote_count: 3,
        }}
        myVote={{
          score: 74,
          slashing_tier: "aligned",
          slash_percent: 0,
        }}
      />
    );

    expect(screen.getByText("aligned")).toBeInTheDocument();
  });

  // Test 10: Slashing tier "severe" with "-25%" slash percentage
  it("shows severe slashing tier with slash percentage", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          id: "app-1",
          finalized: true,
          outcome: "rejected",
          consensus_score: 30,
          vote_count: 3,
        }}
        myVote={{
          score: 80,
          slashing_tier: "severe",
          slash_percent: 25,
        }}
      />
    );

    expect(screen.getByText("severe")).toBeInTheDocument();
    expect(screen.getByText("-25%")).toBeInTheDocument();
  });

  // Test 11: No slash percentage shown when 0%
  it("does not show slash percentage when 0", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          id: "app-1",
          finalized: true,
          outcome: "approved",
          consensus_score: 75,
          vote_count: 3,
        }}
        myVote={{
          score: 74,
          slashing_tier: "aligned",
          slash_percent: 0,
        }}
      />
    );

    expect(screen.queryByText(/-\d+%/)).toBeNull();
  });

  // Test 12: High alignment text (distance < 10)
  it("shows high alignment text when distance is less than 10", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          id: "app-1",
          finalized: true,
          outcome: "approved",
          consensus_score: 75,
          vote_count: 3,
        }}
        myVote={{
          score: 72,
          alignment_distance: 3,
        }}
      />
    );

    expect(screen.getByText(/High alignment/)).toBeInTheDocument();
  });

  // Test 13: Moderate alignment text (distance 10-20)
  it("shows moderate alignment text when distance is between 10 and 20", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          id: "app-1",
          finalized: true,
          outcome: "approved",
          consensus_score: 75,
          vote_count: 3,
        }}
        myVote={{
          score: 60,
          alignment_distance: 15,
        }}
      />
    );

    expect(screen.getByText(/Moderate alignment/)).toBeInTheDocument();
  });

  // Test 14: Low alignment text (distance > 20)
  it("shows low alignment text when distance is greater than 20", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          id: "app-1",
          finalized: true,
          outcome: "approved",
          consensus_score: 75,
          vote_count: 3,
        }}
        myVote={{
          score: 40,
          alignment_distance: 35,
        }}
      />
    );

    expect(screen.getByText(/Low alignment/)).toBeInTheDocument();
  });

  // Test 15: IQR statistics display (Median, IQR)
  it("shows IQR statistics including Median and IQR values", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          id: "app-1",
          finalized: true,
          outcome: "approved",
          consensus_score: 75,
          vote_count: 5,
          iqr: {
            median: 74.5,
            q1: 68.0,
            q3: 81.0,
            iqr: 13.0,
            includedCount: 4,
            excludedCount: 1,
          },
        }}
      />
    );

    expect(screen.getByText(/Median 74\.5/)).toBeInTheDocument();
    expect(screen.getByText(/IQR 13\.0/)).toBeInTheDocument();
  });

  // Test 16: My vote performance: score, alignment, +rep, reward VETD
  it("shows my vote performance with score, alignment, rep change, and reward", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          id: "app-1",
          finalized: true,
          outcome: "approved",
          consensus_score: 75,
          vote_count: 3,
        }}
        myVote={{
          score: 74,
          alignment_distance: 1,
          reputation_change: 10,
          reward_amount: 5.25,
        }}
      />
    );

    expect(screen.getByText("74/100")).toBeInTheDocument();
    expect(screen.getByText("+10")).toBeInTheDocument();
    expect(screen.getByText("5.25 VETD")).toBeInTheDocument();
  });

  // Test 17: Negative rep change without plus sign
  it("shows negative rep change without a plus sign", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          id: "app-1",
          finalized: true,
          outcome: "rejected",
          consensus_score: 30,
          vote_count: 3,
        }}
        myVote={{
          score: 80,
          alignment_distance: 50,
          reputation_change: -15,
        }}
      />
    );

    expect(screen.getByText("-15")).toBeInTheDocument();
    expect(screen.queryByText("+")).toBeNull();
  });

  // Test 18: Reward hidden when 0
  it("hides reward row when reward_amount is 0", () => {
    render(
      <ApplicationFinalizationDisplay
        application={{
          id: "app-1",
          finalized: true,
          outcome: "approved",
          consensus_score: 75,
          vote_count: 3,
        }}
        myVote={{
          score: 74,
          reward_amount: 0,
        }}
      />
    );

    expect(screen.queryByText(/VETD/)).toBeNull();
  });
});
