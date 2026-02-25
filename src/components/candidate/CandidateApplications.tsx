"use client";

import { useRouter } from "next/navigation";
import {
  Loader2,
  Send,
  Clock,
  Eye,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Briefcase,
  Building2,
  MapPin,
  DollarSign,
  Calendar,
} from "lucide-react";
import { applicationsApi } from "@/lib/api";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useFetch } from "@/lib/hooks/useFetch";
import { Pagination } from "@/components/ui/pagination";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import type { CandidateApplication } from "@/types";
import { formatSalaryRange } from "@/lib/utils";

export default function CandidateApplications() {
  const router = useRouter();
  const { ready } = useRequireAuth("candidate");

  const { data: applicationsData, isLoading } = useFetch(
    () => applicationsApi.getAll(),
    { skip: !ready }
  );

  const applications: CandidateApplication[] = applicationsData?.applications || [];

  const {
    paginatedItems: paginatedApplications,
    currentPage,
    totalPages,
    setCurrentPage,
  } = useClientPagination(applications, 10);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "reviewing":
        return <Eye className="w-4 h-4" />;
      case "interviewed":
        return <TrendingUp className="w-4 h-4" />;
      case "accepted":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (!ready) return null;

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Applications</h1>
          <p className="text-muted-foreground">
            {applications.length} application{applications.length !== 1 ? "s" : ""} submitted
          </p>
        </div>

        {applications.length === 0 ? (
          <div className="bg-card rounded-xl shadow-sm p-12 text-center">
            <Send className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No applications yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Start applying to jobs to see them here
            </p>
            <button
              onClick={() => router.push("/browse/jobs")}
              className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-gray-900 dark:text-gray-900 rounded-lg hover:opacity-90 transition-all"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedApplications.map((application) => (
              <div
                key={application.id}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {application.job.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {application.job.companyName && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {application.job.companyName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {application.job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {application.job.type}
                      </span>
                      {application.job.salary && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {formatSalaryRange(application.job.salary)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 ${(APPLICATION_STATUS_CONFIG[application.status] || APPLICATION_STATUS_CONFIG.pending).className}`}
                  >
                    {getStatusIcon(application.status)}
                    {(APPLICATION_STATUS_CONFIG[application.status] || APPLICATION_STATUS_CONFIG.pending).label}
                  </span>
                </div>

                {application.job.skills && application.job.skills.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-card-foreground uppercase tracking-wide">
                        Skills Required
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {application.job.skills.slice(0, 6).map((skill, index) => (
                        <span
                          key={index}
                          className="px-2.5 py-1 bg-muted text-card-foreground rounded-md text-xs font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                      {application.job.skills.length > 6 && (
                        <span className="px-2.5 py-1 text-muted-foreground text-xs font-medium">
                          +{application.job.skills.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Applied on{" "}
                    {new Date(application.appliedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <button
                    onClick={() => router.push(`/browse/jobs/${application.job.id}`)}
                    className="text-sm text-primary hover:text-primary font-medium"
                  >
                    View Job →
                  </button>
                </div>
              </div>
            ))}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
