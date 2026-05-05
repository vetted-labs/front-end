"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { parseStoryLabActive } from "@/lib/story-lab/parseStoryLabActive";
import { STORY_LAB_QUERY } from "@/components/expert/story-lab/storyLabData";

export interface StoryLabContextValue {
  isActive: boolean;
  isCompletionReturn: boolean;
  activeStepId: string | null;
  activeSubStopId: string | null;
}

export function useStoryLabContext(): StoryLabContextValue {
  const searchParams = useSearchParams();

  return useMemo(() => {
    return {
      isActive: parseStoryLabActive(searchParams),
      isCompletionReturn:
        searchParams?.get(STORY_LAB_QUERY.completion) === STORY_LAB_QUERY.value,
      activeStepId: searchParams?.get(STORY_LAB_QUERY.step) ?? null,
      activeSubStopId: searchParams?.get("storySub") ?? null,
    };
  }, [searchParams]);
}
