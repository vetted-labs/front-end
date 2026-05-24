export function canLoadGuildWorkspaceData({
  address,
  isStoryLabSyntheticGuild,
}: {
  address?: string | null;
  isStoryLabSyntheticGuild: boolean;
}): boolean {
  return isStoryLabSyntheticGuild || Boolean(address);
}
