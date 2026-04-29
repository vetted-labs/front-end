import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStoryLabContext } from "@/lib/hooks/useStoryLabContext";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("storyLab=expert&storyStep=overview&storySub=focus"),
  usePathname: () => "/expert/dashboard",
}));

describe("useStoryLabContext", () => {
  it("returns isActive=true when storyLab=expert is in the URL", () => {
    const { result } = renderHook(() => useStoryLabContext());
    expect(result.current.isActive).toBe(true);
    expect(result.current.activeStepId).toBe("overview");
    expect(result.current.activeSubStopId).toBe("focus");
  });
});
