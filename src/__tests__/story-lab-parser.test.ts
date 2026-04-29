import { describe, expect, it } from "vitest";
import { parseStoryLabActive } from "@/lib/story-lab/parseStoryLabActive";

describe("parseStoryLabActive", () => {
  it("returns true for storyLab=expert in URLSearchParams", () => {
    expect(parseStoryLabActive(new URLSearchParams("storyLab=expert"))).toBe(true);
  });

  it("returns true for storyLabComplete=expert in URLSearchParams", () => {
    expect(parseStoryLabActive(new URLSearchParams("storyLabComplete=expert"))).toBe(true);
  });

  it("returns true for storyLab=expert in raw query string", () => {
    expect(parseStoryLabActive("?storyLab=expert&other=1")).toBe(true);
  });

  it("returns false for unrelated params", () => {
    expect(parseStoryLabActive(new URLSearchParams("storyLab=other"))).toBe(false);
    expect(parseStoryLabActive("")).toBe(false);
    expect(parseStoryLabActive("?foo=bar")).toBe(false);
  });
});
