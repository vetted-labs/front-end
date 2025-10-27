// components/JobForm.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Loader2,
  ArrowLeft,
} from "lucide-react";

interface JobFormData {
  title: string;
  department?: string;
  description: string;
  requirements?: string[];
  skills?: string[];
  location: string;
  locationType: "remote" | "onsite" | "hybrid";
  jobType: "Full-time" | "Part-time" | "Contract" | "Freelance";
  experienceLevel?: "junior" | "mid" | "senior" | "lead" | "executive";
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  guild: string;
  status: "draft" | "active" | "paused" | "closed";
  screeningQuestions?: string[];
  companyId?: string;
}

export function JobForm() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string | undefined;
  const isEditing = !!jobId;

  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    description: "",
    location: "",
    locationType: "remote",
    jobType: "Full-time",
    salaryCurrency: "USD",
    guild: "",
    status: "draft",
    companyId: "00000000-0000-0000-0000-000000000000",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isEditing && jobId) {
      console.log("Fetching job for editing with jobId:", jobId);
      const fetchJob = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(
            `http://localhost:4000/api/jobs/${jobId}`,
          );
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              `Failed to fetch job: ${response.status} - ${errorData.error || response.statusText}`,
            );
          }
          const data = await response.json();
          console.log("Fetched job data:", data);
          setFormData({
            title: data.title || "",
            department: data.department || "",
            description: data.description || "",
            requirements: data.requirements || [],
            skills: data.skills || [],
            location: data.location || "",
            locationType: data.locationType || "remote",
            jobType: data.type || "Full-time",
            experienceLevel: data.experienceLevel || undefined,
            salaryMin: data.salary.min || undefined,
            salaryMax: data.salary.max || undefined,
            salaryCurrency: data.salary.currency || "USD",
            guild: data.guild || "",
            status: data.status || "draft",
            screeningQuestions: data.screeningQuestions || [],
            companyId: data.companyId || "00000000-0000-0000-0000-000000000000",
          });
        } catch (error) {
          setError(
            `Failed to load job data. Details: ${(error as Error).message}`,
          );
          console.error("Fetch error:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchJob();
    }
  }, [isEditing, jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = isEditing ? `/api/jobs/${jobId}` : "/api/jobs";
      const method = isEditing ? "PUT" : "POST";
      const response = await fetch(`http://localhost:4000${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          department: formData.department || undefined,
          requirements: formData.requirements?.length
            ? formData.requirements
            : undefined,
          skills: formData.skills?.length ? formData.skills : undefined,
          experienceLevel: formData.experienceLevel || undefined,
          salaryMin: formData.salaryMin || undefined,
          salaryMax: formData.salaryMax || undefined,
          screeningQuestions: formData.screeningQuestions?.length
            ? formData.screeningQuestions
            : undefined,
          companyId: formData.companyId,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        router.push("/dashboard");
      } else {
        setError(
          data.error ||
            (data.details
              ? data.details.map((err: Record<string, unknown>) => err.message).join(", ")
              : "Failed to save job"),
        );
      }
    } catch (error) {
      setError(`Something went wrong. Details: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof JobFormData,
    value: string | string[] | number | undefined,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {isEditing ? "Edit Job Posting" : "Create New Job Posting"}
        </h1>
        <div className="bg-white rounded-xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Job Title
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-900"
                  placeholder="e.g., Senior Solidity Developer"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Department
              </label>
              <input
                type="text"
                value={formData.department || ""}
                onChange={(e) =>
                  handleInputChange("department", e.target.value)
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-900"
                placeholder="e.g., Engineering"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-900"
                rows={6}
                placeholder="Describe the job responsibilities..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-900"
                  placeholder="e.g., Remote or San Francisco"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Location Type
                </label>
                <select
                  value={formData.locationType}
                  onChange={(e) =>
                    handleInputChange(
                      "locationType",
                      e.target.value as "remote" | "onsite" | "hybrid",
                    )
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-900"
                >
                  <option value="remote">Remote</option>
                  <option value="onsite">Onsite</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Job Type
                </label>
                <select
                  value={formData.jobType}
                  onChange={(e) =>
                    handleInputChange(
                      "jobType",
                      e.target.value as
                        | "Full-time"
                        | "Part-time"
                        | "Contract"
                        | "Freelance",
                    )
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-900"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Salary Min
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={formData.salaryMin || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "salaryMin",
                        parseInt(e.target.value) || undefined,
                      )
                    }
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-900"
                    placeholder="e.g., 100000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Salary Max
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={formData.salaryMax || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "salaryMax",
                        parseInt(e.target.value) || undefined,
                      )
                    }
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-900"
                    placeholder="e.g., 150000"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Guild
              </label>
              <input
                type="text"
                value={formData.guild}
                onChange={(e) => handleInputChange("guild", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-900"
                placeholder="e.g., Engineering Guild"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  handleInputChange(
                    "status",
                    e.target.value as "draft" | "active" | "paused" | "closed",
                  )
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-900"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Requirements (one per line)
              </label>
              <textarea
                value={formData.requirements?.join("\n") || ""}
                onChange={(e) =>
                  handleInputChange(
                    "requirements",
                    e.target.value.split("\n").filter(Boolean),
                  )
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-900"
                rows={4}
                placeholder="e.g., 5+ years experience"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Skills (one per line)
              </label>
              <textarea
                value={formData.skills?.join("\n") || ""}
                onChange={(e) =>
                  handleInputChange(
                    "skills",
                    e.target.value.split("\n").filter(Boolean),
                  )
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-900"
                rows={4}
                placeholder="e.g., Solidity, React"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Screening Questions (one per line)
              </label>
              <textarea
                value={formData.screeningQuestions?.join("\n") || ""}
                onChange={(e) =>
                  handleInputChange(
                    "screeningQuestions",
                    e.target.value.split("\n").filter(Boolean),
                  )
                }
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white text-gray-900"
                rows={4}
                placeholder="e.g., Describe your experience with DeFi"
              />
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center justify-center space-x-2"
            >
              {isEditing ? (
                isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Update Job"
                )
              ) : isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Create Job"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
