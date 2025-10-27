// app/jobs/[jobId]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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
    console.log("Fetching job details for jobId:", jobId); // Debug
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
        console.log("Fetched job data:", data); // Debug
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-600"></div>
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
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{job.title}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-gray-700">Department</p>
              <p className="text-gray-900">{job.department || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Location</p>
              <p className="text-gray-900">
                {job.location} ({job.locationType})
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Job Type</p>
              <p className="text-gray-900">{job.type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Experience Level
              </p>
              <p className="text-gray-900">{job.experienceLevel || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Salary</p>
              <p className="text-gray-900">
                {job.salary.min && job.salary.max
                  ? `$${job.salary.min / 1000}k - $${job.salary.max / 1000}k ${job.salary.currency}`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Equity</p>
              <p className="text-gray-900">
                {job.equityOffered ? job.equityRange || "Offered" : "None"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Status</p>
              <p className="text-gray-900">{job.status}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Guild</p>
              <p className="text-gray-900">{job.guild}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Applicants</p>
              <p className="text-gray-900">{job.applicants}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Views</p>
              <p className="text-gray-900">{job.views}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Created</p>
              <p className="text-gray-900">
                {new Date(job.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Description
            </h2>
            <p className="text-gray-700">{job.description}</p>
          </div>
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Requirements
            </h2>
            <ul className="list-disc pl-5 text-gray-700">
              {job.requirements.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>
          </div>
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Skills</h2>
            <ul className="list-disc pl-5 text-gray-700">
              {job.skills.map((skill, index) => (
                <li key={index}>{skill}</li>
              ))}
            </ul>
          </div>
          <div className="mt-6">
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
    </div>
  );
}
