"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { extractApiError, resumeApi, type ResumeDownloadScope } from "@/lib/api";

interface ProtectedResumeLinkProps {
  resumeUrl?: string | null;
  applicationId?: string;
  scope?: ResumeDownloadScope;
  label?: string;
  className?: string;
  iconClassName?: string;
  compact?: boolean;
}

export function ProtectedResumeLink({
  resumeUrl,
  applicationId,
  scope,
  label = "Resume",
  className = "inline-flex items-center gap-2 text-primary/80 hover:text-primary transition-colors",
  iconClassName = "w-3.5 h-3.5",
  compact,
}: ProtectedResumeLinkProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasProtectedEndpoint = !!scope && (scope === "candidateProfile" || !!applicationId);
  const canOpen = hasProtectedEndpoint && !!resumeUrl;

  const handleOpen = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canOpen || isLoading) return;

    setError(null);
    setIsLoading(true);
    try {
      const downloadUrl = (await resumeApi.getDownloadUrl(scope!, applicationId)).url;
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(extractApiError(err, "Resume is unavailable or access was denied."));
    } finally {
      setIsLoading(false);
    }
  };

  if (!canOpen) return null;

  return (
    <span className="inline-flex flex-col gap-1">
      <button
      type="button"
      onClick={handleOpen}
      disabled={isLoading}
      aria-label={label}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
    >
        {isLoading ? (
          <Loader2 className={`${iconClassName} animate-spin`} />
        ) : (
          <FileText className={iconClassName} />
        )}
        {!compact && label}
        {!compact && <ExternalLink className="w-3 h-3 opacity-60" />}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}

export type { ResumeDownloadScope };
