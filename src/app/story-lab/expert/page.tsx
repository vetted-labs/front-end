import { redirect } from "next/navigation";
import { getStoryLabLaunchRoute } from "@/components/expert/story-lab/storyLabData";

export default function ExpertStoryLabPage() {
  redirect(getStoryLabLaunchRoute());
}
