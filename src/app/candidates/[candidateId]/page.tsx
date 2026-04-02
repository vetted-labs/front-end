"use client";

import { use } from "react";
import { CandidateProfileView } from "@/components/CandidateProfileView";

export default function CandidateProfilePage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = use(params);
  return <CandidateProfileView candidateId={candidateId} />;
}
