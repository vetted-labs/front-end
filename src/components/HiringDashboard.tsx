"use client";
import Image from "next/image";
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
  LogOut,
  User,
} from "lucide-react";
import { Button, LoadingState, Alert, Card, StatusBadge } from "./ui";
import { jobsApi, dashboardApi } from "@/lib/api";
import { useApi } from "@/lib/hooks/useFetch";
import { JOB_STATUSES } from "@/config/constants";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";
import { useDisconnect } from "wagmi";
import { clearAllAuthState } from "@/lib/auth";

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
  const [companyEmail, setCompanyEmail] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { execute } = useApi();
  const { disconnect } = useDisconnect();

  // Check authentication on mount
  useEffect(() => {
    const userType = localStorage.getItem("userType");

    // Redirect candidates to their profile page
    if (userType === "candidate") {
      router.push("/candidate/profile");
      return;
    }

    const token = localStorage.getItem("companyAuthToken");
    if (!token) {
      router.push("/auth/login?type=company?redirect=/dashboard");
      return;
    }
    const email = localStorage.getItem("companyEmail");
    if (email) setCompanyEmail(email);
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterStatus]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("companyAuthToken");
      const companyId = localStorage.getItem("companyId");
      if (!token) {
        router.push("/auth/login?type=company?redirect=/dashboard");
        return;
      }

      const [jobsData, statsData] = await Promise.all([
        jobsApi.getAll({
          status: filterStatus !== "all" ? filterStatus : undefined,
          search: searchQuery || undefined,
          companyId: companyId || undefined,
        }),
        dashboardApi.getStats(companyId || undefined),
      ]);

      if (Array.isArray(jobsData)) {
        setJobPostings(jobsData);
      }
      setStats(statsData as DashboardStats);
    } catch (error: unknown) {
      if ((error as { status?: number }).status === 401) {
        localStorage.removeItem("companyAuthToken");
        router.push("/auth/login?type=company?redirect=/dashboard");
        return;
      }
      setError(
        `Failed to load data. Ensure backend is running. Details: ${(error as Error).message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job posting?")) return;

    await execute(() => jobsApi.delete(jobId), {
      onSuccess: () => {
        setJobPostings((prev) => prev.filter((job) => job.id !== jobId));
      },
      onError: (err) => {
        if (err.includes("401")) {
          router.push("/auth/login?type=company?redirect=/dashboard");
        }
      },
    });
  };

  const handleLogout = () => {
    clearAllAuthState();
    disconnect();
    router.push("/?section=employers");
  };

  if (isLoading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Logo onClick={() => router.push("/?section=employers")} />
              <nav className="hidden md:flex items-center space-x-6 ml-8">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="text-foreground font-medium hover:text-primary transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push("/dashboard/candidates")}
                  className="text-card-foreground hover:text-foreground transition-colors"
                >
                  Candidates
                </button>
                <button
                  onClick={() => router.push("/dashboard/analytics")}
                  className="text-card-foreground hover:text-foreground transition-colors"
                >
                  Analytics
                </button>
                <button
                  onClick={() => router.push("/dashboard/settings")}
                  className="text-card-foreground hover:text-foreground transition-colors"
                >
                  Settings
                </button>
              </nav>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground hidden sm:block">
                  {companyEmail || "Company"}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border py-1 z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium text-foreground">
                      {companyEmail}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Company Account</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push("/company/profile");
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-card-foreground hover:bg-muted flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Company Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6">
            <Alert variant="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              {stats?.totalJobs || 0}
            </h3>
            <p className="text-card-foreground text-sm mt-1">Total Jobs</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              {stats?.activeJobs || 0}
            </h3>
            <p className="text-card-foreground text-sm mt-1">Active Postings</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              {stats?.totalApplicants || 0}
            </h3>
            <p className="text-card-foreground text-sm mt-1">Total Applicants</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              {stats?.averageTimeToHire || 0}
            </h3>
            <p className="text-card-foreground text-sm mt-1">Avg. Days to Hire</p>
          </Card>
        </div>

        {/* Job Postings */}
        <Card padding="none">
          <div className="p-6 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl font-bold text-foreground">Job Postings</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
                >
                  <option value="all">All Status</option>
                  {JOB_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => router.push("/jobs/new")}
                  icon={<Plus className="w-5 h-5" />}
                >
                  <span className="hidden sm:inline">Post New Job</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {jobPostings.length > 0 ? (
              jobPostings.map((job) => (
                <div
                  key={job.id}
                  onClick={() => router.push(`/jobs/${job.id}`)}
                  className="p-6 hover:bg-muted hover:border-primary transition-all cursor-pointer border border-transparent"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-card-foreground">
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowActionMenu(
                                showActionMenu === job.id ? null : job.id
                              );
                            }}
                            className="p-1 hover:bg-muted rounded"
                          >
                            <MoreVertical className="w-5 h-5 text-muted-foreground" />
                          </button>
                          {showActionMenu === job.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border py-1 z-10">
                              <button
                                onClick={() => router.push(`/jobs/${job.id}`)}
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" /> View Details
                              </button>
                              <button
                                onClick={() =>
                                  router.push(`/jobs/${job.id}/edit`)
                                }
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                              >
                                <Edit className="w-4 h-4" /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteJob(job.id)}
                                className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 mt-4">
                        <StatusBadge status={job.status} />
                        <span className="text-sm text-card-foreground">
                          <strong>{job.applicants}</strong> applicants
                        </span>
                        <span className="text-sm text-card-foreground">
                          <strong>{job.views}</strong> views
                        </span>
                        <span className="text-sm text-card-foreground">
                          Guild: <strong>{job.guild}</strong>
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Posted {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <p className="text-card-foreground mb-4">No job postings found</p>
                <Button onClick={() => router.push("/jobs/new")}>
                  Create Your First Job Posting
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
