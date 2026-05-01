import { STORY_LAB_QUERY } from "@/components/expert/story-lab/storyLabData";

type ParserInput =
  | URLSearchParams
  | Pick<URLSearchParams, "get">
  | string;

export function parseStoryLabActive(input: ParserInput): boolean {
  const params =
    typeof input === "string"
      ? new URLSearchParams(input.startsWith("?") ? input.slice(1) : input)
      : input;
  const expected = STORY_LAB_QUERY.value;
  return (
    params.get(STORY_LAB_QUERY.mode) === expected ||
    params.get(STORY_LAB_QUERY.completion) === expected
  );
}
