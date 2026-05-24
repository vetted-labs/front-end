import { describe, expect, it } from "vitest";
import { resolveApplicationTargetGuilds } from "@/lib/application-target-guilds";

describe("resolveApplicationTargetGuilds", () => {
  it("uses the deep-linked guild when the expert guild list has not hydrated", () => {
    expect(
      resolveApplicationTargetGuilds({
        guildRecords: [],
        selectedGuild: { id: "all", name: "All Guilds" },
        deepLinkGuildId: "guild-from-url",
      }),
    ).toEqual([{ id: "guild-from-url", name: "Linked Guild" }]);
  });

  it("uses the deep-linked guild when it is not present in the expert guild list", () => {
    expect(
      resolveApplicationTargetGuilds({
        guildRecords: [{ id: "guild-1", name: "Engineering" }],
        selectedGuild: { id: "all", name: "All Guilds" },
        deepLinkGuildId: "guild-from-url",
      }),
    ).toEqual([{ id: "guild-from-url", name: "Linked Guild" }]);
  });

  it("preserves all-guild browsing when the deep-linked guild is already in the list", () => {
    expect(
      resolveApplicationTargetGuilds({
        guildRecords: [{ id: "guild-from-url", name: "Engineering" }],
        selectedGuild: { id: "all", name: "All Guilds" },
        deepLinkGuildId: "guild-from-url",
      }),
    ).toEqual([{ id: "guild-from-url", name: "Engineering" }]);
  });

  it("preserves an explicitly selected guild", () => {
    expect(
      resolveApplicationTargetGuilds({
        guildRecords: [{ id: "guild-1", name: "Engineering" }],
        selectedGuild: { id: "guild-2", name: "Design" },
        deepLinkGuildId: "guild-from-url",
      }),
    ).toEqual([{ id: "guild-2", name: "Design" }]);
  });
});
