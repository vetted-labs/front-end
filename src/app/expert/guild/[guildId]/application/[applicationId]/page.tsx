"use client";

import { useState, useEffect } from "react";
import ApplicationDetailPage from "@/components/expert/ApplicationDetailPage";

interface PageProps {
  params: Promise<{
    guildId: string;
    applicationId: string;
  }>;
}

export default function Page({ params }: PageProps) {
  const [resolvedParams, setResolvedParams] = useState<{
    guildId: string;
    applicationId: string;
  } | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  if (!resolvedParams) return null;

  return (
    <ApplicationDetailPage
      guildId={resolvedParams.guildId}
      applicationId={resolvedParams.applicationId}
    />
  );
}
