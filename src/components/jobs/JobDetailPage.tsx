"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  DollarSign,
  Users,
  FileText,
  HelpCircle,
  Edit,
  Calendar,
  Eye,
} from "lucide-react";
import { jobsApi, applicationsApi, getAssetUrl } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { Button, buttonVariants } from "@/components/ui/button";
import { StartConversationButton } from "@/components/messaging/StartConversationButton";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { CompanyApplication, ApplicationStatus } from "@/types";

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

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400";
    case "paused":
      return "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400";
    case "closed":
      return "bg-muted border border-border text-muted-foreground";
    case "draft":
      return "bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400";
    default:
      return "bg-muted border border-border text-muted-foreground";
  }
};

interface JobDetailPageProps {
  dashboardContext?: boolean;
}

export default function JobDetailPage({ dashboardContext }: JobDetailPageProps) {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string | undefined;

  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApplication, setSelectedApplication] =
    useState<CompanyApplication | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  const backHref = dashboardContext ? "/dashboard/jobs" : "/dashboard";
  const backLabel = dashboardContext ? "Back to Jobs" : "Back to Dashboard";
  const editHref = dashboardContext
    ? `/dashboard/jobs/${jobId}/edit`
    : `/jobs/${jobId}/edit`;

  // Fetch job details
  const {
    data: job,
    isLoading,
    error,
  } = useFetch(() => jobsApi.getById(jobId!), { skip: !jobId });

  // Fetch applications (skip in dashboard context — candidates page handles this)
  const {
    data: applicationsData,
    isLoading: applicationsLoading,
    refetch: refetchApps,
  } = useFetch(
    () =>
      applicationsApi.getJobApplications(jobId!, {
        status: statusFilter,
        limit: 50,
      }),
    { skip: !jobId || dashboardContext }
  );

  const applications = applicationsData?.applications ?? [];

  // Refetch applications when statusFilter changes
  useEffect(() => {
    if (jobId) {
      refetchApps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Status update mutation
  const { execute: updateStatus } = useApi();

  const handleStatusChange = useCallback(
    async (application: CompanyApplication, newStatus: string) => {
      const result = await updateStatus(
        () => applicationsApi.updateStatus(application.id, newStatus),
        { onError: (msg) => toast.error(msg) }
      );

      if (result) {
        // Optimistically update the local list
        refetchApps();
        setSelectedApplication((prev) =>
          prev?.id === application.id
            ? { ...prev, status: newStatus as ApplicationStatus }
            : prev
        );
      }
    },
    [updateStatus, refetchApps]
  );

  if (isLoading) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => router.push(backHref)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary"
          >
            {backLabel}
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground mb-4">Job not found.</p>
          <button
            onClick={() => router.push(backHref)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary"
          >
            {backLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-full relative animate-page-enter">
      <div className="pointer-events-none absolute inset-0 content-gradient" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push(backHref)}
          className="mb-6 flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {backLabel}
        </button>

        {/* Header */}
        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06] mb-6">
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-foreground">
                    {job.title}
                  </h1>
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${getStatusColor(
                      job.status ?? "draft"
                    )}`}
                  >
                    {(job.status ?? "draft").charAt(0).toUpperCase() +
                      (job.status ?? "draft").slice(1)}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {job.views ?? 0} views
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {job.applicants ?? 0} applicants
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Posted {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => router.push(editHref)}
                className="px-4 py-2 rounded-xl bg-primary text-white hover:opacity-90 transition-all text-sm font-medium flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className={`grid grid-cols-1 ${dashboardContext ? "" : "lg:grid-cols-3"} gap-6`}>
          {/* Left Column - Applicants (hidden in dashboard context) */}
          {!dashboardContext && <div className="lg:col-span-1">
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06] sticky top-6">
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Applicants
                </h2>
                <span className="text-xs text-muted-foreground">
                  {applications.length}
                </span>
              </div>

              <div className="px-5 py-3 border-b border-border/40">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="interviewed">Interviewed</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {applicationsLoading ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No applicants yet
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/30 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {applications.map((application) => (
                    <div
                      key={application.id}
                      className="px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedApplication(application);
                        setShowApplicationModal(true);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {application.candidate.fullName
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">
                            {application.candidate.fullName}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {application.candidate.email}
                          </p>
                          {application.candidate.experienceLevel && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {application.candidate.experienceLevel}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(
                              application.appliedAt
                            ).toLocaleDateString()}
                          </p>
                          <Badge
                            className="mt-2"
                            variant={
                              application.status === "accepted"
                                ? "default"
                                : application.status === "rejected"
                                  ? "destructive"
                                  : application.status === "interviewed"
                                    ? "secondary"
                                    : "outline"
                            }
                          >
                            {application.status.charAt(0).toUpperCase() +
                              application.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>}

          {/* Right Column - Job Details */}
          <div className={dashboardContext ? "" : "lg:col-span-2"}>
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]">
              {/* Basic Information */}
              <div className="border-b border-border/40">
                <div className="px-5 py-4 border-b border-border/40">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Basic Information
                  </h2>
                </div>
                <div className="px-5 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-card-foreground mb-1">
                        Department
                      </p>
                      <p className="text-foreground">
                        {job.department || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-card-foreground mb-1">
                      Description
                    </p>
                    <p className="text-foreground whitespace-pre-wrap">
                      {job.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location & Type */}
              <div className="border-b border-border/40">
                <div className="px-5 py-4 border-b border-border/40">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location & Type
                  </h2>
                </div>
                <div className="px-5 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-card-foreground mb-1">
                        Location
                      </p>
                      <p className="text-foreground">{job.location}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-card-foreground mb-1">
                        Location Type
                      </p>
                      <p className="text-foreground capitalize">
                        {job.locationType}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-card-foreground mb-1">
                        Job Type
                      </p>
                      <p className="text-foreground">{job.type}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compensation & Experience */}
              <div className="border-b border-border/40">
                <div className="px-5 py-4 border-b border-border/40">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Compensation & Experience
                  </h2>
                </div>
                <div className="px-5 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-card-foreground mb-1">
                        Salary Range
                      </p>
                      <p className="text-foreground">
                        {job.salary?.min && job.salary?.max
                          ? `$${job.salary.min / 1000}k - $${job.salary.max / 1000}k ${job.salary?.currency}`
                          : "Not specified"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-card-foreground mb-1">
                        Equity
                      </p>
                      <p className="text-foreground">
                        {job.equityOffered
                          ? job.equityRange || "Offered"
                          : "Not offered"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-card-foreground mb-1">
                        Experience Level
                      </p>
                      <p className="text-foreground capitalize">
                        {job.experienceLevel || "Not specified"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guild Assignment */}
              <div className="border-b border-border/40">
                <div className="px-5 py-4 border-b border-border/40">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Guild Assignment
                  </h2>
                </div>
                <div className="px-5 py-4">
                  <div className="bg-primary/10 rounded-lg p-4">
                    <p className="text-foreground font-medium">{job.guild}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This guild will review and evaluate candidates for this
                      position
                    </p>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              {job.requirements && job.requirements.length > 0 && (
                <div className="border-b border-border/40">
                  <div className="px-5 py-4 border-b border-border/40">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Requirements
                    </h2>
                  </div>
                  <div className="px-5 py-4">
                    <ul className="space-y-2">
                      {job.requirements.map((req, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <span className="text-foreground">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Skills */}
              {job.skills && job.skills.length > 0 && (
                <div className="border-b border-border/40">
                  <div className="px-5 py-4 border-b border-border/40">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Skills
                    </h2>
                  </div>
                  <div className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Screening Questions */}
              {job.screeningQuestions && job.screeningQuestions.length > 0 && (
                <div>
                  <div className="px-5 py-4 border-b border-border/40">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" />
                      Screening Questions
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Candidates must answer these questions when applying
                    </p>
                  </div>

                  <div className="divide-y divide-border/30">
                    {job.screeningQuestions.map((question, index) => (
                      <div key={index} className="px-5 py-3.5">
                        <p className="text-sm font-medium text-card-foreground mb-1">
                          Question {index + 1}
                        </p>
                        <p className="text-foreground">{question}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Application Detail Modal */}
        {showApplicationModal && selectedApplication && (
          <Dialog
            open={showApplicationModal}
            onOpenChange={setShowApplicationModal}
          >
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-0">
              <DialogHeader className="px-6 py-5 border-b border-border/40">
                <DialogTitle>Application Details</DialogTitle>
              </DialogHeader>

              <div>
                {/* Candidate Info + Status */}
                <div className="flex items-start gap-4 px-6 py-5 border-b border-border/40">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-semibold text-primary">
                      {selectedApplication.candidate.fullName
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">
                        {selectedApplication.candidate.fullName}
                      </h3>
                      <Badge
                        variant={
                          selectedApplication.status === "accepted"
                            ? "default"
                            : selectedApplication.status === "rejected"
                              ? "destructive"
                              : selectedApplication.status === "interviewed"
                                ? "secondary"
                                : "outline"
                        }
                      >
                        {selectedApplication.status.charAt(0).toUpperCase() +
                          selectedApplication.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedApplication.candidate.email}
                    </p>
                    {selectedApplication.candidate.headline && (
                      <p className="text-sm mt-1">
                        {selectedApplication.candidate.headline}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {selectedApplication.resumeUrl && (
                        <a
                          href={getAssetUrl(selectedApplication.resumeUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" })
                          )}
                        >
                          View Resume
                        </a>
                      )}
                      <StartConversationButton
                        applicationId={selectedApplication.id}
                        candidateName={
                          selectedApplication.candidate.fullName
                        }
                      />
                      <Select
                        value={selectedApplication.status}
                        onValueChange={(newStatus) =>
                          handleStatusChange(selectedApplication, newStatus)
                        }
                      >
                        <SelectTrigger className="w-[150px] h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="reviewing">Reviewing</SelectItem>
                          <SelectItem value="interviewed">
                            Interviewed
                          </SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Cover Letter */}
                <div className="border-b border-border/40">
                  <div className="px-5 py-4 border-b border-border/40">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Cover Letter
                    </h4>
                  </div>
                  <div className="px-5 py-4 whitespace-pre-wrap text-sm">
                    {selectedApplication.coverLetter}
                  </div>
                </div>

                {/* Screening Answers */}
                {selectedApplication.screeningAnswers &&
                  selectedApplication.screeningAnswers.length > 0 && (
                    <div className="border-b border-border/40">
                      <div className="px-5 py-4 border-b border-border/40">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Screening Answers
                        </h4>
                      </div>
                      <div className="divide-y divide-border/30">
                        {selectedApplication.screeningAnswers.map(
                          (answer: string, idx: number) => (
                            <div key={idx} className="px-5 py-3.5">
                              <p className="text-sm font-medium mb-1">
                                Question {idx + 1}
                              </p>
                              <p className="text-sm">{answer}</p>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>

              <DialogFooter className="px-6 py-4 border-t border-border/40">
                <Button
                  variant="outline"
                  onClick={() => setShowApplicationModal(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
