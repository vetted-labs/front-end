type ApplicationGuild = {
  id: string;
  name: string;
};

const ALL_GUILDS_ID = "all";

export function resolveApplicationTargetGuilds({
  guildRecords,
  selectedGuild,
  deepLinkGuildId,
}: {
  guildRecords: ApplicationGuild[];
  selectedGuild: ApplicationGuild;
  deepLinkGuildId?: string | null;
}): ApplicationGuild[] {
  if (selectedGuild.id !== ALL_GUILDS_ID) return [selectedGuild];
  if (deepLinkGuildId) {
    const linkedGuild = guildRecords.find((guild) => guild.id === deepLinkGuildId);
    if (linkedGuild) return [linkedGuild];
    return [{ id: deepLinkGuildId, name: "Linked Guild" }];
  }
  if (guildRecords.length > 0) return guildRecords;
  return [];
}
