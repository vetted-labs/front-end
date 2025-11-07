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
  User,
  LogOut,
  CheckCircle2,
  Clock,
  Star,
  Shield,
  Wallet,
} from "lucide-react";
import { jobsApi, applicationsApi, getAssetUrl } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

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
      icon: <Wallet className="w-6 h-6 text-violet-600" />,
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
  const [showFilters, setShowFilters] = useState(true);
  const [candidateEmail, setCandidateEmail] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  const guilds = [
    "Engineering Guild",
    "Product Guild",
    "Design Guild",
    "Marketing Guild",
    "Operations Guild",
    "Sales Guild",
  ];

  const jobTypes = ["Full-time", "Part-time", "Contract", "Freelance"];
  const locationTypes = ["remote", "onsite", "hybrid"];

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
          (job.department && job.department.toLowerCase().includes(query)),
      );
    }

    // Filter by guilds
    if (selectedGuilds.length > 0) {
      filtered = filtered.filter((job) => job.guild && selectedGuilds.includes(job.guild));
    }

    // Filter by job types
    if (selectedJobTypes.length > 0) {
      filtered = filtered.filter((job) => job.type && selectedJobTypes.includes(job.type));
    }

    // Filter by location types
    if (selectedLocationTypes.length > 0) {
      filtered = filtered.filter((job) =>
        job.locationType && selectedLocationTypes.includes(job.locationType),
      );
    }

    setFilteredJobs(filtered);
  }, [searchQuery, selectedGuilds, selectedJobTypes, selectedLocationTypes, jobs]);

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
  };

  const activeFilterCount =
    selectedGuilds.length +
    selectedJobTypes.length +
    selectedLocationTypes.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push("/")}
              className="flex items-center space-x-2"
            >
              <Image src="/Vetted.png" alt="Vetted Logo" width={32} height={32} className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-foreground">Vetted</span>
            </button>

            {/* User Account Menu */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="p-2 bg-violet-100 rounded-lg">
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
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary to-indigo-600 rounded-lg hover:opacity-90 transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Find Your Next Opportunity
          </h1>
          <p className="text-muted-foreground">
            Explore {filteredJobs.length} open positions in the Web3 ecosystem
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search jobs by title, description, or guild..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-card"
            />
          </div>
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div
            className={`${showFilters ? "w-72" : "w-0"} transition-all duration-300 flex-shrink-0`}
          >
            {showFilters && (
              <div className="bg-card rounded-xl shadow-sm p-6 sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="px-2 py-0.5 bg-violet-100 text-primary rounded-full text-xs">
                        {activeFilterCount}
                      </span>
                    )}
                  </h3>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-primary hover:text-primary"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Guild Filter */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-foreground mb-3">
                    Guilds
                  </h4>
                  <div className="space-y-2">
                    {guilds.map((guild) => (
                      <label
                        key={guild}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGuilds.includes(guild)}
                          onChange={() =>
                            toggleFilter(
                              selectedGuilds,
                              setSelectedGuilds,
                              guild,
                            )
                          }
                          className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                        />
                        <span className="text-sm text-card-foreground group-hover:text-foreground">
                          {guild}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Job Type Filter */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-foreground mb-3">
                    Job Type
                  </h4>
                  <div className="space-y-2">
                    {jobTypes.map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={selectedJobTypes.includes(type)}
                          onChange={() =>
                            toggleFilter(
                              selectedJobTypes,
                              setSelectedJobTypes,
                              type,
                            )
                          }
                          className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                        />
                        <span className="text-sm text-card-foreground group-hover:text-foreground">
                          {type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Location Type Filter */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-foreground mb-3">
                    Location Type
                  </h4>
                  <div className="space-y-2">
                    {locationTypes.map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLocationTypes.includes(type)}
                          onChange={() =>
                            toggleFilter(
                              selectedLocationTypes,
                              setSelectedLocationTypes,
                              type,
                            )
                          }
                          className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                        />
                        <span className="text-sm text-card-foreground group-hover:text-foreground capitalize">
                          {type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Jobs List */}
          <div className="flex-1">
            {/* Toggle Filters Button (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="mb-4 md:hidden flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? "Hide" : "Show"} Filters
            </button>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading jobs...</p>
              </div>
            ) : filteredJobs.length > 0 ? (
              <div className="space-y-4">
                {filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => router.push(`/browse/jobs/${job.id}`)}
                    className="bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer border border-border hover:border-primary/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-semibold text-foreground hover:text-primary transition-colors">
                            {job.title}
                          </h3>
                          {isAuthenticated && appliedJobIds.has(job.id) && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Applied
                            </span>
                          )}
                        </div>

                        {/* Company & Location */}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                          {job.companyName && (
                            <span className="flex items-center gap-1.5 font-medium">
                              <Building2 className="w-4 h-4" />
                              {job.companyName}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {getTimeAgo(job.createdAt)}
                          </span>
                          {job.featured && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full text-xs font-bold">
                              <Star className="w-3 h-3 fill-white" />
                              FEATURED
                            </span>
                          )}
                        </div>

                        {/* Job Details */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {job.guild && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Clean guild name by removing " Guild" suffix
                                const cleanGuildName = job.guild.replace(/ Guild$/i, '');
                                router.push(`/guilds/${cleanGuildName}`);
                              }}
                              className="px-2.5 py-1 bg-violet-50 text-primary border border-violet-200 rounded-full text-xs font-semibold hover:bg-violet-100 transition-colors flex items-center gap-1"
                            >
                              <Shield className="w-3 h-3" />
                              {job.guild}
                            </button>
                          )}
                          {job.locationType && (
                            <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium capitalize">
                              {job.locationType}
                            </span>
                          )}
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                            {job.type}
                          </span>
                          {job.experienceLevel && (
                            <span className="px-2.5 py-1 bg-muted text-card-foreground rounded-full text-xs font-medium capitalize">
                              {job.experienceLevel}
                            </span>
                          )}
                          {job.salary.min && job.salary.max && (
                            <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5" />
                              {job.salary.min / 1000}k - {job.salary.max / 1000}k {job.salary.currency}
                            </span>
                          )}
                        </div>

                        {/* Skills */}
                        {job.skills && job.skills.length > 0 && (
                          <div className="border-t border-border pt-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-card-foreground uppercase tracking-wide">
                                Skills Required
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {job.skills.slice(0, 6).map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-2.5 py-1 bg-muted text-card-foreground rounded-md text-xs font-medium"
                                >
                                  {skill}
                                </span>
                              ))}
                              {job.skills.length > 6 && (
                                <span className="px-2.5 py-1 text-muted-foreground text-xs font-medium">
                                  +{job.skills.length - 6} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {job.companyLogo && (
                        <div className="flex items-center justify-center">
                          <img
                            src={getAssetUrl(job.companyLogo)}
                            alt={job.companyName}
                            className="w-20 h-20 rounded-lg object-cover border border-border shadow-sm flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-xl">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
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
    </div>
  );
}
