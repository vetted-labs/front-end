"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { candidateApi, jobsApi, applicationsApi, guildsApi } from "@/lib/api";
import {
  ArrowLeft,
  DollarSign,
  MapPin,
  Send,
  Shield,
  TrendingUp,
  CheckCircle2,
  ClipboardList,
  Clock,
  AlertCircle,
  Trophy,
  Loader2,
} from "lucide-react";
import { Button, Alert } from "@/components/ui";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import { STATUS_COLORS } from "@/config/colors";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useGuilds } from "@/lib/hooks/useGuilds";
import { useFetch } from "@/lib/hooks/useFetch";
import { formatSalaryRange } from "@/lib/utils";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import JobHeader from "./JobHeader";
import JobRequirements from "./JobRequirements";
import JobApplicationModal from "./JobApplicationModal";
import type { Job, CandidateApplication, CandidateUserProfile, SocialLink } from "@/types";

export default function JobDetailView() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuthContext();
  const { resolveGuildId } = useGuilds();
  const jobId = params.jobId as string | undefined;
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [existingApplication, setExistingApplication] = useState<CandidateApplication | null>(null);
  const [isGuildMember, setIsGuildMember] = useState(false);
  const [guildMembershipStatus, setGuildMembershipStatus] = useState<
    "approved" | "pending" | "not_member" | "unknown"
  >("unknown");

  const isAuthenticated = auth.isAuthenticated;

  // Fetch job details
  const {
    data: job,
    isLoading,
    error,
  } = useFetch<Job>(
    () =>
      jobsApi.getById(jobId!).then((data) => {
        // Track session views
        const viewedJobsKey = "viewedJobs";
        const viewedJobsStr = sessionStorage.getItem(viewedJobsKey) || "[]";
        const viewedJobs = JSON.parse(viewedJobsStr) as string[];
        if (!viewedJobs.includes(jobId!)) {
          sessionStorage.setItem(viewedJobsKey, JSON.stringify([...viewedJobs, jobId!]));
        }

        return {
          id: data.id,
          title: data.title || "Untitled Position",
          description: data.description || "",
          requirements: data.requirements || [],
          skills: data.skills || [],
          screeningQuestions: data.screeningQuestions || [],
          department: data.department || null,
          location: data.location,
          locationType: (data.locationType || "remote") as Job["locationType"],
          type: data.type,
          experienceLevel: (data.experienceLevel || null) as Job["experienceLevel"],
          salary: data.salary || { min: null, max: null, currency: "USD" },
          equityOffered: data.equityOffered || null,
          equityRange: data.equityRange || null,
          status: (data.status || "active") as Job["status"],
          guild: data.guild || "",
          applicants: data.applicants || 0,
          views: data.views || 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt || data.createdAt,
          publishedAt: data.publishedAt || null,
          companyId: data.companyId || "",
          companyName: data.companyName,
          companyLogo: data.companyLogo,
          featured: data.featured,
        };
      }),
    { skip: !jobId }
  );

  // Fetch user profile to get existing resume, bio, and social links
  const { data: profileResume } = useFetch<CandidateUserProfile | null>(
    () =>
      candidateApi.getById(auth.userId as string).then((data) => ({
        resumeUrl: data.resumeUrl,
        resumeFileName: data.resumeFileName || "Your Profile Resume",
        bio: data.bio,
        socialLinks: data.socialLinks,
        linkedIn: data.linkedIn,
        github: data.github,
      })),
    {
      skip: !isAuthenticated,
      onError: (err) => {
        toast.error("Failed to fetch profile");
        logger.error("Failed to fetch profile", err, { silent: true });
      },
    }
  );

  // Check if user has already applied to this job
  const { isLoading: checkingApplication } = useFetch(
    () => applicationsApi.getAll(),
    {
      skip: !isAuthenticated || !jobId,
      onSuccess: (data) => {
        const applications = data?.applications || [];
        if (Array.isArray(applications) && applications.length > 0) {
          const existingApp = applications.find(
            (app) => String(app.jobId) === String(jobId)
          );
          if (existingApp) {
            setExistingApplication(existingApp);
          }
        }
      },
      onError: (err) => {
        toast.error("Failed to check applications");
        logger.error("Failed to check applications", err, { silent: true });
      },
    }
  );

  // Check guild membership after job is loaded
  const guildId = job?.guild?.trim();
  const isInvalidGuild = !guildId || guildId.length < 2 || !!guildId.match(/^[0-9]+Guild$/);
  const shouldCheckGuild =
    isAuthenticated && !!job && !!job.guild && !isInvalidGuild && !!auth.userId;

  const { isLoading: checkingGuildMembership } = useFetch(
    () => guildsApi.checkMembership(auth.userId as string, guildId!),
    {
      skip: !shouldCheckGuild,
      onSuccess: (membershipData) => {
        if (membershipData.isMember || membershipData.status === "approved") {
          setIsGuildMember(true);
          setGuildMembershipStatus("approved");
        } else if (membershipData.status === "pending") {
          setIsGuildMember(false);
          setGuildMembershipStatus("pending");
        } else {
          setIsGuildMember(false);
          setGuildMembershipStatus("not_member");
        }
      },
      onError: (err) => {
        logger.error("Error checking guild membership", err, { silent: true });
      },
    }
  );

  // Resolve social links from profile (prefer socialLinks array, fall back to legacy fields)
  const profileSocialLinks: SocialLink[] = (() => {
    if (!profileResume) return [];
    if (profileResume.socialLinks && profileResume.socialLinks.length > 0) {
      return profileResume.socialLinks.filter((l) => l.url.trim());
    }
    const legacy: SocialLink[] = [];
    if (profileResume.linkedIn)
      legacy.push({ platform: "linkedin", label: "LinkedIn", url: profileResume.linkedIn });
    if (profileResume.github)
      legacy.push({ platform: "github", label: "GitHub", url: profileResume.github });
    return legacy;
  })();

  const handleApply = () => {
    if (existingApplication) return;

    if (!auth.token) {
      const currentUrl = `/browse/jobs/${jobId}`;
      router.push(`/auth/login?type=candidate&redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }

    // Check guild membership before allowing application
    if (!isGuildMember) {
      if (job?.guild) {
        const guildUuid = resolveGuildId(job.guild);
        if (guildUuid) {
          router.push(`/guilds/${guildUuid}/apply?jobId=${job.id}`);
        }
      }
      return;
    }

    setShowApplyModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="min-h-screen min-h-full flex items-center justify-center">
        <Alert variant="error">Failed to load job details. {error}</Alert>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen min-h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground mb-4">Job not found</p>
          <Button onClick={() => router.push("/browse")}>Browse All Jobs</Button>
        </div>
      </div>
    );
  }

  const hasAlreadyApplied = !!existingApplication;

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push("/browse/jobs")}
          className="mb-6 flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Jobs
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-card/70 backdrop-blur-sm rounded-2xl shadow-sm p-5 sm:p-8 border border-border/60">
              <JobHeader job={job} />
              <JobRequirements job={job} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card/70 backdrop-blur-sm rounded-2xl shadow-sm p-6 space-y-6 lg:sticky lg:top-24 border border-border/60">
              {/* Already Applied / Accepted */}
              {hasAlreadyApplied && existingApplication.status === "accepted" && (
                <div className="relative overflow-hidden p-4 rounded-lg border-2 border-emerald-500/30 animate-celebrate-glow bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-emerald-500/10 animate-shimmer-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 text-lg">
                        Accepted!
                      </span>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        Congratulations on your offer
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                    You applied on{" "}
                    {new Date(existingApplication.appliedAt).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => router.push("/candidate/applications")}
                    className="text-sm text-primary hover:text-primary font-medium flex items-center gap-1"
                  >
                    <ClipboardList className="w-4 h-4" />
                    View My Applications &rarr;
                  </button>
                </div>
              )}
              {hasAlreadyApplied && existingApplication.status !== "accepted" && (
                <div className="p-4 bg-green-500/10 border-2 border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-green-900 dark:text-green-300">
                      Already Applied
                    </span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                    You applied on{" "}
                    {new Date(existingApplication.appliedAt).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-green-700 dark:text-green-300">
                      Status:
                    </span>
                    <span className={`inline-flex items-center rounded-full font-medium px-2 py-0.5 text-xs ${(APPLICATION_STATUS_CONFIG[existingApplication.status] ?? { className: "bg-muted text-muted-foreground" }).className}`}>
                      {(APPLICATION_STATUS_CONFIG[existingApplication.status] ?? { label: existingApplication.status }).label}
                    </span>
                  </div>
                  <button
                    onClick={() => router.push("/candidate/applications")}
                    className="text-sm text-primary hover:text-primary font-medium flex items-center gap-1"
                  >
                    <ClipboardList className="w-4 h-4" />
                    View My Applications &rarr;
                  </button>
                </div>
              )}

              {/* Invalid Guild Warning */}
              {job.guild &&
                (job.guild.match(/^[0-9]+Guild$/) || job.guild.length < 2) && (
                  <div className="p-4 bg-red-500/10 border-2 border-red-500/20 rounded-lg">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900 dark:text-red-300">
                          Invalid Guild Data
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                          This job has invalid guild information:{" "}
                          <code className="px-1 py-0.5 bg-red-100 dark:bg-red-900 rounded text-xs">
                            {job.guild}
                          </code>
                          <br />
                          Please contact the employer to fix this issue.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Guild Membership Status */}
              {isAuthenticated &&
                !checkingGuildMembership &&
                guildMembershipStatus === "not_member" &&
                job.guild &&
                !job.guild.match(/^[0-9]+Guild$/) &&
                job.guild.length >= 2 && (
                  <div className="p-4 bg-yellow-500/10 border-2 border-yellow-500/20 rounded-lg">
                    <div className="flex items-start gap-2 mb-2">
                      <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-yellow-900 dark:text-yellow-300">
                          Guild Membership Required
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                          You must join the <strong>{job.guild}</strong> guild to apply
                          for this position
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {isAuthenticated && guildMembershipStatus === "pending" && (
                <div className="p-4 bg-blue-500/10 border-2 border-blue-500/20 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-300">
                        Guild Application Pending
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        Your application to join <strong>{job.guild}</strong> is under
                        review by expert members
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Apply Button */}
              <div className="space-y-2">
                <Button
                  onClick={handleApply}
                  className="w-full"
                  size="lg"
                  disabled={
                    hasAlreadyApplied ||
                    checkingApplication ||
                    checkingGuildMembership ||
                    guildMembershipStatus === "pending"
                  }
                  isLoading={checkingApplication || checkingGuildMembership}
                  icon={
                    !checkingApplication &&
                    !checkingGuildMembership && <Send className="w-5 h-5" />
                  }
                >
                  {checkingApplication || checkingGuildMembership
                    ? "Checking..."
                    : hasAlreadyApplied
                      ? "Already Applied"
                      : !isAuthenticated
                        ? "Sign In to Apply"
                        : guildMembershipStatus === "not_member"
                          ? `Apply & Join ${job.guild}`
                          : guildMembershipStatus === "pending"
                            ? "Guild Application Pending"
                            : "Apply for this Role"}
                </Button>
                {hasAlreadyApplied && (
                  <p className="text-xs text-muted-foreground text-center">
                    You cannot apply to this position again
                  </p>
                )}
                {!isGuildMember &&
                  isAuthenticated &&
                  guildMembershipStatus === "not_member" && (
                    <p className="text-xs text-muted-foreground text-center">
                      Fill out a short application to join this guild
                    </p>
                  )}
              </div>

              {/* Job Details */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground mb-3">Job Details</h3>

                {job.salary?.min && job.salary?.max && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Salary Range</p>
                      <p className="text-sm text-muted-foreground">
                        {formatSalaryRange(job.salary)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Location Type</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {job.locationType}
                    </p>
                  </div>
                </div>

                {job.experienceLevel && (
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Experience Level
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {job.experienceLevel}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Guild</p>
                    <p className="text-sm text-muted-foreground">{job.guild}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {job && auth.userId && (
        <JobApplicationModal
          isOpen={showApplyModal}
          onClose={() => setShowApplyModal(false)}
          job={job}
          candidateId={auth.userId}
          profileResume={profileResume ?? null}
          profileSocialLinks={profileSocialLinks}
          onSubmitSuccess={(application) => setExistingApplication(application)}
        />
      )}
    </div>
  );
}
