"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui";
import { STATUS_COLORS } from "@/config/colors";
import { CheckCircle2, Building2, Briefcase, X } from "lucide-react";
import type { CandidateApplication } from "@/types";

interface CelebrationDialogProps {
  application: CandidateApplication;
  open: boolean;
  onClose: () => void;
}

export function CelebrationDialog({ application, open, onClose }: CelebrationDialogProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <div className="p-6 sm:p-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors z-10"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Success icon */}
          <CheckCircle2 className="w-12 h-12 text-primary mb-4" />

          {/* Heading */}
          <h2 className="text-xl font-bold text-foreground mb-1">
            Congratulations!
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            You&apos;ve been accepted for a position
          </p>

          {/* Job details card */}
          <div className={`rounded-xl border ${STATUS_COLORS.positive.border} ${STATUS_COLORS.positive.bgSubtle} p-4 mb-6`}>
            <p className="font-bold text-foreground text-lg mb-1">
              {application.job.title}
            </p>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {application.job.companyName && (
                <span className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" />
                  {application.job.companyName}
                </span>
              )}
              <span className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5" />
                {application.job.type}
              </span>
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Button
              onClick={() => {
                onClose();
                router.push(`/browse/jobs/${application.job.id}`);
              }}
              className="w-full"
            >
              View Job Details
            </Button>
            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
