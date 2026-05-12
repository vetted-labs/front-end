import { describe, it, expect } from "vitest";
import { getMonogram } from "@/lib/monogramHelper";

describe("getMonogram", () => {
  it("returns initials for two-part names", () => {
    expect(getMonogram("Sven Daneel")).toBe("SD");
  });
  it("handles three+ part names with first and last", () => {
    expect(getMonogram("Jean Paul Sartre")).toBe("JS");
    expect(getMonogram("Mary Jane Watson")).toBe("MW");
  });
  it("doubles up single-letter or single-word names", () => {
    expect(getMonogram("Cher")).toBe("CH");
    expect(getMonogram("A")).toBe("AA");
  });
  it("falls back to ·· for empty/undefined", () => {
    expect(getMonogram(undefined)).toBe("··");
    expect(getMonogram(null)).toBe("··");
    expect(getMonogram("")).toBe("··");
    expect(getMonogram("   ")).toBe("··");
  });
});
