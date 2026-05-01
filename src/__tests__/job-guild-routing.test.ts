import { describe, expect, it } from "vitest";
import {
  getCanonicalJobGuildId,
  getGuildApplicationJobRedirect,
  getJobGuildApplyBlocker,
} from "@/lib/job-guild-routing";
import type { Job } from "@/types";

describe("job guild routing helpers", () => {
  it("prefers the backend canonical guild id over the display name", () => {
    const job = {
      id: "job-1",
      guild: "Engineering Guild",
      guildId: "canonical-guild-1",
    } as Job;

    const resolved = getCanonicalJobGuildId(job, () => "resolved-from-name");

    expect(resolved).toBe("canonical-guild-1");
  });

  it("falls back to resolving the guild display name", () => {
    const job = {
      id: "job-1",
      guild: "Engineering Guild",
    } as Job;

    const resolved = getCanonicalJobGuildId(job, (guildName) =>
      guildName === "Engineering Guild" ? "resolved-guild-1" : undefined
    );

    expect(resolved).toBe("resolved-guild-1");
  });

  it("returns a visible blocker when the guild cannot be resolved", () => {
    const blocker = getJobGuildApplyBlocker({
      job: { id: "job-1", guild: "Unknown Guild" } as Job,
      canonicalGuildId: undefined,
      isResolvingGuild: false,
      guildResolutionError: null,
    });

    expect(blocker).toContain("Unknown Guild");
  });

  it("redirects direct apply URLs when the job belongs to another guild", () => {
    expect(getGuildApplicationJobRedirect("route-guild", "job-1", "job-guild")).toBe(
      "/guilds/job-guild/apply?jobId=job-1"
    );
  });

  it("does not redirect when the job belongs to the route guild", () => {
    expect(getGuildApplicationJobRedirect("route-guild", "job-1", "route-guild")).toBeNull();
  });
});
