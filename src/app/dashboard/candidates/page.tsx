"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Users,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  User,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  jobTitle: string;
  appliedDate: string;
  status: "pending" | "reviewing" | "accepted" | "rejected";
  experience?: string;
  guildMembership?: string;
}

export default function CandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
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

    fetchCandidates();
  }, [router]);

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`http://localhost:4000/api/companies/candidates`);
      // const data = await response.json();

      // Mock data for now
      const mockCandidates: Candidate[] = [
        {
          id: "1",
          fullName: "Alice Johnson",
          email: "alice.johnson@email.com",
          phone: "+1 (555) 123-4567",
          location: "San Francisco, CA",
          jobTitle: "Senior Software Engineer",
          appliedDate: "2024-01-15",
          status: "reviewing",
          experience: "5 years",
          guildMembership: "Engineering Guild",
        },
        {
          id: "2",
          fullName: "Bob Smith",
          email: "bob.smith@email.com",
          phone: "+1 (555) 234-5678",
          location: "New York, NY",
          jobTitle: "Product Designer",
          appliedDate: "2024-01-14",
          status: "pending",
          experience: "3 years",
          guildMembership: "Design Guild",
        },
        {
          id: "3",
          fullName: "Carol Williams",
          email: "carol.w@email.com",
          location: "Austin, TX",
          jobTitle: "Marketing Manager",
          appliedDate: "2024-01-13",
          status: "accepted",
          experience: "7 years",
          guildMembership: "Marketing Guild",
        },
        {
          id: "4",
          fullName: "David Brown",
          email: "david.brown@email.com",
          phone: "+1 (555) 345-6789",
          location: "Seattle, WA",
          jobTitle: "Senior Software Engineer",
          appliedDate: "2024-01-12",
          status: "rejected",
          experience: "4 years",
          guildMembership: "Engineering Guild",
        },
      ];

      setCandidates(mockCandidates);
    } catch (error) {
      console.error("Error fetching candidates:", error);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "reviewing":
        return <Eye className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      reviewing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterStatus === "all" || candidate.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

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
                  className="text-foreground font-medium hover:text-primary transition-colors"
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
            <h1 className="text-3xl font-bold text-foreground">Candidates</h1>
          </div>
          <p className="text-muted-foreground">View and manage all candidate applications</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Candidates</p>
                <p className="text-2xl font-bold text-foreground">{candidates.length}</p>
              </div>
              <Users className="w-10 h-10 text-primary/20" />
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending Review</p>
                <p className="text-2xl font-bold text-foreground">
                  {candidates.filter(c => c.status === "pending").length}
                </p>
              </div>
              <Clock className="w-10 h-10 text-yellow-600/20" />
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Accepted</p>
                <p className="text-2xl font-bold text-foreground">
                  {candidates.filter(c => c.status === "accepted").length}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600/20" />
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">In Review</p>
                <p className="text-2xl font-bold text-foreground">
                  {candidates.filter(c => c.status === "reviewing").length}
                </p>
              </div>
              <Eye className="w-10 h-10 text-blue-600/20" />
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-card p-6 rounded-xl border border-border mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search candidates by name, email, or job title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Candidates List */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading candidates...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="bg-card p-12 rounded-xl border border-border text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-foreground mb-2">No candidates found</p>
            <p className="text-muted-foreground">
              {searchQuery || filterStatus !== "all"
                ? "Try adjusting your search or filters"
                : "Candidates will appear here once they apply to your job postings"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="bg-card p-6 rounded-xl border border-border hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => {
                  // TODO: Navigate to candidate detail page
                  console.log("View candidate:", candidate.id);
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {candidate.fullName.charAt(0)}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {candidate.fullName}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">{candidate.jobTitle}</p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {candidate.email}
                        </div>
                        {candidate.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {candidate.phone}
                          </div>
                        )}
                        {candidate.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {candidate.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(candidate.status)}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(candidate.appliedDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {candidate.experience || candidate.guildMembership ? (
                  <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
                    {candidate.experience && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Briefcase className="w-4 h-4" />
                        <span>{candidate.experience} experience</span>
                      </div>
                    )}
                    {candidate.guildMembership && (
                      <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        {candidate.guildMembership}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
