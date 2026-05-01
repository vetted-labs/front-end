import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";

let currentSearch = "";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(currentSearch),
  usePathname: () => "/expert/dashboard",
}));

describe("useStoryLabContext", () => {
  beforeEach(() => {
    currentSearch = "";
  });

  it("returns isActive=true with all step ids when storyLab params are present", () => {
    currentSearch = "storyLab=expert&storyStep=overview&storySub=focus";
    const { result } = renderHook(() => useStoryLabContext());
    expect(result.current.isActive).toBe(true);
    expect(result.current.isCompletionReturn).toBe(false);
    expect(result.current.activeStepId).toBe("overview");
    expect(result.current.activeSubStopId).toBe("focus");
  });

  it("returns isCompletionReturn=true and isActive=true when storyLabComplete=expert is set", () => {
    currentSearch = "storyLabComplete=expert";
    const { result } = renderHook(() => useStoryLabContext());
    expect(result.current.isActive).toBe(true);
    expect(result.current.isCompletionReturn).toBe(true);
    expect(result.current.activeStepId).toBeNull();
    expect(result.current.activeSubStopId).toBeNull();
  });

  it("returns all-null and inactive when no story params are present", () => {
    currentSearch = "";
    const { result } = renderHook(() => useStoryLabContext());
    expect(result.current.isActive).toBe(false);
    expect(result.current.isCompletionReturn).toBe(false);
    expect(result.current.activeStepId).toBeNull();
    expect(result.current.activeSubStopId).toBeNull();
  });
});
