"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Filter,
  Mail,
  Phone,
  Briefcase,
  Eye,
  CheckCircle,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { companyApi, applicationsApi } from "@/lib/api";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import type { CompanyApplication } from "@/types";

interface GroupedCandidate {
  candidate: CompanyApplication["candidate"];
  applications: CompanyApplication[];
}

export default function CandidatesPage() {
  const router = useRouter();
  const [groupedCandidates, setGroupedCandidates] = useState<GroupedCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] = useState<CompanyApplication | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const auth = useAuthContext();

  useEffect(() => {
    if (!auth.isAuthenticated || auth.userType !== "company") {
      router.push("/auth/login?type=company");
      return;
    }
    fetchApplications();
  }, [auth.isAuthenticated, auth.userType, router]);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const data = await companyApi.getApplications({ limit: 500 });

      // Group by candidate
      const grouped = (data.applications || []).reduce((acc: GroupedCandidate[], app: CompanyApplication) => {
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

  return (
    <div className="min-h-full">
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
                  <a
                    href={selectedApplication.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    View Resume
                  </a>
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
