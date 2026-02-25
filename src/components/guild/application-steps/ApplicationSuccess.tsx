"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowLeft, LayoutDashboard, Search } from "lucide-react";
import { Button } from "@/components/ui";

interface ApplicationSuccessProps {
  guildName: string;
  jobId?: string;
}

export default function ApplicationSuccess({
  guildName,
  jobId,
}: ApplicationSuccessProps) {
  const router = useRouter();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Application Submitted!
        </h2>
        <p className="text-muted-foreground mb-6">
          Your application to join <strong>{guildName}</strong> has been
          submitted successfully. Our expert members will review it and get back
          to you soon.
        </p>

        {jobId && (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mb-6">
            Once your guild membership is approved, your job application will be
            submitted automatically.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {jobId && (
            <Button
              onClick={() => router.push(`/browse/jobs/${jobId}`)}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Job Posting
            </Button>
          )}
          <Button
            variant={jobId ? "outline" : "default"}
            onClick={() => router.push("/candidate/dashboard")}
            icon={<LayoutDashboard className="w-4 h-4" />}
          >
            Go to Dashboard
          </Button>
          {!jobId && (
            <Button
              variant="outline"
              onClick={() => router.push("/browse/jobs")}
              icon={<Search className="w-4 h-4" />}
            >
              Browse Jobs
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
