"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Users,
  Briefcase,
  TrendingUp,
  MapPin,
  DollarSign,
  Building2,
  Sparkles,
  User,
  LogOut,
} from "lucide-react";
import { jobsApi } from "@/lib/api";

interface FeaturedJob {
  id: string;
  title: string;
  department: string | null;
  location: string;
  type: "Full-time" | "Part-time" | "Contract" | "Freelance";
  salary: { min: number | null; max: number | null; currency: string };
  guild: string;
  description: string;
  companyName?: string;
}

interface TalentMetrics {
  totalHired: number;
  activeJobs: number;
  totalCandidates: number;
  averageSalary: number;
}

export default function BrowseJobsPage() {
  const router = useRouter();
  const [featuredJobs, setFeaturedJobs] = useState<FeaturedJob[]>([]);
  const [metrics, setMetrics] = useState<TalentMetrics>({
    totalHired: 0,
    activeJobs: 0,
    totalCandidates: 0,
    averageSalary: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [candidateEmail, setCandidateEmail] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsAuthenticated(true);
      const email = localStorage.getItem("candidateEmail");
      if (email) setCandidateEmail(email);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("candidateId");
    localStorage.removeItem("candidateEmail");
    localStorage.removeItem("candidateWallet");
    setIsAuthenticated(false);
    setCandidateEmail("");
    setShowUserMenu(false);
    router.push("/?section=jobseekers");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch featured jobs (active jobs)
        const jobs: any = await jobsApi.getAll({ status: 'active' });
        // Ensure all jobs have required fields with defaults
        const normalizedJobs = jobs.map((job: Record<string, unknown>) => ({
          ...job,
          title: job.title || 'Untitled Position',
          description: job.description || '',
          guild: job.guild || '',
          department: job.department || null,
          requirements: job.requirements || [],
          skills: job.skills || [],
          screeningQuestions: job.screeningQuestions || [],
        }));
        setFeaturedJobs(normalizedJobs.slice(0, 6)); // Show top 6 featured jobs

        // Mock metrics - in production, fetch from API
        setMetrics({
          totalHired: 1247,
          activeJobs: 89,
          totalCandidates: 3542,
          averageSalary: 125000,
        });
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push("/")}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg"></div>
              <span className="text-xl font-bold text-foreground">Vetted</span>
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                For Employers
              </button>

              {/* User Account Menu */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="p-2 bg-violet-100 rounded-lg">
                      <User className="w-4 h-4 text-violet-600" />
                    </div>
                    <span className="text-sm font-medium text-foreground hidden sm:block">
                      {candidateEmail}
                    </span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-card rounded-lg shadow-lg border border-border py-1 z-50">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium text-foreground">
                          {candidateEmail}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Candidate</p>
                      </div>
                      <button
                        onClick={() => router.push("/candidate/profile")}
                        className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted flex items-center gap-2"
                      >
                        <Briefcase className="w-4 h-4" />
                        My Dashboard
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => router.push("/auth/login?type=candidate")}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Find Your Next{" "}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Web3 Opportunity
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Join a decentralized talent marketplace where expertise is validated
            by guilds and opportunities are vetted by the community.
          </p>
          <button
            onClick={() => router.push("/browse/jobs")}
            className="inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Find the Job for You
            <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          <div className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-3xl font-bold text-foreground">
              {metrics.totalHired.toLocaleString()}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">Talent Hired</p>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-violet-100 rounded-xl">
                <Briefcase className="w-6 h-6 text-violet-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-violet-600" />
            </div>
            <h3 className="text-3xl font-bold text-foreground">
              {metrics.activeJobs}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">Active Jobs</p>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-3xl font-bold text-foreground">
              {metrics.totalCandidates.toLocaleString()}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">Registered Candidates</p>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-3xl font-bold text-foreground">
              ${(metrics.averageSalary / 1000).toFixed(0)}k
            </h3>
            <p className="text-muted-foreground text-sm mt-1">Average Salary</p>
          </div>
        </div>
      </div>

      {/* Featured Jobs Section */}
      <div className="bg-card py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-violet-600" />
                Featured Jobs
              </h2>
              <p className="text-muted-foreground mt-2">
                Top opportunities from leading Web3 organizations
              </p>
            </div>
            <button
              onClick={() => router.push("/browse/jobs")}
              className="text-violet-600 hover:text-violet-700 font-medium flex items-center gap-2"
            >
              View All Jobs
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading featured jobs...</p>
            </div>
          ) : featuredJobs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => router.push(`/browse/jobs/${job.id}`)}
                  className="bg-muted rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer border border-border hover:border-violet-300 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-card rounded-lg shadow-sm">
                      <Briefcase className="w-6 h-6 text-violet-600" />
                    </div>
                    <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
                      {job.type}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-violet-600 transition-colors">
                    {job.title}
                  </h3>

                  {job.companyName && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <Building2 className="w-4 h-4" />
                      {job.companyName}
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2 py-1 bg-card rounded text-xs text-card-foreground border border-border">
                      {job.guild}
                    </span>
                    {job.department && (
                      <span className="px-2 py-1 bg-card rounded text-xs text-card-foreground border border-border">
                        {job.department}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </div>
                    {job.salary.min && job.salary.max && (
                      <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                        <DollarSign className="w-4 h-4" />
                        {job.salary.min / 1000}k - {job.salary.max / 1000}k
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted rounded-xl">
              <p className="text-muted-foreground mb-4">
                No featured jobs available at the moment
              </p>
              <button
                onClick={() => router.push("/browse/jobs")}
                className="text-violet-600 hover:text-violet-700 font-medium"
              >
                Browse All Jobs →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Your Web3 Journey?
          </h2>
          <p className="text-violet-100 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who have found their dream jobs
            through our guild-validated talent marketplace.
          </p>
          <button
            onClick={() => router.push("/browse/jobs")}
            className="px-8 py-4 bg-card text-violet-600 rounded-xl hover:bg-muted transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Explore All Opportunities
          </button>
        </div>
      </div>
    </div>
  );
}
