"use client";

import { Briefcase, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuildJobApplication } from "@/types";

interface GuildJobApplicationsTabProps {
  applications: GuildJobApplication[];
  onEndorseCandidate: (applicationId: string, endorse: boolean) => void;
}

export function GuildJobApplicationsTab({
  applications,
  onEndorseCandidate,
}: GuildJobApplicationsTabProps) {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Active Job Applications
        </h3>
        <p className="text-sm text-muted-foreground">
          Review candidates and endorse those you believe are a good fit
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Applications Yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            There are no job applications to review at the moment. Check back
            later when candidates apply for positions in your guild.
          </p>
        </div>
      ) : (
        applications.map((application) => (
          <div
            key={application.id}
            className="border border-border rounded-lg p-6 hover:border-primary/50 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-foreground mb-1">
                  {application.jobTitle}
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {application.candidateName} • {application.candidateEmail}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span>
                    Applied: {new Date(application.appliedAt).toLocaleDateString()}
                  </span>
                  {!application.reviewedByRecruiter && (
                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 rounded-md border border-yellow-500/20">
                      Awaiting Recruiter Review
                    </span>
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {application.matchScore}%
                </div>
                <p className="text-xs text-muted-foreground">Match Score</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4 pb-4 border-b border-border">
              {application.applicationSummary}
            </p>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {application.endorsementCount} endorsement(s)
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => onEndorseCandidate(application.id, false)}
                  variant="secondary"
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Pass
                </Button>
                <Button onClick={() => onEndorseCandidate(application.id, true)}>
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Endorse
                </Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
