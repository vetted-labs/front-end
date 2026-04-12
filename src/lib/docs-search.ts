import Fuse, { type FuseResult } from "fuse.js";
import { searchIndex, type SearchIndexEntry } from "./docs-search-index";

const fuse = new Fuse(searchIndex, {
  keys: [
    { name: "title", weight: 3 },
    { name: "headings", weight: 2 },
    { name: "description", weight: 2 },
    { name: "keywords", weight: 2 },
  ],
  threshold: 0.4,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
});

export type SearchResult = FuseResult<SearchIndexEntry>;

export function searchDocs(query: string): SearchResult[] {
  if (!query || query.length < 2) return [];
  return fuse.search(query, { limit: 30 });
}

/** Return all entries (for empty-query default list), grouped by persona. */
export function getAllEntries(): SearchIndexEntry[] {
  return searchIndex;
}
