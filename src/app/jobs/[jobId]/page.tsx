// app/jobs/[jobId]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
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
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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

interface JobDetails {
  id: string;
  title: string;
  department: string | null;
  description: string;
  requirements: string[];
  skills: string[];
  location: string;
  locationType: "remote" | "onsite" | "hybrid";
  type: "Full-time" | "Part-time" | "Contract" | "Freelance";
  experienceLevel: "junior" | "mid" | "senior" | "lead" | "executive" | null;
  salary: { min: number | null; max: number | null; currency: string };
  equityOffered: boolean | null;
  equityRange: string | null;
  status: "draft" | "active" | "paused" | "closed";
  guild: string;
  applicants: number;
  views: number;
  screeningQuestions: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  companyId: string;
}

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string | undefined;
  const [job, setJob] = useState<JobDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setError("Invalid job ID.");
      setIsLoading(false);
      return;
    }
    const fetchJob = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await jobsApi.getById(jobId);
        setJob(result as JobDetails);
      } catch (error) {
        setError(
          `Failed to load job details. Details: ${(error as Error).message}`,
        );
        console.error("Fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);

  useEffect(() => {
    const fetchApplications = async () => {
      if (!jobId) return;

      try {
        setApplicationsLoading(true);
        const data: any = await applicationsApi.getJobApplications(jobId, {
          status: statusFilter,
          limit: 50
        });
        setApplications(data.applications ?? []);
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setApplicationsLoading(false);
      }
    };

    fetchApplications();
  }, [jobId, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "paused":
        return "bg-yellow-100 text-yellow-700";
      case "closed":
        return "bg-muted text-card-foreground";
      case "draft":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-muted text-card-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen min-h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary"
          >
            Back to Dashboard
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
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="bg-card rounded-xl shadow-sm p-8 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {job.title}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    job.status,
                  )}`}
                >
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {job.views} views
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {job.applicants} applicants
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Posted {new Date(job.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push(`/jobs/${job.id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Applicants */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl shadow-sm p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Applicants</h2>
                  <p className="text-sm text-muted-foreground">
                    {applications.length}{" "}
                    {applications.length === 1 ? "applicant" : "applicants"}
                  </p>
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full mb-4">
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

              {applicationsLoading ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">No applicants yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {applications.map((application: any) => (
                    <div
                      key={application.id}
                      className="border rounded-lg p-3 hover:bg-muted transition-colors cursor-pointer"
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
          </div>

          {/* Right Column - Job Details */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl shadow-sm p-8 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Basic Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-card-foreground mb-1">
                    Department
                  </p>
                  <p className="text-foreground">{job.department || "N/A"}</p>
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

            {/* Location & Type */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location & Type
              </h2>

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
                  <p className="text-foreground capitalize">{job.locationType}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-card-foreground mb-1">
                    Job Type
                  </p>
                  <p className="text-foreground">{job.type}</p>
                </div>
              </div>
            </div>

            {/* Compensation & Experience */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Compensation & Experience
              </h2>

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

            {/* Guild Assignment */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5" />
                Guild Assignment
              </h2>

              <div className="bg-primary/10 rounded-lg p-4">
                <p className="text-foreground font-medium">{job.guild}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This guild will review and evaluate candidates for this
                  position
                </p>
              </div>
            </div>

            {/* Requirements */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Requirements
              </h2>

              <ul className="space-y-2">
                {job.requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <span className="text-foreground">{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Skills */}
            {job.skills.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Skills</h2>

                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-muted text-foreground rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Screening Questions */}
            {job.screeningQuestions.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Screening Questions
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Candidates must answer these questions when applying
                  </p>
                </div>

                <div className="space-y-3">
                  {job.screeningQuestions.map((question, index) => (
                    <div
                      key={index}
                      className="p-4 bg-muted rounded-lg border border-border"
                    >
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
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Application Details</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Candidate Info */}
                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-primary">
                      {selectedApplication.candidate.fullName
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {selectedApplication.candidate.fullName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedApplication.candidate.email}
                    </p>
                    {selectedApplication.candidate.headline && (
                      <p className="text-sm mt-1">
                        {selectedApplication.candidate.headline}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cover Letter */}
                <div>
                  <h4 className="font-semibold mb-2">Cover Letter</h4>
                  <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                    {selectedApplication.coverLetter}
                  </div>
                </div>

                {/* Resume */}
                {selectedApplication.resumeUrl && (
                  <div>
                    <h4 className="font-semibold mb-2">Resume</h4>
                    <a
                      href={selectedApplication.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "outline" }))}
                    >
                      View Resume
                    </a>
                  </div>
                )}

                {/* Screening Answers */}
                {selectedApplication.screeningAnswers &&
                  selectedApplication.screeningAnswers.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Screening Answers</h4>
                      <div className="space-y-3">
                        {selectedApplication.screeningAnswers.map(
                          (answer: string, idx: number) => (
                            <div key={idx} className="p-3 bg-muted rounded-lg">
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

                {/* Status Update */}
                <div>
                  <h4 className="font-semibold mb-2">Application Status</h4>
                  <Select
                    value={selectedApplication.status}
                    onValueChange={async (newStatus) => {
                      try {
                        await applicationsApi.updateStatus(
                          selectedApplication.id,
                          newStatus
                        );
                        setApplications((prev) =>
                          prev.map((app) =>
                            app.id === selectedApplication.id
                              ? { ...app, status: newStatus }
                              : app
                          )
                        );
                        setSelectedApplication({
                          ...selectedApplication,
                          status: newStatus,
                        });
                      } catch (error) {
                        console.error("Error updating status:", error);
                      }
                    }}
                  >
                    <SelectTrigger>
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

              <DialogFooter>
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
