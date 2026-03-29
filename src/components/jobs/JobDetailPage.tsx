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
import { jobsApi, applicationsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { DataSection } from "@/lib/motion";
import { useApplicationStatusUpdate } from "@/lib/hooks/useApplicationStatusUpdate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ApplicationDetailModal } from "./ApplicationDetailModal";
import type { CompanyApplication, ApplicationStatus } from "@/types";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOB_STATUS_CONFIG } from "@/config/constants";

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

  // eslint-disable-next-line no-restricted-syntax -- triggers re-fetch on filter change (useFetch doesn't support custom deps)
  useEffect(() => {
    if (jobId) {
      refetchApps();
    }
  }, [statusFilter, jobId, refetchApps]);

  // Status update mutation
  const { updateStatus } = useApplicationStatusUpdate();

  const handleStatusChange = useCallback(
    async (application: CompanyApplication, newStatus: ApplicationStatus) => {
      const result = await updateStatus(
        {
          applicationId: application.id,
          candidateId: application.candidateId,
          jobId: application.jobId,
          currentStatus: application.status as ApplicationStatus,
          newStatus,
        },
        { onError: (msg) => toast.error(msg) }
      );

      if (result) {
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

  if (!isLoading && !job) {
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
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push(backHref)}
          className="mb-6 flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {backLabel}
        </button>

        <DataSection isLoading={isLoading} skeleton={null}>
        {job && (<>
        {/* Header */}
        <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-foreground font-display">
                    {job.title}
                  </h1>
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                      (JOB_STATUS_CONFIG[job.status ?? "draft"] || JOB_STATUS_CONFIG.draft).className
                    }`}
                  >
                    {(JOB_STATUS_CONFIG[job.status ?? "draft"] || JOB_STATUS_CONFIG.draft).label}
                  </span>
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    {job.views ?? 0} views
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {job.applicants ?? 0} applicants
                  </span>
                  <span className="flex items-center gap-2">
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
            <div className="rounded-xl border border-border bg-card overflow-hidden sticky top-6">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Applicants
                </h2>
                <span className="text-xs text-muted-foreground">
                  {applications.length}
                </span>
              </div>

              <div className="px-5 py-3 border-b border-border">
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
                          <span className="text-sm font-medium text-primary">
                            {application.candidate.fullName
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm truncate">
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
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Basic Information */}
              <div className="border-b border-border">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
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
              <div className="border-b border-border">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
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
              <div className="border-b border-border">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
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
              <div className="border-b border-border">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
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
                <div className="border-b border-border">
                  <div className="px-5 py-4 border-b border-border">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
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
                <div className="border-b border-border">
                  <div className="px-5 py-4 border-b border-border">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                  <div className="px-5 py-4 border-b border-border">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
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
        {selectedApplication && (
          <ApplicationDetailModal
            application={selectedApplication}
            open={showApplicationModal}
            onOpenChange={setShowApplicationModal}
            onStatusChange={handleStatusChange}
          />
        )}
        </>)}
        </DataSection>
      </div>
    </div>
  );
}
