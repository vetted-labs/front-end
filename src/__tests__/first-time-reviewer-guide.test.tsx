import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FirstTimeReviewerGuide } from "@/components/expert/FirstTimeReviewerGuide";

const originalLocalStorage = window.localStorage;

describe("FirstTimeReviewerGuide", () => {
  afterEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("does not crash when browser storage is restricted", () => {
    const blockedStorage: Storage = {
      length: 0,
      clear: vi.fn(),
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      key: vi.fn(() => null),
      removeItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error("blocked");
      }),
    };

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: blockedStorage,
    });

    render(<FirstTimeReviewerGuide />);

    expect(screen.getByText("Welcome to your first review!")).toBeInTheDocument();
    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: /got it/i }));
    }).not.toThrow();
    expect(screen.queryByText("Welcome to your first review!")).not.toBeInTheDocument();
  });
});
