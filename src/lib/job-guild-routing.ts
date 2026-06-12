import type { Job } from "@/types";

interface JobGuildApplyBlockerInput {
  job: Pick<Job, "guild" | "guildId"> | null | undefined;
  canonicalGuildId: string | undefined;
  isResolvingGuild: boolean;
  guildResolutionError: string | null;
}

export function getCanonicalJobGuildId(
  job: Pick<Job, "guild" | "guildId"> | null | undefined,
  resolveGuildId: (guildName: string) => string | undefined,
): string | undefined {
  const directGuildId = job?.guildId?.trim();
  if (directGuildId) return directGuildId;

  const guildName = job?.guild?.trim();
  if (!guildName) return undefined;

  return resolveGuildId(guildName);
}

export function getJobGuildApplyBlocker({
  job,
  canonicalGuildId,
  isResolvingGuild,
  guildResolutionError,
}: JobGuildApplyBlockerInput): string | null {
  if (canonicalGuildId || isResolvingGuild) return null;

  const guildName = job?.guild?.trim();
  if (guildResolutionError) {
    return `Could not load guild data to verify this job. ${guildResolutionError}`;
  }
  if (guildName) {
    return `Could not resolve ${guildName} to a joinable guild. Please contact the employer.`;
  }
  return "This job is missing guild information. Please contact the employer.";
}

export function getGuildApplicationJobRedirect(
  routeGuildId: string,
  jobId: string,
  jobGuildId?: string,
): string | null {
  const normalizedRouteGuildId = routeGuildId.trim();
  const normalizedJobGuildId = jobGuildId?.trim();
  if (!normalizedJobGuildId || normalizedJobGuildId === normalizedRouteGuildId) return null;
  return `/guilds/${encodeURIComponent(normalizedJobGuildId)}/apply?jobId=${encodeURIComponent(jobId)}`;
}
