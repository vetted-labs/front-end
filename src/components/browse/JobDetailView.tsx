"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { candidateApi, jobsApi, applicationsApi, guildsApi } from "@/lib/api";
import {
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
  Briefcase,
  Code2,
  Globe,
  ArrowRight,
  Layers,
} from "lucide-react";
import { Button, Alert } from "@/components/ui";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import { STATUS_COLORS, getGuildBadgeColors } from "@/config/colors";
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
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="error">Failed to load job details. {error}</Alert>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground mb-4">Job not found</p>
          <Button onClick={() => router.push("/browse")}>Browse All Jobs</Button>
        </div>
      </div>
    );
  }

  const hasAlreadyApplied = !!existingApplication;
  const guildColors = job.guild ? getGuildBadgeColors(job.guild) : null;

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link href="/browse/jobs" className="hover:text-foreground transition-colors">
            Jobs
          </Link>
          <span className="opacity-30">/</span>
          {job.guild && (
            <>
              <span className="hover:text-foreground transition-colors cursor-default">
                {job.guild}
              </span>
              <span className="opacity-30">/</span>
            </>
          )}
          <span className="text-foreground/80 font-medium">{job.title}</span>
        </div>

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

          {/* ---- LEFT COLUMN ---- */}
          <div className="flex flex-col gap-6">
            {/* Job Header Card */}
            <div className="bg-card/70 backdrop-blur-xl rounded-[20px] border border-border/60 p-7 sm:p-9 transition-colors hover:border-border/80">
              <JobHeader job={job} />
            </div>

            {/* Job Description / Requirements / Skills / Screening */}
            <div className="bg-card/70 backdrop-blur-xl rounded-[20px] border border-border/60 p-7 sm:p-9 transition-colors hover:border-border/80">
              <JobRequirements job={job} />
            </div>
          </div>

          {/* ---- RIGHT COLUMN (sticky sidebar) ---- */}
          <div className="lg:sticky lg:top-6 flex flex-col gap-5">

            {/* Already Applied / Accepted */}
            {hasAlreadyApplied && existingApplication.status === "accepted" && (
              <div className={`relative overflow-hidden p-4 rounded-[20px] border-2 ${STATUS_COLORS.positive.border} animate-celebrate-glow ${STATUS_COLORS.positive.bgSubtle} animate-shimmer-border`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full ${STATUS_COLORS.positive.bg} flex items-center justify-center flex-shrink-0`}>
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className={`font-bold ${STATUS_COLORS.positive.text} text-xl`}>
                      Accepted!
                    </span>
                    <p className={`text-sm ${STATUS_COLORS.positive.text} opacity-80`}>
                      Congratulations on your offer
                    </p>
                  </div>
                </div>
                <p className={`text-sm ${STATUS_COLORS.positive.text} opacity-70 mb-3`}>
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
              <div className={`p-4 ${STATUS_COLORS.positive.bgSubtle} border-2 ${STATUS_COLORS.positive.border} rounded-[20px]`}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className={`w-5 h-5 ${STATUS_COLORS.positive.icon}`} />
                  <span className={`font-semibold ${STATUS_COLORS.positive.text}`}>
                    Already Applied
                  </span>
                </div>
                <p className={`text-sm ${STATUS_COLORS.positive.text} opacity-70 mb-3`}>
                  You applied on{" "}
                  {new Date(existingApplication.appliedAt).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-sm ${STATUS_COLORS.positive.text} opacity-70`}>
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

            {/* Apply Card */}
            <div className="bg-card/70 backdrop-blur-xl rounded-[20px] border border-border/60 overflow-hidden transition-colors hover:border-border/80">
              {/* Gradient top bar */}
              <div className="h-[3px] bg-gradient-to-r from-primary via-primary/80 to-warning bg-[length:200%_100%] animate-shimmer-bar" />

              <div className="p-6">
                {/* Salary display */}
                {job.salary?.min && job.salary?.max && (
                  <>
                    <div className="font-display text-3xl font-bold tracking-tight text-foreground mb-0.5">
                      {formatSalaryRange(job.salary)}
                    </div>
                    {job.equityOffered && (
                      <div className="flex items-center gap-1.5 text-sm text-primary font-medium mb-5">
                        <Layers className="w-3.5 h-3.5" />
                        + Equity {job.equityRange && `(${job.equityRange})`}
                      </div>
                    )}
                    {!job.equityOffered && <div className="mb-5" />}
                  </>
                )}

                {/* Invalid Guild Warning */}
                {job.guild &&
                  (job.guild.match(/^[0-9]+Guild$/) || job.guild.length < 2) && (
                    <div className={`p-3 mb-4 ${STATUS_COLORS.negative.bgSubtle} border ${STATUS_COLORS.negative.border} rounded-xl`}>
                      <div className="flex items-start gap-2">
                        <AlertCircle className={`w-4 h-4 ${STATUS_COLORS.negative.icon} flex-shrink-0 mt-0.5`} />
                        <div>
                          <p className={`text-sm font-semibold ${STATUS_COLORS.negative.text}`}>
                            Invalid Guild Data
                          </p>
                          <p className={`text-xs ${STATUS_COLORS.negative.text} opacity-70 mt-0.5`}>
                            This job has invalid guild information. Please contact the employer.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Guild Membership Warnings */}
                {isAuthenticated &&
                  !checkingGuildMembership &&
                  guildMembershipStatus === "not_member" &&
                  job.guild &&
                  !job.guild.match(/^[0-9]+Guild$/) &&
                  job.guild.length >= 2 && (
                    <div className={`p-3 mb-4 ${STATUS_COLORS.warning.bgSubtle} border ${STATUS_COLORS.warning.border} rounded-xl`}>
                      <div className="flex items-start gap-2">
                        <Shield className={`w-4 h-4 ${STATUS_COLORS.warning.icon} flex-shrink-0 mt-0.5`} />
                        <div>
                          <p className={`text-sm font-semibold ${STATUS_COLORS.warning.text}`}>
                            Guild Membership Required
                          </p>
                          <p className={`text-xs ${STATUS_COLORS.warning.text} opacity-70 mt-0.5`}>
                            You must join the <strong>{job.guild}</strong> guild to apply
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {isAuthenticated && guildMembershipStatus === "pending" && (
                  <div className={`p-3 mb-4 ${STATUS_COLORS.info.bgSubtle} border ${STATUS_COLORS.info.border} rounded-xl`}>
                    <div className="flex items-start gap-2">
                      <Clock className={`w-4 h-4 ${STATUS_COLORS.info.icon} flex-shrink-0 mt-0.5`} />
                      <div>
                        <p className={`text-sm font-semibold ${STATUS_COLORS.info.text}`}>
                          Guild Application Pending
                        </p>
                        <p className={`text-xs ${STATUS_COLORS.info.text} opacity-70 mt-0.5`}>
                          Your application to join <strong>{job.guild}</strong> is under review
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Apply Button */}
                <Button
                  onClick={handleApply}
                  className="w-full !rounded-[14px] !text-base !font-bold !tracking-tight shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-px transition-all"
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
                            : "Apply Now"}
                </Button>
                {hasAlreadyApplied && (
                  <p className="text-xs text-muted-foreground text-center mt-2.5">
                    You cannot apply to this position again
                  </p>
                )}
                {!isGuildMember &&
                  isAuthenticated &&
                  guildMembershipStatus === "not_member" && (
                    <p className="text-xs text-muted-foreground text-center mt-2.5">
                      Fill out a short application to join this guild
                    </p>
                  )}
              </div>
            </div>

            {/* Company Info Mini Card */}
            <div className="bg-card/70 backdrop-blur-xl rounded-[20px] border border-border/60 p-6 transition-colors hover:border-border/80">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/40">
                <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {job.companyName || "Company"}
                  </div>
                  <div className="text-xs text-muted-foreground">About the Company</div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {job.department && (
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Layers className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                    {job.department}
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                  {job.location}
                </div>
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                  {job.locationType ? job.locationType.charAt(0).toUpperCase() + job.locationType.slice(1) : "Remote"}
                </div>
                {job.experienceLevel && (
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                    {job.experienceLevel.charAt(0).toUpperCase() + job.experienceLevel.slice(1)}
                  </div>
                )}
              </div>
            </div>

            {/* Guild Info Mini Card */}
            {guildColors && job.guild && (
              <div className="bg-card/70 backdrop-blur-xl rounded-[20px] border border-border/60 p-6 transition-colors hover:border-border/80">
                <div className="flex items-center gap-3 mb-3.5">
                  <div className={`w-10 h-10 rounded-xl ${guildColors.bg} border ${guildColors.border} flex items-center justify-center flex-shrink-0`}>
                    <Code2 className={`w-[18px] h-[18px] ${guildColors.text}`} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {job.guild}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Guild-verified position
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3.5">
                  Expert reviews for this position are conducted by verified members
                  of the {job.guild}, ensuring deep technical evaluation.
                </p>
                {(() => {
                  const guildUuid = resolveGuildId(job.guild!);
                  if (!guildUuid) return null;
                  return (
                    <Link
                      href={`/guilds/${guildUuid}`}
                      className="flex items-center gap-1.5 text-sm text-primary font-medium hover:gap-2.5 transition-all pt-3.5 border-t border-border/40"
                    >
                      View Guild Profile
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  );
                })()}
              </div>
            )}
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
