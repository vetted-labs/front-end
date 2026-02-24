"use client";

import { useState } from "react";
import { UserPlus, CheckCircle, XCircle, Users, FileText, ExternalLink, Clock, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GuildApplication {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  linkedinUrl: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  expertiseLevel: string;
  yearsOfExperience: number;
  currentTitle: string;
  currentCompany: string;
  bio: string;
  motivation: string;
  expertiseAreas: string[];
  appliedAt: string;
  reviewCount: number;
  approvalCount: number;
  rejectionCount: number;
}

interface CandidateApplication {
  id: string;
  candidateName: string;
  candidateEmail: string;
  status: string;
  expertiseLevel: string;
  applicationResponses: any;
  resumeUrl?: string | null;
  submittedAt: string;
  reviewCount: number;
  approvalCount: number;
  rejectionCount: number;
  jobTitle: string | null;
  jobId: string | null;
  expertHasReviewed: boolean;
}

interface GuildMembershipApplicationsTabProps {
  guildName: string;
  guildApplications: GuildApplication[];
  candidateApplications: CandidateApplication[];
  onReviewApplication: (application: GuildApplication) => void;
  onReviewCandidateApplication: (application: CandidateApplication) => void;
}

export function GuildMembershipApplicationsTab({
  guildName,
  guildApplications,
  candidateApplications,
  onReviewApplication,
  onReviewCandidateApplication,
}: GuildMembershipApplicationsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"expert" | "candidate">("expert");

  const expertCount = guildApplications?.length || 0;
  const candidateCount = candidateApplications?.length || 0;

  return (
    <div className="space-y-4">
      {/* Sub-tab toggle */}
      <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-xl border border-border w-fit">
        <button
          onClick={() => setActiveSubTab("expert")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeSubTab === "expert"
              ? "bg-muted text-primary border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Expert Reviews
          {expertCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/30 text-xs font-semibold rounded-full">
              {expertCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab("candidate")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeSubTab === "candidate"
              ? "bg-muted text-primary border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Candidate Reviews
          {candidateCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/30 text-xs font-semibold rounded-full">
              {candidateCount}
            </span>
          )}
        </button>
      </div>

      {/* Expert Reviews */}
      {activeSubTab === "expert" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Expert Proposals to Join Guild
              </h3>
              <p className="text-sm text-muted-foreground">
                Review proposals from experts wanting to join {guildName}. 1+ approval
                needed for auto-acceptance as &quot;Recruit&quot; member.
              </p>
            </div>
            {expertCount > 0 && (
              <span className="shrink-0 px-3 py-1 bg-primary/10 text-primary border border-primary/30 text-xs font-semibold rounded-full">
                {expertCount} pending
              </span>
            )}
          </div>

          {expertCount === 0 ? (
            <div className="rounded-2xl border border-border bg-muted/50 p-12 text-center">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Pending Expert Applications
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                There are no pending expert membership applications for {guildName}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(guildApplications || []).map((application) => (
                <div
                  key={application.id}
                  className="rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h4 className="font-semibold text-foreground text-base truncate">
                          {application.fullName}
                        </h4>
                        <span className="shrink-0 px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/30 text-xs font-semibold rounded-full">
                          {application.expertiseLevel}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        {application.currentTitle} at {application.currentCompany}
                      </p>

                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs">
                        <span className="text-muted-foreground">
                          {application.yearsOfExperience}y experience
                        </span>
                        <span className="flex items-center text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {new Date(application.appliedAt).toLocaleDateString()}
                        </span>

                        <a
                          href={application.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-primary/80 hover:text-primary transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          LinkedIn
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                        {application.portfolioUrl && (
                          <a
                            href={application.portfolioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-primary/80 hover:text-primary transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Portfolio
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        )}
                        {application.resumeUrl && (
                          <a
                            href={application.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-primary/80 hover:text-primary transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            Resume
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        )}
                      </div>

                      {application.expertiseAreas && application.expertiseAreas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {application.expertiseAreas.slice(0, 4).map((area, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-muted/50 text-foreground text-[11px] rounded-md border border-border"
                            >
                              {area}
                            </span>
                          ))}
                          {application.expertiseAreas.length > 4 && (
                            <span className="px-2 py-0.5 bg-muted/50 text-muted-foreground text-[11px] rounded-md border border-border">
                              +{application.expertiseAreas.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center text-green-400">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          <span className="font-semibold">{application.approvalCount}</span>
                        </div>
                        <div className="flex items-center text-red-400">
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          <span className="font-semibold">{application.rejectionCount}</span>
                        </div>
                        <span className="text-muted-foreground">
                          ({application.reviewCount})
                        </span>
                      </div>

                      <Button
                        onClick={() => onReviewApplication(application)}
                        size="sm"
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-0"
                      >
                        <Users className="w-3.5 h-3.5 mr-1.5" />
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Candidate Reviews */}
      {activeSubTab === "candidate" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Candidate Applications to Join Guild
              </h3>
              <p className="text-sm text-muted-foreground">
                Review applications from candidates wanting to join {guildName}.
              </p>
            </div>
            {candidateCount > 0 && (
              <span className="shrink-0 px-3 py-1 bg-primary/10 text-primary border border-primary/30 text-xs font-semibold rounded-full">
                {candidateCount} pending
              </span>
            )}
          </div>

          {candidateCount === 0 ? (
            <div className="rounded-2xl border border-border bg-muted/50 p-12 text-center">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Pending Candidate Applications
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                There are no pending candidate membership applications for {guildName}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {candidateApplications.map((application) => (
                <div
                  key={application.id}
                  className="rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h4 className="font-semibold text-foreground text-base truncate">
                          {application.candidateName}
                        </h4>
                        <span className="shrink-0 px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/30 text-xs font-semibold rounded-full">
                          {application.expertiseLevel}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        {application.candidateEmail}
                      </p>

                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-xs">
                        <span className="flex items-center text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {new Date(application.submittedAt).toLocaleDateString()}
                        </span>
                        {application.jobTitle && (
                          <span className="flex items-center text-amber-300/80">
                            <Briefcase className="w-3.5 h-3.5 mr-1" />
                            {application.jobTitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center text-green-400">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          <span className="font-semibold">{application.approvalCount}</span>
                        </div>
                        <div className="flex items-center text-red-400">
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          <span className="font-semibold">{application.rejectionCount}</span>
                        </div>
                        <span className="text-muted-foreground">
                          ({application.reviewCount})
                        </span>
                      </div>

                      {application.expertHasReviewed ? (
                        <div className="flex items-center px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20">
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                          <span className="text-sm font-medium">Reviewed</span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => onReviewCandidateApplication(application)}
                          size="sm"
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border-0"
                        >
                          <Users className="w-3.5 h-3.5 mr-1.5" />
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
