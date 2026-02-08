"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffect, useState, ReactElement } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import {
  ArrowLeft,
  Search,
  Filter,
  MapPin,
  DollarSign,
  Briefcase,
  Building2,
  ChevronDown,
  X,
  Menu,
  User,
  LogOut,
  CheckCircle2,
  Clock,
  Star,
  Shield,
  Wallet,
  Award,
  Swords,
} from "lucide-react";
import { jobsApi, applicationsApi, getAssetUrl } from "@/lib/api";
import { Modal } from "@/components/ui/modal";

interface Job {
  id: string;
  title: string;
  department: string | null;
  location: string;
  locationType: "remote" | "onsite" | "hybrid";
  type: "Full-time" | "Part-time" | "Contract" | "Freelance";
  salary: { min: number | null; max: number | null; currency: string };
  guild: string;
  description: string;
  requirements: string[];
  skills: string[];
  experienceLevel?: string;
  companyName?: string;
  companyLogo?: string;
  createdAt: string;
  featured?: boolean;
}

// Helper function to calculate time ago
const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Posted today";
  if (diffInDays === 1) return "Posted 1 day ago";
  if (diffInDays < 7) return `Posted ${diffInDays} days ago`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `Posted ${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }
  const months = Math.floor(diffInDays / 30);
  return `Posted ${months} ${months === 1 ? "month" : "months"} ago`;
};

// Wallet information helper
const getWalletInfo = (walletName: string) => {
  const wallets: Record<string, { icon: ReactElement; description: string }> = {
    MetaMask: {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
          <path d="M36.5 3.5L22 13.5L24.5 7.5L36.5 3.5Z" fill="#E17726" stroke="#E17726" />
          <path d="M3.5 3.5L17.8 13.6L15.5 7.5L3.5 3.5Z" fill="#E27625" stroke="#E27625" />
        </svg>
      ),
      description: "Connect using MetaMask browser extension",
    },
    "Coinbase Wallet": {
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="8" fill="#0052FF" />
        </svg>
      ),
      description: "Connect using Coinbase Wallet app",
    },
  };

  return (
    wallets[walletName] || {
      icon: <Wallet className="w-6 h-6 text-primary" />,
      description: "Connect with your wallet",
    }
  );
};

export default function JobsListingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGuilds, setSelectedGuilds] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [selectedLocationTypes, setSelectedLocationTypes] = useState<string[]>(
    [],
  );
  const [candidateEmail, setCandidateEmail] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const JOBS_PER_PAGE = 5;

  // Get unique guilds from actual jobs data
  const allGuilds = Array.from(
    new Set(
      jobs
        .map((job) => job.guild?.replace(/ Guild$/i, ''))
        .filter(Boolean)
    )
  ).sort();

  const visibleGuilds = allGuilds.slice(0, 6);

  const jobTypes = ["Full-time", "Part-time", "Contract", "Freelance"];
  const locationTypes = ["Remote", "Onsite", "Hybrid"];

  const [locationQuery, setLocationQuery] = useState("");
  const [showGuildModal, setShowGuildModal] = useState(false);
  const [showAllGuildsModal, setShowAllGuildsModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      setIsAuthenticated(true);
      const email = localStorage.getItem("candidateEmail");
      if (email) setCandidateEmail(email);
    }
  }, []);

  // Fetch candidate's applications if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchApplications = async () => {
      try {
        const data: any = await applicationsApi.getAll();
        const applications = data?.applications || [];
        const jobIds = new Set<string>(applications.map((app: { jobId: string }) => app.jobId));
        setAppliedJobIds(jobIds);
        console.log("Applied to job IDs:", Array.from(jobIds));
      } catch (error) {
        console.error("Failed to fetch applications:", error);
      }
    };

    fetchApplications();
  }, [isAuthenticated]);

  const handleWalletConnect = async (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      try {
        await connect({ connector });
        setShowWalletModal(false);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    }
  };

  const handleDisconnect = () => {
    disconnect();
    router.push("/?section=jobseekers");
  };

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
    const fetchJobs = async () => {
      setIsLoading(true);
      try {
        const data: any = await jobsApi.getAll({ status: 'active' });
        // Ensure all jobs have required fields with defaults
        const normalizedJobs = data.map((job: Record<string, unknown>) => ({
          ...job,
          title: job.title || 'Untitled Position',
          description: job.description || '',
          guild: job.guild || '',
          department: job.department || null,
          requirements: job.requirements || [],
          skills: job.skills || [],
          screeningQuestions: job.screeningQuestions || [],
        }));
        setJobs(normalizedJobs);
        setFilteredJobs(normalizedJobs);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, []);

  useEffect(() => {
    let filtered = jobs;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          (job.title && job.title.toLowerCase().includes(query)) ||
          (job.description && job.description.toLowerCase().includes(query)) ||
          (job.guild && job.guild.toLowerCase().includes(query)) ||
          (job.department && job.department.toLowerCase().includes(query)) ||
          (job.companyName && job.companyName.toLowerCase().includes(query)),
      );
    }

    // Filter by location
    if (locationQuery) {
      const query = locationQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          (job.location && job.location.toLowerCase().includes(query)) ||
          (job.locationType && job.locationType.toLowerCase().includes(query)),
      );
    }

    // Filter by guilds
    if (selectedGuilds.length > 0) {
      filtered = filtered.filter((job) => {
        if (!job.guild) return false;
        // Match guild name with or without " Guild" suffix
        const jobGuild = job.guild.replace(/ Guild$/i, '');
        return selectedGuilds.some(selectedGuild => {
          const cleanSelected = selectedGuild.replace(/ Guild$/i, '');
          return jobGuild.toLowerCase() === cleanSelected.toLowerCase();
        });
      });
    }

    // Filter by job types
    if (selectedJobTypes.length > 0) {
      filtered = filtered.filter((job) => job.type && selectedJobTypes.includes(job.type));
    }

    // Filter by location types (case-insensitive)
    if (selectedLocationTypes.length > 0) {
      filtered = filtered.filter((job) =>
        job.locationType && selectedLocationTypes.some(
          type => type.toLowerCase() === job.locationType.toLowerCase()
        ),
      );
    }

    setFilteredJobs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchQuery, locationQuery, selectedGuilds, selectedJobTypes, selectedLocationTypes, jobs]);

  const toggleFilter = (
    filterArray: string[],
    setFilter: (filters: string[]) => void,
    value: string,
  ) => {
    if (filterArray.includes(value)) {
      setFilter(filterArray.filter((item) => item !== value));
    } else {
      setFilter([...filterArray, value]);
    }
  };

  const clearAllFilters = () => {
    setSelectedGuilds([]);
    setSelectedJobTypes([]);
    setSelectedLocationTypes([]);
    setSearchQuery("");
    setLocationQuery("");
  };

  const activeFilterCount =
    selectedGuilds.length +
    selectedJobTypes.length +
    selectedLocationTypes.length;

  const toggleGuild = (guild: string) => {
    if (selectedGuilds.includes(guild)) {
      setSelectedGuilds(selectedGuilds.filter((g) => g !== guild));
    } else {
      setSelectedGuilds([...selectedGuilds, guild]);
    }
  };

  const toggleJobType = (type: string) => {
    if (selectedJobTypes.includes(type)) {
      setSelectedJobTypes(selectedJobTypes.filter((t) => t !== type));
    } else {
      setSelectedJobTypes([...selectedJobTypes, type]);
    }
  };

  const toggleLocationType = (type: string) => {
    if (selectedLocationTypes.includes(type)) {
      setSelectedLocationTypes(selectedLocationTypes.filter((t) => t !== type));
    } else {
      setSelectedLocationTypes([...selectedLocationTypes, type]);
    }
  };

  const selectAllGuilds = () => {
    setSelectedGuilds([...allGuilds]);
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredJobs.length / JOBS_PER_PAGE);
  const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
  const endIndex = startIndex + JOBS_PER_PAGE;
  const currentJobs = filteredJobs.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => router.push("/")}
                className="flex items-center space-x-2"
              >
                <Image src="/Vetted-orange.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
                <span className="text-xl font-bold text-foreground">Vetted</span>
              </button>

              {/* Navigation Links */}
              <div className="hidden md:flex items-center space-x-1">
                <button
                  onClick={() => router.push("/browse/jobs")}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 transition-all"
                >
                  <Briefcase className="w-4 h-4" />
                  Find Jobs
                </button>
                <button
                  onClick={() => router.push("/expert/apply")}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <Award className="w-4 h-4" />
                  Start Vetting
                </button>
                <button
                  onClick={() => router.push("/auth/signup?type=company")}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <Briefcase className="w-4 h-4" />
                  Start Hiring
                </button>
                <button
                  onClick={() => router.push("/guilds")}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <Swords className="w-4 h-4" />
                  Guilds
                </button>
              </div>
            </div>

            {/* User Account Menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:block">
                <ThemeToggle />
              </div>
              {isAuthenticated ? (
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <User className="w-4 h-4 text-primary" />
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
                        className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
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
                  className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary via-accent to-primary/80 rounded-lg hover:opacity-90 transition-all"
                >
                  Sign In
                </button>
              )}
              <button
                onClick={() => {
                  setShowMobileMenu((prev) => !prev);
                  setShowUserMenu(false);
                }}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-card p-2 text-foreground hover:bg-muted transition-colors sm:hidden"
                aria-label="Toggle menu"
              >
                {showMobileMenu ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Menu className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
        {showMobileMenu && (
          <div className="sm:hidden border-t border-border bg-card/95 backdrop-blur">
            <div className="px-4 py-3 space-y-2">
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  router.push("/browse/jobs");
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Briefcase className="w-4 h-4 text-primary" />
                Find Jobs
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  router.push("/expert/apply");
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Award className="w-4 h-4 text-primary" />
                Start Vetting
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  router.push("/auth/signup?type=company");
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Briefcase className="w-4 h-4 text-primary" />
                Start Hiring
              </button>
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  router.push("/guilds");
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Swords className="w-4 h-4 text-primary" />
                Guilds
              </button>
              <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-muted/40">
                <span className="text-sm text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      router.push("/candidate/profile");
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <User className="w-4 h-4 text-primary" />
                    My Dashboard
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => router.push("/auth/login?type=candidate")}
                  className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-primary via-accent to-primary/80 hover:opacity-90 transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Two-Column Search Bar */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Role/Keywords Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Role, company, or keywords"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Location Search */}
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Where?"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-card text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Guild Filter Chips */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            {visibleGuilds.map((guild) => (
              <button
                key={guild}
                onClick={() => toggleGuild(guild)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedGuilds.includes(guild)
                    ? "bg-primary text-white shadow-sm"
                    : "bg-card text-card-foreground border border-border hover:border-primary hover:text-primary"
                }`}
              >
                {guild}
              </button>
            ))}
            <button
              onClick={() => setShowAllGuildsModal(true)}
              className="px-4 py-2 rounded-full text-sm font-medium text-primary hover:bg-primary/10 transition-all flex items-center gap-1"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>
            {(selectedGuilds.length > 0 || selectedJobTypes.length > 0 || selectedLocationTypes.length > 0) && (
              <button
                onClick={() => {
                  setSelectedGuilds([]);
                  setSelectedJobTypes([]);
                  setSelectedLocationTypes([]);
                }}
                className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-destructive transition-all flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Jobs List - Full Width */}
        <div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading jobs...</p>
            </div>
          ) : filteredJobs.length > 0 ? (
            <>
              <div className="space-y-3">
                {currentJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => router.push(`/browse/jobs/${job.id}`)}
                    className="bg-card rounded-lg p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-border hover:border-primary/30 group relative"
                  >
                    {/* Posted Date - Top Right Corner */}
                    <div className="absolute top-4 right-5 text-xs text-muted-foreground">
                      {getTimeAgo(job.createdAt)}
                    </div>

                    <div className="flex gap-5">
                      {/* Company Logo - Left Side */}
                      <div className="flex-shrink-0">
                        {job.companyLogo ? (
                          <img
                            src={getAssetUrl(job.companyLogo)}
                            alt={job.companyName || "Company"}
                            className="w-16 h-16 rounded-lg object-cover border border-border"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center ${job.companyLogo ? 'hidden' : 'flex'}`}
                        >
                          <Building2 className="w-8 h-8 text-primary" />
                        </div>
                      </div>

                      {/* Job Content */}
                      <div className="flex-1 min-w-0">
                        {/* Job Title and Featured Badge */}
                        <div className="flex items-start gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                                {job.title}
                              </h3>
                              {job.featured && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded text-xs font-bold">
                                  <Star className="w-3 h-3 fill-white" />
                                  FEATURED
                                </span>
                              )}
                              {isAuthenticated && appliedJobIds.has(job.id) && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Applied
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Company Name and Location on same line */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mb-3">
                          {job.companyName && (
                            <span className="font-medium text-foreground">
                              {job.companyName}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5" />
                            {job.location}
                            {job.locationType && job.locationType.toLowerCase() !== job.location.toLowerCase() && (
                              <span className="capitalize"> • {job.locationType}</span>
                            )}
                          </span>
                        </div>

                        {/* Tags: Guild, Job Type, Salary */}
                        <div className="flex flex-wrap items-center gap-2">
                          {job.guild && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const cleanGuildName = job.guild.replace(/ Guild$/i, '');
                                router.push(`/guilds/${cleanGuildName}`);
                              }}
                              className="px-2.5 py-1 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 rounded text-xs font-medium hover:bg-primary/20 transition-colors"
                            >
                              {job.guild}
                            </button>
                          )}
                          <span className="px-2.5 py-1 bg-muted text-card-foreground rounded text-xs font-medium">
                            {job.type}
                          </span>
                          {job.salary.min && job.salary.max && (
                            <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                              ${job.salary.min / 1000}k - ${job.salary.max / 1000}k {job.salary.currency}
                            </span>
                          )}
                          {job.experienceLevel && (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium capitalize">
                              {job.experienceLevel}
                            </span>
                          )}
                        </div>

                        {/* Skills */}
                        {job.skills && job.skills.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="flex flex-wrap gap-1.5">
                              {job.skills.slice(0, 5).map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-0.5 bg-muted/50 text-card-foreground rounded text-xs"
                                >
                                  {skill}
                                </span>
                              ))}
                              {job.skills.length > 5 && (
                                <span className="px-2 py-0.5 text-muted-foreground text-xs">
                                  +{job.skills.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-foreground" />
                    <span className="text-sm font-medium text-foreground">Previous</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Page <span className="font-semibold text-foreground">{currentPage}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
                    </span>
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="text-sm font-medium text-foreground">Next</span>
                    <ArrowLeft className="w-4 h-4 text-foreground rotate-180" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-card rounded-xl">
              <Briefcase className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No jobs found
              </h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search query
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-primary hover:text-primary font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Wallet Connection Modal */}
      <Modal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        title="Connect Your Wallet"
      >
        <p className="text-muted-foreground mb-6">
          Choose your preferred wallet to get started
        </p>
        {connectors.map((connector) => {
          const walletInfo = getWalletInfo(connector.name);
          return (
            <button
              key={connector.id}
              onClick={() => handleWalletConnect(connector.id)}
              className="w-full flex items-center gap-4 p-4 bg-card hover:bg-muted rounded-lg border border-border hover:border-primary transition-all mb-3"
            >
              {walletInfo.icon}
              <div className="text-left">
                <p className="font-semibold text-card-foreground">{connector.name}</p>
                <p className="text-xs text-muted-foreground">{walletInfo.description}</p>
              </div>
            </button>
          );
        })}
      </Modal>

      {/* Guild Selection Modal (Other button) */}
      <Modal
        isOpen={showGuildModal}
        onClose={() => setShowGuildModal(false)}
        title="Select Additional Guilds"
      >
        <p className="text-muted-foreground mb-4">
          Choose additional guild categories to filter jobs
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
          {allGuilds
            .filter((guild) => !visibleGuilds.includes(guild))
            .map((guild) => (
              <button
                key={guild}
                onClick={() => {
                  toggleGuild(guild);
                }}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                  selectedGuilds.includes(guild)
                    ? "bg-primary text-white"
                    : "bg-card text-card-foreground border border-border hover:border-primary hover:text-primary"
                }`}
              >
                {guild}
              </button>
            ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <button
            onClick={() => setShowGuildModal(false)}
            className="w-full px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Filter Modal */}
      <Modal
        isOpen={showAllGuildsModal}
        onClose={() => setShowAllGuildsModal(false)}
        title="Filter Jobs"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Guilds Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Guilds</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allGuilds.map((guild) => (
                <button
                  key={guild}
                  onClick={() => toggleGuild(guild)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                    selectedGuilds.includes(guild)
                      ? "bg-primary text-white"
                      : "bg-card text-card-foreground border border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {guild}
                </button>
              ))}
            </div>
          </div>

          {/* Job Types Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Job Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {jobTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleJobType(type)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                    selectedJobTypes.includes(type)
                      ? "bg-primary text-white"
                      : "bg-card text-card-foreground border border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Location Types Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Work Location</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {locationTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleLocationType(type)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                    selectedLocationTypes.includes(type)
                      ? "bg-primary text-white"
                      : "bg-card text-card-foreground border border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              setSelectedGuilds([]);
              setSelectedJobTypes([]);
              setSelectedLocationTypes([]);
            }}
            className="flex-1 px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={() => setShowAllGuildsModal(false)}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Apply Filters
          </button>
        </div>
      </Modal>
    </div>
  );
}
