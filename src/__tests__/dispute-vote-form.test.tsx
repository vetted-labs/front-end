import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DisputeVoteForm } from "@/components/endorsements/DisputeVoteForm";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/hooks/useFetch", () => ({
  useApi: () => ({
    execute: vi.fn((fn: () => Promise<void>) => fn()),
    isLoading: false,
    error: null,
  }),
  useFetch: () => ({ data: null, isLoading: false, error: null }),
}));

describe("DisputeVoteForm", () => {
  it("renders form title 'Arbitration Vote' and description", () => {
    render(<DisputeVoteForm onSubmit={vi.fn()} />);

    expect(screen.getByText("Arbitration Vote")).toBeInTheDocument();
    expect(
      screen.getByText("Review the evidence and cast your vote on this dispute.")
    ).toBeInTheDocument();
  });

  it("renders 'Uphold Dispute' and 'Dismiss Dispute' buttons", () => {
    render(<DisputeVoteForm onSubmit={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Uphold Dispute" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss Dispute" })).toBeInTheDocument();
  });

  it("renders reasoning textarea with placeholder", () => {
    render(<DisputeVoteForm onSubmit={vi.fn()} />);

    expect(
      screen.getByPlaceholderText("Explain your reasoning for this decision...")
    ).toBeInTheDocument();
  });

  it("submit button disabled when no decision and no reasoning", () => {
    render(<DisputeVoteForm onSubmit={vi.fn()} />);

    const submitBtn = screen.getByRole("button", { name: "Submit Arbitration Vote" });
    expect(submitBtn).toBeDisabled();
  });

  it("submit button disabled when decision selected but no reasoning", () => {
    render(<DisputeVoteForm onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Uphold Dispute" }));

    const submitBtn = screen.getByRole("button", { name: "Submit Arbitration Vote" });
    expect(submitBtn).toBeDisabled();
  });

  it("submit button disabled when reasoning provided but no decision", () => {
    render(<DisputeVoteForm onSubmit={vi.fn()} />);

    fireEvent.change(
      screen.getByPlaceholderText("Explain your reasoning for this decision..."),
      { target: { value: "Some reasoning" } }
    );

    const submitBtn = screen.getByRole("button", { name: "Submit Arbitration Vote" });
    expect(submitBtn).toBeDisabled();
  });

  it("submit button enabled when decision and reasoning are provided", () => {
    render(<DisputeVoteForm onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Uphold Dispute" }));
    fireEvent.change(
      screen.getByPlaceholderText("Explain your reasoning for this decision..."),
      { target: { value: "Valid reasoning" } }
    );

    const submitBtn = screen.getByRole("button", { name: "Submit Arbitration Vote" });
    expect(submitBtn).not.toBeDisabled();
  });

  it("submit button disabled when reasoning is whitespace-only", () => {
    render(<DisputeVoteForm onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss Dispute" }));
    fireEvent.change(
      screen.getByPlaceholderText("Explain your reasoning for this decision..."),
      { target: { value: "   " } }
    );

    const submitBtn = screen.getByRole("button", { name: "Submit Arbitration Vote" });
    expect(submitBtn).toBeDisabled();
  });

  it("all controls disabled when disabled prop is true", () => {
    render(<DisputeVoteForm onSubmit={vi.fn()} disabled />);

    expect(screen.getByRole("button", { name: "Uphold Dispute" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Dismiss Dispute" })).toBeDisabled();
    expect(
      screen.getByPlaceholderText("Explain your reasoning for this decision...")
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Submit Arbitration Vote" })).toBeDisabled();
  });

  it("calls onSubmit with 'uphold' decision and reasoning", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<DisputeVoteForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Uphold Dispute" }));
    fireEvent.change(
      screen.getByPlaceholderText("Explain your reasoning for this decision..."),
      { target: { value: "The dispute should be upheld." } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit Arbitration Vote" }));

    expect(onSubmit).toHaveBeenCalledWith("uphold", "The dispute should be upheld.");
  });

  it("calls onSubmit with 'dismiss' decision and reasoning", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<DisputeVoteForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss Dispute" }));
    fireEvent.change(
      screen.getByPlaceholderText("Explain your reasoning for this decision..."),
      { target: { value: "The dispute should be dismissed." } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Submit Arbitration Vote" }));

    expect(onSubmit).toHaveBeenCalledWith("dismiss", "The dispute should be dismissed.");
  });
});
