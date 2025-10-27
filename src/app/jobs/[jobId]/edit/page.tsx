"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import EditForm from "@/components/EditForm";

interface JobData {
  id: string;
  title: string;
  department?: string;
  description: string;
  requirements: string[];
  skills: string[];
  location: string;
  locationType: "remote" | "onsite" | "hybrid";
  type: "Full-time" | "Part-time" | "Contract" | "Freelance";
  salary: { min?: number; max?: number; currency: string };
  status: "draft" | "active" | "paused" | "closed";
  guild: string;
  screeningQuestions: string[];
  createdAt: string;
  companyId: string;
}

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<JobData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) {
        setError("Job ID is missing");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:4000/api/jobs/${jobId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch job details");
        }

        const data = await response.json();

        // Transform the data to match EditForm's expected format
        const transformedData: JobData = {
          id: data.id,
          title: data.title,
          department: data.department || "",
          description: data.description,
          requirements: data.requirements || [],
          skills: data.skills || [],
          location: data.location,
          locationType: data.locationType,
          type: data.type,
          salary: {
            min: data.salary?.min,
            max: data.salary?.max,
            currency: data.salary?.currency || "USD",
          },
          status: data.status,
          guild: data.guild,
          screeningQuestions: data.screeningQuestions || [],
          createdAt: data.createdAt,
          companyId: data.companyId,
        };

        setJob(transformedData);
      } catch (err) {
        console.error("Error fetching job:", err);
        setError(err instanceof Error ? err.message : "Failed to load job");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  const handleSave = (updatedJob: JobData) => {
    // Navigate back to dashboard after successful save
    router.push("/dashboard");
  };

  const handleClose = () => {
    router.push("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-900 mb-4">Job not found</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <EditForm job={job} onClose={handleClose} onSave={handleSave} />
        </div>
      </div>
    </div>
  );
}
