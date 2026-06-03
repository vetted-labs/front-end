import { redirect } from "next/navigation";

/**
 * VET-115: onboarding is non-blocking. The pending gate is retired — an expert
 * can do quests immediately without finishing the application. Any links or
 * bookmarks to the old status page now land on Quests.
 */
export default function Page() {
  redirect("/expert/quests");
}
