import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  EXPERT_STORY_COMPLETION_EVENTS,
  ExpertStoryMode,
} from "@/components/expert/onboarding/ExpertStoryMode";
import { EXPERT_ONBOARDING_SETUP_REQUIRED_EVENTS } from "@/lib/expert-onboarding-tour";

function renderStoryMode({
  practiceCompleted = false,
  suspended = false,
  onOpenPracticeReview = vi.fn<() => void>(),
  onComplete = vi.fn<() => void>(),
}: {
  practiceCompleted?: boolean;
  suspended?: boolean;
  onOpenPracticeReview?: () => void;
  onComplete?: () => void;
} = {}) {
  const view = render(
    <ExpertStoryMode
      open
      suspended={suspended}
      practiceCompleted={practiceCompleted}
      onOpenPracticeReview={onOpenPracticeReview}
      onComplete={onComplete}
    />
  );

  return {
    ...view,
    onOpenPracticeReview,
    onComplete,
    rerenderStoryMode({
      nextPracticeCompleted = practiceCompleted,
      nextSuspended = suspended,
    }: {
      nextPracticeCompleted?: boolean;
      nextSuspended?: boolean;
    }) {
      view.rerender(
        <ExpertStoryMode
          open
          suspended={nextSuspended}
          practiceCompleted={nextPracticeCompleted}
          onOpenPracticeReview={onOpenPracticeReview}
          onComplete={onComplete}
        />
      );
    },
  };
}

describe("ExpertStoryMode", () => {
  it("does not render when closed", () => {
    render(
      <ExpertStoryMode
        open={false}
        practiceCompleted={false}
        onOpenPracticeReview={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("marks every setup-required event when the story completes", () => {
    expect(EXPERT_ONBOARDING_SETUP_REQUIRED_EVENTS.every((event) =>
      EXPERT_STORY_COMPLETION_EVENTS.includes(event)
    )).toBe(true);
  });

  it("runs one forced fake story arc and opens the practice review automatically", async () => {
    const { onOpenPracticeReview, onComplete, rerenderStoryMode } =
      renderStoryMode();

    expect(
      screen.getByRole("dialog", { name: /expert story mode/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/demo only/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /skip/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: /meet your guild/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(
      screen.getByRole("heading", { name: /maya chen applies to engineering/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => expect(onOpenPracticeReview).toHaveBeenCalledTimes(1));
    expect(
      screen.getByText(/complete the demo review to continue/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /waiting for review/i })).toBeDisabled();

    rerenderStoryMode({ nextPracticeCompleted: true });
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /consensus result/i })
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(
      screen.getByRole("heading", { name: /reward posted/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(
      screen.getByRole("heading", { name: /reputation increased/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(
      screen.getByRole("heading", { name: /endorse a job candidate/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(
      screen.getByRole("heading", { name: /vote on guild decisions/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(
      screen.getByRole("heading", { name: /story complete/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /finish story mode/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("keeps the current story beat while suspended for the practice modal", async () => {
    const { onOpenPracticeReview, rerenderStoryMode } = renderStoryMode();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => expect(onOpenPracticeReview).toHaveBeenCalledTimes(1));
    expect(
      screen.getByText(/complete the demo review to continue/i)
    ).toBeInTheDocument();

    rerenderStoryMode({ nextSuspended: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerenderStoryMode({
      nextPracticeCompleted: true,
      nextSuspended: false,
    });
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /consensus result/i })
      ).toBeInTheDocument()
    );
  });
});
