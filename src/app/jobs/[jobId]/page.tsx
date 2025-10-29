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

  useEffect(() => {
    if (!jobId) {
      setError("Invalid job ID.");
      setIsLoading(false);
      return;
    }
    console.log("Fetching job details for jobId:", jobId);
    const fetchJob = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:4000/api/jobs/${jobId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Failed to fetch job: ${response.status} - ${errorData.error || response.statusText}`,
          );
        }
        const data = await response.json();
        console.log("Fetched job data:", data);
        setJob(data);
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
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-violet-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground mb-4">Job not found.</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-violet-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>

        <div className="bg-card rounded-xl shadow-sm">
          {/* Header */}
          <div className="p-8 border-b border-border">
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
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>

          <div className="p-8 space-y-6">
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
                    {job.salary.min && job.salary.max
                      ? `$${job.salary.min / 1000}k - $${job.salary.max / 1000}k ${job.salary.currency}`
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
    </div>
  );
}
