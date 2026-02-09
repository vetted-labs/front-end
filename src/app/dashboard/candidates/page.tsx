"use client";
import { useEffect, useState, useMemo } from "react";
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
import { useDisconnect } from "wagmi";
import { ThemeToggle } from "@/components/ThemeToggle";
import { companyApi, applicationsApi } from "@/lib/api";
import { clearAllAuthState } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: "pending" | "reviewing" | "interviewed" | "accepted" | "rejected";
  appliedAt: string;
  coverLetter: string;
  resumeUrl: string;
  screeningAnswers?: string[];
  candidate: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    headline?: string;
    experienceLevel?: string;
    walletAddress?: string;
    linkedIn?: string;
    github?: string;
  };
  job: {
    id: string;
    title: string;
    location: string;
    type: string;
    guild: string;
    salary: any;
  };
}

interface GroupedCandidate {
  candidate: Application["candidate"];
  applications: Application[];
}

export default function CandidatesPage() {
  const router = useRouter();
  const [groupedCandidates, setGroupedCandidates] = useState<GroupedCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [companyEmail, setCompanyEmail] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { disconnect } = useDisconnect();
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  useEffect(() => {
    // Check authentication
    const companyId = localStorage.getItem("companyId");
    if (!companyId) {
      router.push("/auth/login?type=company");
      return;
    }
    const email = localStorage.getItem("companyEmail");
    if (email) setCompanyEmail(email);

    fetchApplications();
  }, [router]);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const data = await companyApi.getApplications({ limit: 500 });

      // Group by candidate
      const grouped = (data.applications || []).reduce((acc: GroupedCandidate[], app: Application) => {
        const existing = acc.find((g) => g.candidate.id === app.candidateId);
        if (existing) {
          existing.applications.push(app);
        } else {
          acc.push({
            candidate: app.candidate,
            applications: [app],
          });
        }
        return acc;
      }, []);

      setGroupedCandidates(grouped);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearAllAuthState();
    disconnect();
    router.push("/?section=employers");
  };

  const stats = useMemo(() => {
    const allApps = groupedCandidates.flatMap((g) => g.applications);
    return {
      total: groupedCandidates.length,
      pending: allApps.filter((a) => a.status === "pending").length,
      accepted: allApps.filter((a) => a.status === "accepted").length,
      reviewing: allApps.filter((a) => a.status === "reviewing").length,
    };
  }, [groupedCandidates]);

  const filteredCandidates = useMemo(() => {
    return groupedCandidates.filter((group) => {
      const matchesSearch =
        group.candidate.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.applications.some((app) =>
          app.job.title.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesFilter =
        filterStatus === "all" ||
        group.applications.some((app) => app.status === filterStatus);

      return matchesSearch && matchesFilter;
    });
  }, [groupedCandidates, searchQuery, filterStatus]);

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      reviewing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      interviewed: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

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
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <Users className="w-10 h-10 text-primary/20" />
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending Review</p>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-600/20" />
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Accepted</p>
                <p className="text-2xl font-bold text-foreground">{stats.accepted}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600/20" />
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">In Review</p>
                <p className="text-2xl font-bold text-foreground">{stats.reviewing}</p>
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
                <option value="interviewed">Interviewed</option>
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
            {filteredCandidates.map((group) => (
              <div
                key={group.candidate.id}
                className="bg-card p-6 rounded-xl border border-border hover:border-primary/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold text-lg">
                        {group.candidate.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {group.candidate.fullName}
                      </h3>
                      {group.candidate.headline && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {group.candidate.headline}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {group.candidate.email}
                        </div>
                        {group.candidate.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {group.candidate.phone}
                          </div>
                        )}
                        {group.candidate.experienceLevel && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {group.candidate.experienceLevel}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Badge variant="outline">
                      {group.applications.length}{" "}
                      {group.applications.length === 1 ? "Application" : "Applications"}
                    </Badge>
                  </div>
                </div>

                {/* Applications List */}
                <div className="space-y-2 border-t pt-4">
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Applications:</h4>
                  {group.applications.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => {
                        setSelectedApplication(app);
                        setShowApplicationModal(true);
                      }}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{app.job.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {app.job.location} • {app.job.type}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Applied {new Date(app.appliedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          app.status === "accepted"
                            ? "default"
                            : app.status === "rejected"
                              ? "destructive"
                              : app.status === "interviewed"
                                ? "secondary"
                                : "outline"
                        }
                      >
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {showApplicationModal && selectedApplication && (
        <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Candidate Info */}
              <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-primary">
                    {selectedApplication.candidate.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedApplication.candidate.fullName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedApplication.candidate.email}
                  </p>
                  {selectedApplication.candidate.headline && (
                    <p className="text-sm mt-1">{selectedApplication.candidate.headline}</p>
                  )}
                </div>
              </div>

              {/* Job Info */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-1">Applied for</h4>
                <p className="font-medium">{selectedApplication.job.title}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedApplication.job.location} • {selectedApplication.job.type}
                </p>
              </div>

              {/* Cover Letter */}
              <div>
                <h4 className="font-semibold mb-2">Cover Letter</h4>
                <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedApplication.coverLetter}
                </div>
              </div>

              {/* Resume */}
              {selectedApplication.resumeUrl && (
                <div>
                  <h4 className="font-semibold mb-2">Resume</h4>
                  <Button variant="outline" asChild>
                    <a
                      href={selectedApplication.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Resume
                    </a>
                  </Button>
                </div>
              )}

              {/* Screening Answers */}
              {selectedApplication.screeningAnswers &&
                selectedApplication.screeningAnswers.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Screening Answers</h4>
                    <div className="space-y-3">
                      {selectedApplication.screeningAnswers.map((answer: string, idx: number) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">Question {idx + 1}</p>
                          <p className="text-sm">{answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Status Update */}
              <div>
                <h4 className="font-semibold mb-2">Application Status</h4>
                <Select
                  value={selectedApplication.status}
                  onValueChange={async (newStatus) => {
                    try {
                      await applicationsApi.updateStatus(selectedApplication.id, newStatus);

                      // Update the applications in state
                      setGroupedCandidates((prev) =>
                        prev.map((group) => ({
                          ...group,
                          applications: group.applications.map((app) =>
                            app.id === selectedApplication.id
                              ? { ...app, status: newStatus as any }
                              : app
                          ),
                        }))
                      );

                      setSelectedApplication({
                        ...selectedApplication,
                        status: newStatus as any,
                      });
                    } catch (error) {
                      console.error("Error updating status:", error);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="interviewed">Interviewed</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApplicationModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
