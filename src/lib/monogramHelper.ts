/**
 * Derive a 2-character monogram from a full name. Used by the guild
 * card's member avatar stack.
 *
 * - "Sven Daneel" → "SD"
 * - "Cher" → "CH"
 * - "Jean-Paul Sartre" → "JS"
 * - "" / undefined → "··"
 */
export function getMonogram(fullName: string | undefined | null): string {
  if (!fullName) return "··";
  const cleaned = fullName.trim();
  if (!cleaned) return "··";

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  const single = parts[0];
  return (single[0] + (single[1] ?? single[0])).toUpperCase();
}
