"use client";

import { useParams } from "next/navigation";
import VotingApplicationPage from "@/components/expert/VotingApplicationPage";

export default function Page() {
  const params = useParams();
  const applicationId = params.applicationId as string;

  return <VotingApplicationPage applicationId={applicationId} />;
}
