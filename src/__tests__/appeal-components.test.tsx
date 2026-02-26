import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppealSubmissionForm } from "@/components/guild/AppealSubmissionForm";
import { AppealStatusBanner } from "@/components/guild/AppealStatusBanner";
import { AppealReviewPanel } from "@/components/guild/AppealReviewPanel";
import type { GuildApplicationAppeal } from "@/types";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the API module
vi.mock("@/lib/api", () => ({
  guildAppealApi: {
    fileAppeal: vi.fn(),
    getAppealByApplication: vi.fn(),
    getAppeal: vi.fn(),
    getGuildAppeals: vi.fn(),
    voteOnAppeal: vi.fn(),
    checkAppealEligibility: vi.fn(),
  },
}));

// Mock useAppealStaking (uses wagmi hooks internally)
vi.mock("@/lib/hooks/useVettedContracts", () => ({
  useAppealStaking: () => ({
    approveTokens: vi.fn(),
    stakeForAppeal: vi.fn(),
    needsApproval: () => false,
  }),
}));

// Mock formatTimeAgo
vi.mock("@/lib/utils", () => ({
  formatTimeAgo: (date: string) => `mocked-${date}`,
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

const basePendingAppeal: GuildApplicationAppeal = {
  id: "appeal-1",
  applicationId: "app-1",
  guildId: "guild-1",
  guildName: "Solidity Experts",
  appealerExpertId: "expert-2",
  appealerName: "Expert Jane",
  justification: "This candidate has strong Solidity skills and was unfairly rejected.",
  stakeAmount: 50,
  status: "pending",
  createdAt: "2026-02-24T12:00:00Z",
  votes: [],
  panelSize: 3,
  votesUphold: 0,
  votesOverturn: 0,
};

describe("AppealSubmissionForm", () => {
  it("renders the initial collapsed state with appeal prompt", () => {
    render(
      <AppealSubmissionForm
        applicationId="app-1"
        applicationName="John Doe"
        guildName="Solidity Experts"
        wallet="0xabc123"
      />
    );

    expect(screen.getByText("Believe this rejection was incorrect?")).toBeInTheDocument();
    expect(screen.getByText("Appeal This Rejection")).toBeInTheDocument();
  });

  it("expands to show the form when button is clicked", () => {
    render(
      <AppealSubmissionForm
        applicationId="app-1"
        applicationName="John Doe"
        guildName="Solidity Experts"
        wallet="0xabc123"
      />
    );

    fireEvent.click(screen.getByText("Appeal This Rejection"));

    expect(screen.getByText("File Appeal")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Explain specifically why/)).toBeInTheDocument();
    expect(screen.getByText("Minimum: 50 VETD")).toBeInTheDocument();
  });

  it("displays stake risk information", () => {
    render(
      <AppealSubmissionForm
        applicationId="app-1"
        applicationName="John Doe"
        guildName="Solidity Experts"
        wallet="0xabc123"
      />
    );

    fireEvent.click(screen.getByText("Appeal This Rejection"));

    expect(screen.getByText(/If appeal fails/)).toBeInTheDocument();
    expect(screen.getByText(/Stake forfeited/)).toBeInTheDocument();
  });

  it("shows success/failure outcome explanations", () => {
    render(
      <AppealSubmissionForm
        applicationId="app-1"
        applicationName="John Doe"
        guildName="Solidity Experts"
        wallet="0xabc123"
      />
    );

    fireEvent.click(screen.getByText("Appeal This Rejection"));

    expect(screen.getByText(/If appeal succeeds/)).toBeInTheDocument();
    expect(screen.getByText(/If appeal fails/)).toBeInTheDocument();
  });

  it("has a cancel button to collapse the form", () => {
    render(
      <AppealSubmissionForm
        applicationId="app-1"
        applicationName="John Doe"
        guildName="Solidity Experts"
        wallet="0xabc123"
      />
    );

    fireEvent.click(screen.getByText("Appeal This Rejection"));
    expect(screen.getByText("File Appeal")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("Believe this rejection was incorrect?")).toBeInTheDocument();
  });
});

describe("AppealStatusBanner", () => {
  it("shows pending appeal status", () => {
    render(<AppealStatusBanner appeal={basePendingAppeal} />);

    expect(screen.getByText("Appeal")).toBeInTheDocument();
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
  });

  it("shows reviewing status", () => {
    render(
      <AppealStatusBanner appeal={{ ...basePendingAppeal, status: "reviewing" }} />
    );

    expect(screen.getByText("Under Review")).toBeInTheDocument();
  });

  it("shows upheld outcome", () => {
    const upheldAppeal: GuildApplicationAppeal = {
      ...basePendingAppeal,
      status: "upheld",
      outcome: {
        decision: "upheld",
        appealerReputationChange: -10,
        appealerStakeReturned: false,
        resolvedAt: "2026-02-26T12:00:00Z",
      },
    };
    render(<AppealStatusBanner appeal={upheldAppeal} />);

    expect(screen.getByText("Rejection Upheld")).toBeInTheDocument();
    expect(screen.getByText("Original rejection confirmed")).toBeInTheDocument();
  });

  it("shows overturned outcome", () => {
    const overturnedAppeal: GuildApplicationAppeal = {
      ...basePendingAppeal,
      status: "overturned",
      outcome: {
        decision: "overturned",
        appealerReputationChange: 15,
        appealerStakeReturned: true,
        resolvedAt: "2026-02-26T12:00:00Z",
      },
    };
    render(<AppealStatusBanner appeal={overturnedAppeal} />);

    expect(screen.getByText(/Overturned/)).toBeInTheDocument();
    expect(screen.getByText("Candidate has been admitted to the guild")).toBeInTheDocument();
  });

  it("displays vote progress for active appeals", () => {
    const activeAppeal: GuildApplicationAppeal = {
      ...basePendingAppeal,
      votes: [
        {
          id: "v1",
          expertId: "e1",
          decision: "overturn",
          reasoning: "Test",
          votedAt: "2026-02-25T12:00:00Z",
        },
      ],
      votesOverturn: 1,
    };
    render(<AppealStatusBanner appeal={activeAppeal} />);

    expect(screen.getByText("1/3 voted")).toBeInTheDocument();
    expect(screen.getByText("1 overturn")).toBeInTheDocument();
    expect(screen.getByText("0 uphold")).toBeInTheDocument();
  });

  it("displays justification text", () => {
    render(<AppealStatusBanner appeal={basePendingAppeal} />);

    expect(
      screen.getByText(basePendingAppeal.justification)
    ).toBeInTheDocument();
  });
});

describe("AppealReviewPanel", () => {
  it("renders appeal info card with candidate and guild details", () => {
    render(
      <AppealReviewPanel
        appeal={basePendingAppeal}
        wallet="0xofficer1"
        expertId="officer-1"
      />
    );

    expect(screen.getByText("Appeal Review")).toBeInTheDocument();
    expect(screen.getByText("Solidity Experts")).toBeInTheDocument();
    expect(screen.getByText("Expert Jane")).toBeInTheDocument();
    expect(screen.getByText("50 VETD")).toBeInTheDocument();
  });

  it("shows the justification section", () => {
    render(
      <AppealReviewPanel appeal={basePendingAppeal} wallet="0xofficer1" expertId="officer-1" />
    );

    expect(screen.getByText("Appeal Justification")).toBeInTheDocument();
    expect(screen.getByText(basePendingAppeal.justification)).toBeInTheDocument();
  });

  it("shows vote form for panel member who hasn't voted", () => {
    render(
      <AppealReviewPanel appeal={basePendingAppeal} wallet="0xofficer1" expertId="officer-1" />
    );

    expect(screen.getByText("Your Decision")).toBeInTheDocument();
    expect(screen.getByText("Uphold Rejection")).toBeInTheDocument();
    expect(screen.getByText(/Overturn/)).toBeInTheDocument();
    expect(screen.getByText("Submit Decision")).toBeInTheDocument();
  });

  it("shows voted state if expert already voted", () => {
    const appealWithVote: GuildApplicationAppeal = {
      ...basePendingAppeal,
      status: "reviewing",
      votes: [
        {
          id: "v1",
          expertId: "officer-1",
          decision: "overturn",
          reasoning: "Candidate clearly qualified",
          votedAt: "2026-02-25T12:00:00Z",
        },
      ],
      votesOverturn: 1,
    };

    render(
      <AppealReviewPanel appeal={appealWithVote} wallet="0xofficer1" expertId="officer-1" />
    );

    expect(screen.getByText("You have voted. Waiting for remaining panel members.")).toBeInTheDocument();
    expect(screen.queryByText("Submit Decision")).not.toBeInTheDocument();
  });

  it("shows panel votes after resolution", () => {
    const resolvedAppeal: GuildApplicationAppeal = {
      ...basePendingAppeal,
      status: "upheld",
      votes: [
        {
          id: "v1",
          expertId: "officer-1",
          expertName: "Officer A",
          decision: "uphold",
          reasoning: "Original decision was correct",
          votedAt: "2026-02-25T12:00:00Z",
        },
        {
          id: "v2",
          expertId: "officer-2",
          expertName: "Officer B",
          decision: "uphold",
          reasoning: "Candidate needs more experience",
          votedAt: "2026-02-25T13:00:00Z",
        },
      ],
      votesUphold: 2,
      outcome: {
        decision: "upheld",
        appealerReputationChange: -10,
        appealerStakeReturned: false,
        resolvedAt: "2026-02-26T12:00:00Z",
      },
    };

    render(
      <AppealReviewPanel appeal={resolvedAppeal} wallet="0xofficer3" expertId="officer-3" />
    );

    expect(screen.getByText("Panel Votes")).toBeInTheDocument();
    expect(screen.getByText("Officer A")).toBeInTheDocument();
    expect(screen.getByText("Officer B")).toBeInTheDocument();
    expect(screen.getByText("Appeal Rejected — Rejection Upheld")).toBeInTheDocument();
  });

  it("shows panel progress with vote counts", () => {
    render(
      <AppealReviewPanel appeal={basePendingAppeal} wallet="0xofficer1" expertId="officer-1" />
    );

    expect(screen.getByText("Panel Progress")).toBeInTheDocument();
    expect(screen.getByText("0/3 voted")).toBeInTheDocument();
  });
});
