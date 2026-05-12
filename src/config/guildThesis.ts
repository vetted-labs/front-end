/**
 * Guild thesis lines — short, opinionated taglines shown on the new
 * Catalogue-style guild card.
 *
 * Keys are exact guild names as stored in the database. Names with
 * commas/special chars must match exactly. Falls back to the guild's
 * own `description` (or empty string) if no entry is found.
 */
export const GUILD_THESIS: Record<string, string> = {
  "Design":
    "Taste defended in public, with reputation at stake.",
  "Engineering":
    "Software written by people who would stake their reputation on it shipping.",
  "Finance, Legal & Compliance":
    "Numbers, contracts, and consequences — held to peer standard.",
  "Marketing & Growth":
    "Stories that move markets, vetted by people who built them.",
  "Operations & Strategy":
    "The work behind the work — judged by operators.",
  "People, HR & Recruitment":
    "Who you hire becomes who you are — vetted accordingly.",
  "Product":
    "Decisions that ship, defended by people who have shipped.",
  "Sales & Success":
    "Revenue closed by people who can tell the difference.",
};

/**
 * Resolve a thesis line for a guild. Returns the curated line if one
 * exists, otherwise falls back to the guild's stored description, then
 * to an empty string.
 */
export function getGuildThesis(name: string, fallbackDescription?: string): string {
  return GUILD_THESIS[name] ?? fallbackDescription ?? "";
}
