"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  Eye,
  CheckCircle,
  Clock,
  Calendar,
  ArrowLeft,
  DollarSign,
  User,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AnalyticsData {
  totalApplications: number;
  applicationsChange: number;
  totalHires: number;
  hiresChange: number;
  activeJobs: number;
  jobsChange: number;
  avgTimeToHire: number;
  timeToHireChange: number;
  topPerformingJobs: Array<{
    title: string;
    applications: number;
    views: number;
  }>;
  applicationsByMonth: Array<{
    month: string;
    applications: number;
  }>;
  applicationsByStatus: {
    pending: number;
    reviewing: number;
    accepted: number;
    rejected: number;
  };
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
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

    fetchAnalytics();
  }, [router]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`http://localhost:4000/api/companies/analytics`);
      // const data = await response.json();

      // Mock data for now
      const mockAnalytics: AnalyticsData = {
        totalApplications: 248,
        applicationsChange: 12.5,
        totalHires: 15,
        hiresChange: -3.2,
        activeJobs: 8,
        jobsChange: 2,
        avgTimeToHire: 14,
        timeToHireChange: -8.5,
        topPerformingJobs: [
          { title: "Senior Software Engineer", applications: 45, views: 320 },
          { title: "Product Designer", applications: 38, views: 285 },
          { title: "Marketing Manager", applications: 32, views: 245 },
        ],
        applicationsByMonth: [
          { month: "Sep", applications: 35 },
          { month: "Oct", applications: 42 },
          { month: "Nov", applications: 58 },
          { month: "Dec", applications: 51 },
          { month: "Jan", applications: 62 },
        ],
        applicationsByStatus: {
          pending: 45,
          reviewing: 28,
          accepted: 15,
          rejected: 32,
        },
      };

      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
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
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    );
  }

  const maxApplications = Math.max(...analytics.applicationsByMonth.map(m => m.applications));

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
                <Image src="/Vetted.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
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
                  <div className="p-2 bg-violet-100 rounded-lg">
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
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          </div>
          <p className="text-muted-foreground">Track your hiring performance and metrics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Applications</p>
                <p className="text-3xl font-bold text-foreground">{analytics.totalApplications}</p>
              </div>
              <Users className="w-10 h-10 text-primary/20" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              {analytics.applicationsChange >= 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-medium">+{analytics.applicationsChange}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-red-600 font-medium">{analytics.applicationsChange}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs last month</span>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Hires</p>
                <p className="text-3xl font-bold text-foreground">{analytics.totalHires}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600/20" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              {analytics.hiresChange >= 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-medium">+{analytics.hiresChange}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-red-600 font-medium">{analytics.hiresChange}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs last month</span>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Jobs</p>
                <p className="text-3xl font-bold text-foreground">{analytics.activeJobs}</p>
              </div>
              <Briefcase className="w-10 h-10 text-blue-600/20" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">{analytics.jobsChange > 0 ? '+' : ''}{analytics.jobsChange} new this month</span>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg. Time to Hire</p>
                <p className="text-3xl font-bold text-foreground">{analytics.avgTimeToHire} <span className="text-lg">days</span></p>
              </div>
              <Clock className="w-10 h-10 text-yellow-600/20" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              {analytics.timeToHireChange <= 0 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-medium">{analytics.timeToHireChange}%</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 text-red-600" />
                  <span className="text-red-600 font-medium">+{analytics.timeToHireChange}%</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">vs last month</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Applications Over Time */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Applications Over Time</h3>
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="space-y-4">
              {analytics.applicationsByMonth.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground font-medium">{item.month}</span>
                    <span className="text-sm text-muted-foreground">{item.applications} applications</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary to-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${(item.applications / maxApplications) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Applications by Status */}
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Applications by Status</h3>
              <CheckCircle className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-foreground">Pending</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.applicationsByStatus.pending}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-foreground">Reviewing</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.applicationsByStatus.reviewing}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-foreground">Accepted</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.applicationsByStatus.accepted}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-foreground">Rejected</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{analytics.applicationsByStatus.rejected}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Jobs */}
        <div className="bg-card p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Top Performing Jobs</h3>
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>

          <div className="space-y-4">
            {analytics.topPerformingJobs.map((job, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary to-indigo-600 rounded-lg text-white font-bold">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{job.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {job.applications} applications • {job.views} views
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Conversion</p>
                    <p className="font-semibold text-foreground">
                      {((job.applications / job.views) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
