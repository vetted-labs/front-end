"use client";

import { UserPlus, CheckCircle, XCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GuildApplication {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  linkedinUrl: string;
  portfolioUrl?: string;
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

interface GuildMembershipApplicationsTabProps {
  guildName: string;
  guildApplications: GuildApplication[];
  onReviewApplication: (application: GuildApplication) => void;
}

export function GuildMembershipApplicationsTab({
  guildName,
  guildApplications,
  onReviewApplication,
}: GuildMembershipApplicationsTabProps) {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Expert Proposals to Join Guild
        </h3>
        <p className="text-sm text-muted-foreground">
          Review proposals from experts wanting to join {guildName}. 1+ approval
          needed for auto-acceptance as &quot;Recruit&quot; member.
        </p>
      </div>

      {!guildApplications || guildApplications.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Pending Applications
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            There are no pending membership applications for {guildName}. When
            experts apply to join, you&apos;ll be able to review and vote on
            their applications here.
          </p>
        </div>
      ) : (
        (guildApplications || []).map((application) => (
          <div
            key={application.id}
            className="border border-border rounded-lg p-6 hover:border-primary/50 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-foreground mb-1">
                  {application.fullName}
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {application.email}
                </p>
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                    {application.expertiseLevel}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {application.yearsOfExperience} years experience
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-2">Review Status</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm font-semibold">
                      {application.approvalCount}
                    </span>
                  </div>
                  <div className="flex items-center text-destructive">
                    <XCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm font-semibold">
                      {application.rejectionCount}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ({application.reviewCount} total)
                  </span>
                </div>
              </div>
            </div>

            {/* Current Position */}
            <div className="mb-4 pb-4 border-b border-border">
              <p className="text-xs text-muted-foreground mb-1">Current Position</p>
              <p className="text-sm font-medium text-foreground">
                {application.currentTitle} at {application.currentCompany}
              </p>
            </div>

            {/* Bio */}
            <div className="mb-4 pb-4 border-b border-border">
              <p className="text-xs text-muted-foreground mb-2">Bio</p>
              <p className="text-sm text-card-foreground leading-relaxed">
                {application.bio}
              </p>
            </div>

            {/* Motivation */}
            <div className="mb-4 pb-4 border-b border-border">
              <p className="text-xs text-muted-foreground mb-2">
                Motivation to Join
              </p>
              <p className="text-sm text-card-foreground leading-relaxed">
                {application.motivation}
              </p>
            </div>

            {/* Expertise Areas */}
            <div className="mb-4 pb-4 border-b border-border">
              <p className="text-xs text-muted-foreground mb-2">Expertise Areas</p>
              <div className="flex flex-wrap gap-2">
                {(application.expertiseAreas || []).map((area, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-muted text-card-foreground text-xs rounded-full"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Links */}
            <div className="mb-4">
              <div className="flex gap-4 text-sm">
                <a
                  href={application.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary underline"
                >
                  LinkedIn Profile
                </a>
                {application.portfolioUrl && (
                  <a
                    href={application.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary underline"
                  >
                    Portfolio
                  </a>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Applied: {new Date(application.appliedAt).toLocaleDateString()}
              </p>
            </div>

            {/* Review Button */}
            <Button
              onClick={() => onReviewApplication(application)}
              className="w-full"
            >
              <Users className="w-4 h-4 mr-2" />
              Review Application
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
