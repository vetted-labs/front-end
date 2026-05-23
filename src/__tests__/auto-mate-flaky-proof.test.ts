import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const markerPath = path.join(os.tmpdir(), "auto-mate-flaky-proof-counter.txt");

function nextAttemptNumber(): number {
  const previous = fs.existsSync(markerPath)
    ? Number(fs.readFileSync(markerPath, "utf8"))
    : 0;
  const next = Number.isFinite(previous) ? previous + 1 : 1;
  fs.writeFileSync(markerPath, String(next));
  return next;
}

describe("Auto Mate flaky proof", () => {
  it("shows mixed pass/fail behavior across focused reruns", () => {
    const attempt = nextAttemptNumber();
    expect(attempt % 2).toBe(0);
  });
});
