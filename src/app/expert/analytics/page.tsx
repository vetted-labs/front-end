import { redirect } from "next/navigation";
import { ExpertAnalytics } from "@/components/expert/analytics/ExpertAnalytics";
import { ANALYTICS_ENABLED } from "@/config/constants";

export default function Page() {
  // Analytics removed pending rework (VET-104) — re-enable via ANALYTICS_ENABLED.
  if (!ANALYTICS_ENABLED) redirect("/expert/dashboard");
  return <ExpertAnalytics />;
}
