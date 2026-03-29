"use client";

import { getAssetUrl } from "@/lib/api";
import { getPersonAvatar } from "@/lib/avatars";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StartConversationButton } from "@/components/messaging/StartConversationButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CompanyApplication, ApplicationStatus } from "@/types";

interface ApplicationDetailModalProps {
  application: CompanyApplication;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (application: CompanyApplication, newStatus: ApplicationStatus) => void;
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "accepted": return "default" as const;
    case "rejected": return "destructive" as const;
    case "interviewed": return "secondary" as const;
    default: return "outline" as const;
  }
}

export function ApplicationDetailModal({
  application,
  open,
  onOpenChange,
  onStatusChange,
}: ApplicationDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 py-5 border-b border-border">
          <DialogTitle>Application Details</DialogTitle>
        </DialogHeader>

        <div>
          {/* Candidate Info + Status */}
          <div className="flex items-start gap-4 px-6 py-5 border-b border-border">
            <img
              src={getPersonAvatar(application.candidate.fullName)}
              alt={application.candidate.fullName}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0 bg-muted"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-xl">
                  {application.candidate.fullName}
                </h3>
                <Badge variant={getStatusBadgeVariant(application.status)}>
                  {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {application.candidate.email}
              </p>
              {application.candidate.headline && (
                <p className="text-sm mt-1">{application.candidate.headline}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                {application.resumeUrl && (
                  <a
                    href={getAssetUrl(application.resumeUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    View Resume
                  </a>
                )}
                <StartConversationButton
                  applicationId={application.id}
                  candidateName={application.candidate.fullName}
                />
                <Select
                  value={application.status}
                  onValueChange={(newStatus) =>
                    onStatusChange(application, newStatus as ApplicationStatus)
                  }
                >
                  <SelectTrigger className="w-[150px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="interviewed">Interviewed</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Cover Letter */}
          <div className="border-b border-border">
            <div className="px-5 py-4 border-b border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cover Letter
              </h4>
            </div>
            <div className="px-5 py-4 whitespace-pre-wrap text-sm">
              {application.coverLetter}
            </div>
          </div>

          {/* Screening Answers */}
          {application.screeningAnswers && application.screeningAnswers.length > 0 && (
            <div className="border-b border-border">
              <div className="px-5 py-4 border-b border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Screening Answers
                </h4>
              </div>
              <div className="divide-y divide-border/30">
                {application.screeningAnswers.map((answer: string, idx: number) => (
                  <div key={idx} className="px-5 py-3.5">
                    <p className="text-sm font-medium mb-1">Question {idx + 1}</p>
                    <p className="text-sm">{answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
