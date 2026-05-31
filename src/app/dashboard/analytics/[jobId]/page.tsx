import { redirect } from "next/navigation";
import JobAnalyticsPage from "@/components/dashboard/JobAnalyticsPage";
import { ANALYTICS_ENABLED } from "@/config/constants";

export default function Page() {
  // Analytics removed pending rework (VET-104) — re-enable via ANALYTICS_ENABLED.
  if (!ANALYTICS_ENABLED) redirect("/dashboard");
  return <JobAnalyticsPage />;
}
