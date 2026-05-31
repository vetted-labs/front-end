import { redirect } from "next/navigation";
import GovernancePage from "@/components/governance/GovernancePage";
import { GOVERNANCE_ENABLED } from "@/config/constants";

export default function Page() {
  // Governance hidden pending rework (VET-103) — re-enable via GOVERNANCE_ENABLED.
  if (!GOVERNANCE_ENABLED) redirect("/expert/dashboard");
  return <GovernancePage />;
}
