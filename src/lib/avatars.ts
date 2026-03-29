/**
 * Placeholder avatar URLs for visual prototyping.
 *
 * Uses DiceBear API to generate deterministic avatars from names/seeds.
 * Companies fall back to the Vetted logo since most jobs are from Vetted.
 */

const DICEBEAR_BASE = "https://api.dicebear.com/9.x";

/** Deterministic illustrated face for candidates/experts */
export function getPersonAvatar(name: string): string {
  const seed = encodeURIComponent(name.trim().toLowerCase());
  return `${DICEBEAR_BASE}/notionists/svg?seed=${seed}&backgroundColor=f5f5f5`;
}

/** Company logo placeholder — Vetted logo for now */
export function getCompanyAvatar(_companyName?: string): string {
  return "/vetted-logo.svg";
}
