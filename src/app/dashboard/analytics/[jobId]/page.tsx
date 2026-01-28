"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Briefcase,
  Users,
  Eye,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  User,
  LogOut,
  Calendar,
  MapPin,
  DollarSign,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { jobsApi } from "@/lib/api";

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

export default function JobAnalyticsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<JobPosting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companyEmail, setCompanyEmail] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Check authentication
    const companyId = localStorage.getItem("companyId");
    if (!companyId) {
      router.push("/auth/login?type=company");
      return;
    }
    const email = localStorage.getItem("companyEmail");
    if (email) setCompanyEmail(email);

    fetchJobDetails();
  }, [jobId, router]);

  const fetchJobDetails = async () => {
    setIsLoading(true);
    try {
      const data = await jobsApi.getById(jobId);
      setJob(data as JobPosting);
    } catch (error) {
      console.error("Error fetching job details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("companyAuthToken");
    localStorage.removeItem("companyId");
    localStorage.removeItem("companyEmail");
    localStorage.removeItem("companyWallet");
    router.push("/?section=employers");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <p className="text-muted-foreground">Loading job analytics...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <p className="text-muted-foreground">Job not found</p>
      </div>
    );
  }

  // Mock application data - TODO: fetch from API
  const mockApplicationStats = {
    pending: Math.floor(job.applicants * 0.4),
    reviewing: Math.floor(job.applicants * 0.3),
    accepted: Math.floor(job.applicants * 0.15),
    rejected: Math.floor(job.applicants * 0.15),
  };

  const conversionRate = job.views > 0 ? ((job.applicants / job.views) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/")}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              >
                <Image src="/Vetted-orange.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
                <span className="text-xl font-bold text-foreground">Vetted</span>
              </button>
              <nav className="hidden md:flex items-center space-x-6 ml-8">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="text-card-foreground hover:text-foreground transition-colors"
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
                  className="text-foreground font-medium hover:text-primary transition-colors"
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => router.push("/dashboard/analytics")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-foreground">{job.title}</h1>
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              job.status === "active"
                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : job.status === "paused"
                ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                : job.status === "closed"
                ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
            }`}>
              {job.status}
            </span>
          </div>

          {/* Job Details */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {job.location}
            </div>
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              {job.type}
            </div>
            {job.salary.min && job.salary.max && (
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                {job.salary.currency} {(job.salary.min / 100).toLocaleString()} - {(job.salary.max / 100).toLocaleString()}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Posted {new Date(job.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Views</p>
                <p className="text-3xl font-bold text-foreground">{job.views}</p>
              </div>
              <Eye className="w-10 h-10 text-blue-600/20" />
            </div>
            <p className="text-xs text-muted-foreground">Job page visits</p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Applicants</p>
                <p className="text-3xl font-bold text-foreground">{job.applicants}</p>
              </div>
              <Users className="w-10 h-10 text-primary/20" />
            </div>
            <p className="text-xs text-muted-foreground">Applications received</p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Conversion Rate</p>
                <p className="text-3xl font-bold text-foreground">{conversionRate}%</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-600/20" />
            </div>
            <p className="text-xs text-muted-foreground">View to application rate</p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Accepted</p>
                <p className="text-3xl font-bold text-foreground">{mockApplicationStats.accepted}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600/20" />
            </div>
            <p className="text-xs text-muted-foreground">Successful hires</p>
          </div>
        </div>

        {/* Application Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Application Status</h3>
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-foreground">Pending Review</p>
                    <p className="text-xs text-muted-foreground">Awaiting initial screening</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">{mockApplicationStats.pending}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-foreground">Under Review</p>
                    <p className="text-xs text-muted-foreground">Currently being evaluated</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">{mockApplicationStats.reviewing}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-foreground">Accepted</p>
                    <p className="text-xs text-muted-foreground">Moved forward in process</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">{mockApplicationStats.accepted}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-foreground">Rejected</p>
                    <p className="text-xs text-muted-foreground">Not a good fit</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-foreground">{mockApplicationStats.rejected}</span>
              </div>
            </div>
          </div>

          {/* Job Information */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Job Information</h3>
              <Briefcase className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-foreground text-sm leading-relaxed line-clamp-4">
                  {job.description}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Requirements</p>
                <ul className="space-y-1">
                  {job.requirements.slice(0, 4).map((req, index) => (
                    <li key={index} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="line-clamp-1">{req}</span>
                    </li>
                  ))}
                  {job.requirements.length > 4 && (
                    <li className="text-sm text-muted-foreground">
                      +{job.requirements.length - 4} more requirements
                    </li>
                  )}
                </ul>
              </div>

              {job.department && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Department</p>
                  <p className="text-foreground font-medium">{job.department}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">Guild</p>
                <p className="text-foreground font-medium">{job.guild}</p>
              </div>

              <div className="pt-4 border-t border-border">
                <button
                  onClick={() => router.push(`/jobs/${job.id}/edit`)}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  Edit Job Posting
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
