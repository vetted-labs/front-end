// app/jobs/[jobId]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-900">Job not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 flex items-center text-gray-900 hover:text-gray-700"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{job.title}</h1>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-gray-700 mb-4">{job.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-900 font-medium">Department</p>
              <p className="text-gray-700">{job.department || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-900 font-medium">Location</p>
              <p className="text-gray-700">
                {job.location} ({job.locationType})
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-900 font-medium">Type</p>
              <p className="text-gray-700">{job.type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-900 font-medium">Experience</p>
              <p className="text-gray-700">{job.experienceLevel || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-900 font-medium">Salary</p>
              <p className="text-gray-700">
                {job.salary.min && job.salary.max
                  ? `$${job.salary.min / 1000}k - $${job.salary.max / 1000}k ${job.salary.currency}`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-900 font-medium">Equity</p>
              <p className="text-gray-700">
                {job.equityOffered ? job.equityRange || "Offered" : "None"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-900 font-medium">Status</p>
              <p className="text-gray-700">{job.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-900 font-medium">Guild</p>
              <p className="text-gray-700">{job.guild}</p>
            </div>
            <div>
              <p className="text-sm text-gray-900 font-medium">Applicants</p>
              <p className="text-gray-700">{job.applicants}</p>
            </div>
            <div>
              <p className="text-sm text-gray-900 font-medium">Views</p>
              <p className="text-gray-700">{job.views}</p>
            </div>
            <div>
              <p className="text-sm text-gray-900 font-medium">Created</p>
              <p className="text-gray-700">
                {new Date(job.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Requirements
          </h2>
          <ul className="list-disc pl-5 text-gray-700 mb-4">
            {job.requirements.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Skills</h2>
          <ul className="list-disc pl-5 text-gray-700 mb-4">
            {job.skills.map((skill, index) => (
              <li key={index}>{skill}</li>
            ))}
          </ul>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Screening Questions
          </h2>
          <ul className="list-disc pl-5 text-gray-700">
            {job.screeningQuestions.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
