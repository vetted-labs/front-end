"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { candidateApi, jobsApi, applicationsApi, guildsApi, getAssetUrl } from "@/lib/api";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  DollarSign,
  Users,
  FileText,
  HelpCircle,
  Calendar,
  Eye,
  Building2,
  Send,
  Shield,
  TrendingUp,
  Upload,
  CheckCircle2,
  Search,
  ClipboardList,
  Clock,
  Star,
  AlertCircle,
  ExternalLink,
  Link2,
  Trophy,
  Loader2,
} from "lucide-react";
import { Modal, Button, Alert, Textarea, StatusBadge } from "@/components/ui";
import { getPlatformIcon, getPlatformLabel } from "@/lib/social-links";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useGuilds } from "@/lib/hooks/useGuilds";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { formatSalaryRange } from "@/lib/utils";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { Job, CandidateApplication, CandidateProfile } from "@/types";

type UserProfile = Pick<CandidateProfile, "resumeUrl" | "resumeFileName" | "bio" | "socialLinks" | "linkedIn" | "github">;

export default function JobDetailView() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuthContext();
  const { resolveGuildId } = useGuilds();
  const jobId = params.jobId as string | undefined;
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [useProfileResume, setUseProfileResume] = useState(true);
  const [screeningAnswers, setScreeningAnswers] = useState<string[]>([]);
  const { execute: submitApplication, isLoading: isSubmitting } = useApi();
  const [applicationError, setApplicationError] = useState("");
  const [existingApplication, setExistingApplication] = useState<CandidateApplication | null>(null);
  const [isGuildMember, setIsGuildMember] = useState(false);
  const [guildMembershipStatus, setGuildMembershipStatus] = useState<"approved" | "pending" | "not_member" | "unknown">("unknown");

  const isAuthenticated = auth.isAuthenticated;

  // Fetch job details
  const { data: job, isLoading, error } = useFetch<Job>(
    () => jobsApi.getById(jobId!).then((data) => {
      // Track session views
      const viewedJobsKey = 'viewedJobs';
      const viewedJobsStr = sessionStorage.getItem(viewedJobsKey) || '[]';
      const viewedJobs = JSON.parse(viewedJobsStr) as string[];
      if (!viewedJobs.includes(jobId!)) {
        sessionStorage.setItem(viewedJobsKey, JSON.stringify([...viewedJobs, jobId!]));
      }

      return {
        id: data.id,
        title: data.title || 'Untitled Position',
        description: data.description || '',
        requirements: data.requirements || [],
        skills: data.skills || [],
        screeningQuestions: data.screeningQuestions || [],
        department: data.department || null,
        location: data.location,
        locationType: (data.locationType || "remote") as Job["locationType"],
        type: data.type,
        experienceLevel: (data.experienceLevel || null) as Job["experienceLevel"],
        salary: data.salary || { min: null, max: null, currency: 'USD' },
        equityOffered: data.equityOffered || null,
        equityRange: data.equityRange || null,
        status: (data.status || "active") as Job["status"],
        guild: data.guild || '',
        applicants: data.applicants || 0,
        views: data.views || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt || data.createdAt,
        publishedAt: data.publishedAt || null,
        companyId: data.companyId || '',
        companyName: data.companyName,
        companyLogo: data.companyLogo,
        featured: data.featured,
      };
    }),
    { skip: !jobId }
  );

  // Fetch user profile to get existing resume, bio, and social links
  const { data: profileResume } = useFetch<UserProfile | null>(
    () => candidateApi.getById(auth.userId as string).then((data) => ({
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
          const existingApp = applications.find(app =>
            String(app.jobId) === String(jobId)
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
  const shouldCheckGuild = isAuthenticated && !!job && !!job.guild && !isInvalidGuild && !!auth.userId;

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
        // Don't assume "not_member" on transient errors (429, network) — the default
        // state is already "not_member", and the !checkingGuildMembership guard on the
        // warning banner means it won't show during loading. Only log the error.
        logger.error("Error checking guild membership", err, { silent: true });
      },
    }
  );

  // Resolve social links from profile (prefer socialLinks array, fall back to legacy fields)
  const profileSocialLinks = (() => {
    if (!profileResume) return [];
    if (profileResume.socialLinks && profileResume.socialLinks.length > 0) {
      return profileResume.socialLinks.filter((l) => l.url.trim());
    }
    const legacy: import("@/types").SocialLink[] = [];
    if (profileResume.linkedIn) legacy.push({ platform: "linkedin", label: "LinkedIn", url: profileResume.linkedIn });
    if (profileResume.github) legacy.push({ platform: "github", label: "GitHub", url: profileResume.github });
    return legacy;
  })();

  const handleApply = () => {
    // Check if already applied
    if (existingApplication) {
      return; // Button should be disabled, but extra safety check
    }

    if (!auth.token) {
      const currentUrl = `/browse/jobs/${jobId}`;
      router.push(`/auth/login?type=candidate&redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }

    // Check guild membership before allowing application
    if (!isGuildMember) {
      // Redirect directly to guild application form
      if (job?.guild) {
        const guildUuid = resolveGuildId(job.guild);
        if (guildUuid) {
          router.push(`/guilds/${guildUuid}/apply?jobId=${job.id}`);
        }
      }
      return;
    }

    if (job?.screeningQuestions) {
      setScreeningAnswers(new Array(job.screeningQuestions.length).fill(""));
    }
    // Pre-populate cover letter from profile bio if not already filled
    if (!coverLetter && profileResume?.bio) {
      setCoverLetter(profileResume.bio);
    }
    setShowApplyModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      setApplicationError("Please upload a PDF, DOC, or DOCX file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setApplicationError("File size must be less than 5MB");
      return;
    }

    setResumeFile(file);
    setUseProfileResume(false);
    setApplicationError("");
  };

  const handleSubmitApplication = async () => {
    setApplicationError("");

    // Double-check not already applied
    if (existingApplication) {
      setApplicationError("You have already applied to this position");
      return;
    }

    if (!coverLetter.trim()) {
      setApplicationError("Please write a cover letter");
      return;
    }

    if (coverLetter.length < 50) {
      setApplicationError("Cover letter must be at least 50 characters");
      return;
    }

    if (!useProfileResume && !resumeFile) {
      setApplicationError("Please upload your resume or use your profile resume");
      return;
    }
    if (useProfileResume && !profileResume?.resumeUrl) {
      setApplicationError("No resume found in your profile. Please upload one.");
      return;
    }

    if (job?.screeningQuestions && job.screeningQuestions.length > 0) {
      const allAnswered = screeningAnswers.every((answer) => answer.trim() !== "");
      if (!allAnswered) {
        setApplicationError("Please answer all screening questions");
        return;
      }
    }

    const candidateId = auth.userId;
    if (!candidateId) {
      setApplicationError("Unable to identify your account. Please log in again.");
      return;
    }

    await submitApplication(
      async () => {
        let resumeUrl = profileResume?.resumeUrl;

        // If uploading new resume, upload it first
        if (!useProfileResume && resumeFile) {
          const resumeData = await candidateApi.uploadResume(candidateId, resumeFile);
          resumeUrl = resumeData.resumeUrl;
        }

        // Submit the application
        return applicationsApi.create({
          jobId: job?.id,
          candidateId,
          coverLetter,
          resumeUrl,
          screeningAnswers: screeningAnswers.length > 0 ? screeningAnswers : undefined,
          socialLinks: profileSocialLinks.length > 0 ? profileSocialLinks : undefined,
        });
      },
      {
        onSuccess: (data) => {
          const newApplication = data as { id: string };
          setExistingApplication({
            id: newApplication.id,
            jobId: job?.id || "",
            status: "pending",
            coverLetter,
            appliedAt: new Date().toISOString(),
            job: {
              id: job?.id || "",
              title: job?.title || "",
              companyName: job?.companyName,
              location: job?.location || "",
              type: job?.type || "Full-time",
            },
          });

          setShowApplyModal(false);
          setShowSuccessModal(true);
          setCoverLetter("");
          setResumeFile(null);
          setUseProfileResume(true);
          setScreeningAnswers([]);
        },
        onError: (msg) => setApplicationError(`Failed to submit application: ${msg}`),
      }
    );
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
          <Button onClick={() => router.push("/browse")}>
            Browse All Jobs
          </Button>
        </div>
      </div>
    );
  }

  const hasAlreadyApplied = !!existingApplication;

  return (
    <div className="min-h-full animate-page-enter">
      {/* Main Content */}
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
              {/* Job Header */}
              <div className="border-b border-border pb-6 mb-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                      {job.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span className="font-medium">{job.companyName || "Company"}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {job.type}
                      </span>
                    </div>
                  </div>
                  {job.companyLogo && (
                    <img
                      src={getAssetUrl(job.companyLogo)}
                      alt={job.companyName || "Company"}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-border shadow-md sm:ml-6 flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Posted {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                  {job.featured && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full text-xs font-bold">
                      <Star className="w-3 h-3 fill-white" />
                      FEATURED
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {job.applicants} applicants
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {job.views} views
                  </span>
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-3">
                    About the Role
                  </h2>
                  <p className="text-card-foreground whitespace-pre-wrap">
                    {job.description}
                  </p>
                </div>

                {/* Requirements */}
                {job.requirements && job.requirements.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">
                      Requirements
                    </h2>
                    <ul className="space-y-2">
                      {job.requirements.map((req, index) => (
                        <li key={index} className="flex items-start gap-2 text-card-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Skills */}
                {job.skills && job.skills.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">
                      Skills
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-muted/50 text-foreground border border-border/60 rounded-full text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
                    You applied on {new Date(existingApplication.appliedAt).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => router.push("/candidate/applications")}
                    className="text-sm text-primary hover:text-primary font-medium flex items-center gap-1"
                  >
                    <ClipboardList className="w-4 h-4" />
                    View My Applications →
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
                    You applied on {new Date(existingApplication.appliedAt).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-green-700 dark:text-green-300">Status:</span>
                    <StatusBadge status={existingApplication.status} size="sm" />
                  </div>
                  <button
                    onClick={() => router.push("/candidate/applications")}
                    className="text-sm text-primary hover:text-primary font-medium flex items-center gap-1"
                  >
                    <ClipboardList className="w-4 h-4" />
                    View My Applications →
                  </button>
                </div>
              )}

              {/* Invalid Guild Warning */}
              {job.guild && (job.guild.match(/^[0-9]+Guild$/) || job.guild.length < 2) && (
                <div className="p-4 bg-red-500/10 border-2 border-red-500/20 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900 dark:text-red-300">
                        Invalid Guild Data
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                        This job has invalid guild information: <code className="px-1 py-0.5 bg-red-100 dark:bg-red-900 rounded text-xs">{job.guild}</code>
                        <br />
                        Please contact the employer to fix this issue.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Guild Membership Status */}
              {isAuthenticated && !checkingGuildMembership && guildMembershipStatus === "not_member" && job.guild && !job.guild.match(/^[0-9]+Guild$/) && job.guild.length >= 2 && (
                <div className="p-4 bg-yellow-500/10 border-2 border-yellow-500/20 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-900 dark:text-yellow-300">
                        Guild Membership Required
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                        You must join the <strong>{job.guild}</strong> guild to apply for this position
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
                        Your application to join <strong>{job.guild}</strong> is under review by expert members
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
                  disabled={hasAlreadyApplied || checkingApplication || checkingGuildMembership || guildMembershipStatus === "pending"}
                  isLoading={checkingApplication || checkingGuildMembership}
                  icon={!checkingApplication && !checkingGuildMembership && <Send className="w-5 h-5" />}
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
                {!isGuildMember && isAuthenticated && guildMembershipStatus === "not_member" && (
                  <p className="text-xs text-muted-foreground text-center">
                    Fill out a short application to join this guild
                  </p>
                )}
              </div>

              {/* Job Details */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground mb-3">
                  Job Details
                </h3>

                {job.salary?.min && job.salary?.max && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Salary Range
                      </p>
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
                    <p className="text-sm text-muted-foreground capitalize">{job.locationType}</p>
                  </div>
                </div>

                {job.experienceLevel && (
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Experience Level</p>
                      <p className="text-sm text-muted-foreground capitalize">{job.experienceLevel}</p>
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

      {/* Apply Modal */}
      <Modal
        isOpen={showApplyModal}
        onClose={() => {
          setShowApplyModal(false);
          setCoverLetter("");
          setResumeFile(null);
          setUseProfileResume(true);
          setScreeningAnswers([]);
          setApplicationError("");
        }}
        title={`Apply for ${job?.title}`}
        size="lg"
      >
        <p className="text-muted-foreground mb-6">
          Complete the form below to submit your application
        </p>

        <div className="space-y-6">
          {/* Resume Selection */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Resume / CV <span className="text-destructive">*</span>
            </label>

            {/* Option to use profile resume */}
            {profileResume?.resumeUrl && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setUseProfileResume(true);
                    setResumeFile(null);
                    setApplicationError("");
                  }}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    useProfileResume
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      useProfileResume ? "border-primary" : "border-border"
                    }`}>
                      {useProfileResume && (
                        <div className="w-3 h-3 rounded-full bg-primary/100"></div>
                      )}
                    </div>
                    <FileText className={`w-5 h-5 ${useProfileResume ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Use Resume from Profile
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {profileResume.resumeFileName}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Option to upload new resume */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setUseProfileResume(false);
                  document.getElementById("resume-upload")?.click();
                }}
                className={`w-full p-4 border-2 border-dashed rounded-lg text-left transition-all ${
                  !useProfileResume && resumeFile
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary"
                }`}
              >
                <input
                  type="file"
                  id="resume-upload"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {!useProfileResume && resumeFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-primary/100"></div>
                      </div>
                      <FileText className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Upload New Resume
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {resumeFile.name}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setResumeFile(null);
                        setUseProfileResume(true);
                      }}
                      className="text-destructive hover:text-red-700 text-sm cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-border"></div>
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Upload New Resume
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, DOC, or DOCX (max 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Cover Letter */}
          <Textarea
            label="Cover Letter *"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={6}
            placeholder="Tell us why you're a great fit for this role..."
            showCounter
            minLength={50}
          />

          {/* Social Links from Profile */}
          {profileSocialLinks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-muted-foreground" />
                Social Links from Profile
              </label>
              <div className="flex flex-wrap gap-2">
                {profileSocialLinks.map((link, i) => {
                  const Icon = getPlatformIcon(link.platform);
                  return (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all group text-sm"
                    >
                      <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="font-medium text-foreground">
                        {link.label || getPlatformLabel(link.platform)}
                      </span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                These links will be included with your application. Update them in your profile settings.
              </p>
            </div>
          )}

          {/* Screening Questions */}
          {job?.screeningQuestions && job.screeningQuestions.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Screening Questions
              </h3>
              {job.screeningQuestions.map((question, index) => (
                <Textarea
                  key={index}
                  label={`${index + 1}. ${question}`}
                  value={screeningAnswers[index] || ""}
                  onChange={(e) => {
                    const newAnswers = [...screeningAnswers];
                    newAnswers[index] = e.target.value;
                    setScreeningAnswers(newAnswers);
                  }}
                  rows={3}
                  placeholder="Your answer..."
                />
              ))}
            </div>
          )}

          {applicationError && (
            <Alert variant="error">{applicationError}</Alert>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowApplyModal(false);
                setCoverLetter("");
                setResumeFile(null);
                setUseProfileResume(true);
                setScreeningAnswers([]);
                setApplicationError("");
              }}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitApplication}
              isLoading={isSubmitting}
              className="flex-1"
              icon={!isSubmitting && <Send className="w-5 h-5" />}
            >
              Submit Application
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        size="md"
      >
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Application Submitted!
          </h2>
          <p className="text-muted-foreground mb-8">
            Your application for <strong>{job?.title}</strong> has been successfully submitted. The hiring team will review it and get back to you soon.
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                router.push("/browse/jobs");
              }}
              className="w-full"
              icon={<Search className="w-5 h-5" />}
            >
              Browse More Jobs
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowSuccessModal(false);
                router.push("/candidate/applications");
              }}
              className="w-full"
              icon={<ClipboardList className="w-5 h-5" />}
            >
              View My Applications
            </Button>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Stay on this page
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
