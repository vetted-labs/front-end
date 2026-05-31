import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewGuildApplicationModal } from "@/components/guild/ReviewGuildApplicationModal";
import type {
  GeneralReviewTemplate,
  LevelReviewTemplate,
  ReviewModalApplication,
} from "@/types";

const mocks = vi.hoisted(() => ({
  getGuildApplicationTemplate: vi.fn(),
  generateHash: vi.fn(),
  submitCommitment: vi.fn(),
  getDownloadUrl: vi.fn(),
  commitVote: vi.fn(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({
    address: "0x1234567890abcdef1234567890abcdef12345678",
  }),
  useChainId: () => 11155111,
  usePublicClient: () => undefined,
}));

vi.mock("@/lib/hooks/useVettedContracts", () => ({
  useVettingManager: () => ({
    commitVote: mocks.commitVote,
  }),
}));

vi.mock("@/lib/blockchain", () => ({
  computeOnChainCommitHash: vi.fn(() => "0xcommitment"),
  generateBytes32Salt: vi.fn(() => "0xsalt"),
  getTransactionErrorMessage: vi.fn(() => "Transaction failed"),
  isUserRejection: vi.fn(() => false),
  mapScoreToChain: vi.fn((score: number) => score),
}));

vi.mock("@/lib/api", () => ({
  expertApi: {
    getGuildApplicationTemplate: mocks.getGuildApplicationTemplate,
    expertCommitReveal: {
      generateHash: mocks.generateHash,
      submitCommitment: mocks.submitCommitment,
    },
  },
  reviewsApi: {
    guildApplication: {
      getState: vi.fn().mockResolvedValue(null),
    },
    proposal: {
      getState: vi.fn().mockResolvedValue(null),
    },
  },
  resumeApi: {
    getDownloadUrl: mocks.getDownloadUrl,
  },
  extractApiError: (_err: unknown, fallback: string) => fallback,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const practiceApplication: ReviewModalApplication = {
  id: "practice-review-maya-chen",
  fullName: "Maya Chen",
  email: "maya.chen@example.test",
  expertiseLevel: "senior",
  yearsOfExperience: 7,
  currentTitle: "Senior Full-Stack Engineer",
  currentCompany: "Northstar Labs",
  bio: "Leads TypeScript and Node.js delivery for data-heavy products.",
  motivation:
    "I want to join the Engineering guild to review production software evidence and mentor strong candidates.",
  expertiseAreas: ["TypeScript", "React", "Node.js", "System Design"],
  resumeUrl: "demo://maya-chen-resume",
  linkedinUrl: "https://example.test/maya",
  portfolioUrl: "https://example.test/maya-portfolio",
  applicationResponses: {
    level: "senior",
    general: {
      evidence_quality:
        "I shipped an analytics dashboard used by 40 enterprise teams, led a React migration, and mentored engineers.",
    },
    domain: {
      topics: {
        system_design:
          "Designed event ingestion with retries, queue backpressure, and warehouse reconciliation.",
      },
    },
  },
};

const generalTemplate: GeneralReviewTemplate = {
  generalQuestions: [
    {
      id: "evidence_quality",
      prompt: "Is the application backed by concrete evidence?",
    },
  ],
  rubric: {
    totalPoints: 5,
    questions: {
      evidence_quality: {
        maxPoints: 5,
        criteria: [
          {
            id: "specificity",
            label: "Specificity of evidence",
            maxPoints: 5,
          },
        ],
      },
    },
    redFlags: [
      {
        id: "unsupported_claims",
        label: "Unsupported claims",
        points: -2,
      },
    ],
    interpretationGuide: [
      {
        range: "4-5",
        label: "Strong",
        notes: ["Names specific shipped work."],
      },
    ],
  },
};

const levelTemplate: LevelReviewTemplate = {
  totalPoints: 5,
  topics: [
    {
      id: "system_design",
      title: "System Design",
      prompt: "Evaluate the candidate's production architecture evidence.",
      whatToLookFor: ["Clear ownership", "Tradeoff discussion"],
      scoring: {
        five: "Specific production design with clear tradeoffs.",
        threeToFour: "Good design evidence with some gaps.",
        oneToTwo: "Mostly claims without implementation detail.",
        zero: "No evidence.",
      },
    },
  ],
};

function renderPracticeModal(
  props: Partial<Parameters<typeof ReviewGuildApplicationModal>[0]> = {},
) {
  const onSubmitReview = vi.fn().mockResolvedValue({ message: "Real submit" });
  const onPracticeComplete = vi.fn();
  const onClose = vi.fn();

  render(
    <ReviewGuildApplicationModal
      isOpen
      onClose={onClose}
      application={practiceApplication}
      guildId="engineering"
      onSubmitReview={onSubmitReview}
      isReviewing={false}
      commitRevealPhase="commit"
      blockchainSessionId="0xsession"
      blockchainSessionCreated
      mode="practice"
      templateOverrides={{ generalTemplate, levelTemplate }}
      onPracticeComplete={onPracticeComplete}
      practiceActions={
        <>
          <a href="/expert/voting">Go to Applications</a>
          <a href="/expert/dashboard?openStaking=withdraw">Check staking</a>
        </>
      }
      {...props}
    />,
  );

  return { onClose, onSubmitReview, onPracticeComplete };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function completePracticeReview() {
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));

  expect(await screen.findByText("General Review")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "4" }));
  fireEvent.change(screen.getByPlaceholderText(/cite specific evidence/i), {
    target: {
      value:
        "Specific shipped work is named, but blockchain production evidence is light.",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));

  expect(await screen.findByText("Domain Review")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "3" }));
  fireEvent.change(screen.getByPlaceholderText(/tie the score/i), {
    target: {
      value:
        "System design evidence is credible, but ownership boundaries need more detail.",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));

  expect(
    await screen.findByRole("button", { name: /complete practice review/i }),
  ).toBeInTheDocument();
  const submit =
    screen.queryByRole("button", { name: /complete practice review/i }) ??
    screen.getByRole("button", { name: /submit commitment|submit review/i });
  fireEvent.click(submit);
}

describe("expert practice review flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGuildApplicationTemplate.mockImplementation(
      (_guildId: string, templateType: "general" | "level") =>
        Promise.resolve(
          templateType === "general" ? generalTemplate : levelTemplate,
        ),
    );
    mocks.generateHash.mockResolvedValue({ hash: "0xhidden-score-hash" });
    mocks.submitCommitment.mockResolvedValue({});
    mocks.commitVote.mockResolvedValue("0xcommit-tx");
    mocks.getDownloadUrl.mockResolvedValue({
      url: "https://example.test/private-resume",
      expiresAt: "2026-04-28T12:00:00.000Z",
    });
    vi.stubGlobal("open", vi.fn());
  });

  it("opens practice mode from static templates without fetching live review templates", async () => {
    renderPracticeModal();

    await flushEffects();

    expect(screen.getAllByText(/practice review/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/sandbox/i)).toBeInTheDocument();
    expect(mocks.getGuildApplicationTemplate).not.toHaveBeenCalled();
  });

  it("shows a non-clickable demo resume marker that never calls the protected resume API", async () => {
    renderPracticeModal();

    await flushEffects();

    expect(
      screen.getByLabelText(/demo resume sample only/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /demo resume/i }),
    ).not.toBeInTheDocument();
    expect(mocks.getDownloadUrl).not.toHaveBeenCalled();
    expect(window.open).not.toHaveBeenCalled();
  });

  it("completes the practice review without real submit, wallet, or commit-reveal calls", async () => {
    const { onSubmitReview, onPracticeComplete } = renderPracticeModal();

    await completePracticeReview();

    await waitFor(() => {
      expect(screen.getByText(/practice complete/i)).toBeInTheDocument();
    });
    expect(
      screen.getByText(/no real review was submitted/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/practice calibration/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /go to applications/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /check staking/i }),
    ).toBeInTheDocument();
    expect(onPracticeComplete).toHaveBeenCalledTimes(1);
    expect(onSubmitReview).not.toHaveBeenCalled();
    expect(mocks.getGuildApplicationTemplate).not.toHaveBeenCalled();
    expect(mocks.generateHash).not.toHaveBeenCalled();
    expect(mocks.submitCommitment).not.toHaveBeenCalled();
    expect(mocks.commitVote).not.toHaveBeenCalled();
  });

  it("can force practice review completion before showing close controls", async () => {
    const { onClose } = renderPracticeModal({
      forceCompletion: true,
    } as Partial<Parameters<typeof ReviewGuildApplicationModal>[0]>);

    await flushEffects();

    expect(
      screen.queryByRole("button", { name: /close review modal/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^cancel$/i }),
    ).not.toBeInTheDocument();

    await completePracticeReview();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^done$/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^done$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
