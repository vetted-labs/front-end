// components/HiringDashboard.tsx (partial update)
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Users,
  Clock,
  TrendingUp,
  Briefcase,
  Calendar,
  MapPin,
  DollarSign,
  Building2,
  Loader2,
} from "lucide-react";

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Freelance";
  salary: { min: number | null; max: number | null; currency: string };
  status: "draft" | "active" | "paused" | "closed";
  applicants: number;
  views: number;
  createdAt: string;
  updatedAt: string;
  description: string;
  requirements: string[];
  guild: string;
  companyId: string;
}

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalApplicants: number;
  averageTimeToHire: number;
}

export function HiringDashboard() {
  const router = useRouter();
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [searchQuery, filterStatus]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [jobsResponse, statsResponse] = await Promise.all([
        fetch(
          `http://localhost:4000/api/jobs?status=${filterStatus}&search=${encodeURIComponent(
            searchQuery,
          )}`,
        ),
        fetch("http://localhost:4000/api/dashboard/stats"),
      ]);

      if (!jobsResponse.ok) {
        throw new Error(
          `Failed to fetch jobs: ${jobsResponse.status} - ${jobsResponse.statusText}`,
        );
      }
      if (!statsResponse.ok) {
        throw new Error(
          `Failed to fetch stats: ${statsResponse.status} - ${statsResponse.statusText}`,
        );
      }

      const jobsData = await jobsResponse.json();
      console.log("Fetched jobs data:", jobsData); // Debug
      if (!Array.isArray(jobsData)) {
        throw new Error("Invalid jobs data format");
      }
      setJobPostings(jobsData);
      const statsData = await statsResponse.json();
      setStats(statsData);
    } catch (error) {
      setError(
        `Failed to load data. Ensure backend is running at http://localhost:4000. Details: ${
          (error as Error).message
        }`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job posting?")) return;
    try {
      const response = await fetch(`http://localhost:4000/api/jobs/${jobId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(
          `Failed to delete job: ${response.status} - ${response.statusText}`,
        );
      }
      setJobPostings((prev) => prev.filter((job) => job.id !== jobId));
    } catch (error) {
      setError(`Failed to delete job. Details: ${(error as Error).message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "paused":
        return "bg-yellow-100 text-yellow-700";
      case "closed":
        return "bg-gray-100 text-gray-700";
      case "draft":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg"></div>
                <span className="text-xl font-bold text-gray-900">Vetted</span>
              </div>
              <nav className="hidden md:flex items-center space-x-6 ml-8">
                <a href="#" className="text-gray-900 font-medium">
                  Dashboard
                </a>
                <a href="#" className="text-gray-700 hover:text-gray-900">
                  Candidates
                </a>
                <a href="#" className="text-gray-700 hover:text-gray-900">
                  Analytics
                </a>
                <a href="#" className="text-gray-700 hover:text-gray-900">
                  Settings
                </a>
              </nav>
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto" />
            <p className="text-gray-900 mt-2">Loading dashboard...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <Briefcase className="w-6 h-6 text-violet-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {stats?.totalJobs || 0}
                </h3>
                <p className="text-gray-700 text-sm mt-1">Total Jobs</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {stats?.activeJobs || 0}
                </h3>
                <p className="text-gray-700 text-sm mt-1">Active Postings</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {stats?.totalApplicants || 0}
                </h3>
                <p className="text-gray-700 text-sm mt-1">Total Applicants</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {stats?.averageTimeToHire || 0}
                </h3>
                <p className="text-gray-700 text-sm mt-1">Avg. Days to Hire</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Job Postings
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search jobs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900"
                      />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-gray-900"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="closed">Closed</option>
                      <option value="draft">Draft</option>
                    </select>
                    <button
                      onClick={() => router.push("/jobs/new")}
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="hidden sm:inline">Post New Job</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {jobPostings.length > 0 ? (
                  jobPostings.map((job) => (
                    <div
                      key={job.id}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                {job.title}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-gray-700">
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-4 h-4" />
                                  {job.department || "N/A"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {job.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-4 h-4" />
                                  {job.salary.min && job.salary.max
                                    ? `$${job.salary.min / 1000}k - $${job.salary.max / 1000}k`
                                    : "N/A"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {job.type}
                                </span>
                              </div>
                            </div>
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setShowActionMenu(
                                    showActionMenu === job.id ? null : job.id,
                                  )
                                }
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <MoreVertical className="w-5 h-5 text-gray-600" />
                              </button>
                              {showActionMenu === job.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                  <button
                                    onClick={() => {
                                      console.log(
                                        "View Details for jobId:",
                                        job.id,
                                      );
                                      if (job.id)
                                        router.push(`/jobs/${job.id}`);
                                      else
                                        console.error("Invalid job.id:", job);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4" /> View Details
                                  </button>
                                  <button
                                    onClick={() => {
                                      console.log("Edit for jobId:", job.id);
                                      if (job.id)
                                        router.push(`/jobs/${job.id}/edit`);
                                      else
                                        console.error("Invalid job.id:", job);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Edit className="w-4 h-4" /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteJob(job.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-6 mt-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                job.status,
                              )}`}
                            >
                              {job.status.charAt(0).toUpperCase() +
                                job.status.slice(1)}
                            </span>
                            <span className="text-sm text-gray-700">
                              <strong>{job.applicants}</strong> applicants
                            </span>
                            <span className="text-sm text-gray-700">
                              <strong>{job.views}</strong> views
                            </span>
                            <span className="text-sm text-gray-700">
                              Guild: <strong>{job.guild}</strong>
                            </span>
                            <span className="text-sm text-gray-500">
                              Posted{" "}
                              {new Date(job.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-gray-700 mb-4">No job postings found</p>
                    <button
                      onClick={() => router.push("/jobs/new")}
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all"
                    >
                      Create Your First Job Posting
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";
    case "paused":
      return "bg-yellow-100 text-yellow-700";
    case "closed":
      return "bg-gray-100 text-gray-700";
    case "draft":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
