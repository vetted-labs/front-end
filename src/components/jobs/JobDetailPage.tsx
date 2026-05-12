"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Users,
  HelpCircle,
  Edit,
  Calendar,
  Eye,
  Share2,
  ExternalLink as ExternalLinkIcon,
  Image as ImageIcon,
  ListChecks,
  CircleDot,
  Type as TypeIcon,
  AlignLeft,
  Upload as UploadIcon,
  Link2,
  Play,
  Sparkles,
  Globe,
  Banknote,
  GraduationCap,
  Send,
  Shield,
  AlertCircle,
  Clock,
  CheckCircle2,
  Trophy,
  ClipboardList,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  jobsApi,
  applicationsApi,
  candidateApi,
  guildsApi,
  matchingApi,
} from "@/lib/api";
import { renderMarkdown } from "@/lib/renderMarkdown";
import { useFetch } from "@/lib/hooks/useFetch";
import { DataSection } from "@/lib/motion";
import { useApplicationStatusUpdate } from "@/lib/hooks/useApplicationStatusUpdate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VettedIcon } from "@/components/ui/vetted-icon";
import { GuildAvatar, GuildBadge } from "@/components/ui/guild";
import { getGuildIconName } from "@/lib/guildHelpers";
import { formatSalaryRange, formatTimeAgo, cn } from "@/lib/utils";
import { toast } from "sonner";
import { ApplicationDetailModal } from "./ApplicationDetailModal";
import JobApplicationModal from "@/components/browse/JobApplicationModal";
import { MatchScoreBreakdown } from "@/components/ui/match-score-breakdown";
import { Alert } from "@/components/ui/alert";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useGuilds } from "@/lib/hooks/useGuilds";
import { logger } from "@/lib/logger";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import { STATUS_COLORS } from "@/config/colors";
import Link from "next/link";
import type {
  CompanyApplication,
  ApplicationStatus,
  ApplicationQuestion,
  ApplicationQuestionType,
  Job,
  CandidateApplication,
  CandidateUserProfile,
  SocialLink,
  MatchScoreResult,
} from "@/types";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOB_STATUS_CONFIG } from "@/config/constants";

interface JobDetailPageProps {
  dashboardContext?: boolean;
  /**
   * Public job-detail mode (candidate-facing). Hides the applicants tab and
   * surfaces an apply CTA + guild-membership flow in the right rail.
   */
  publicContext?: boolean;
}

const QUESTION_TYPE_META: Record<
  ApplicationQuestionType,
  { label: string; icon: typeof TypeIcon }
> = {
  short_text: { label: "Short text", icon: TypeIcon },
  long_text: { label: "Long text", icon: AlignLeft },
  single_choice: { label: "Single choice", icon: CircleDot },
  multi_choice: { label: "Multi choice", icon: ListChecks },
  file_upload: { label: "File upload", icon: UploadIcon },
  url: { label: "URL", icon: Link2 },
};

function youTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1).split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function loomEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("loom.com")) return null;
    const m = u.pathname.match(/\/share\/([a-z0-9]+)/i);
    return m ? `https://www.loom.com/embed/${m[1]}` : null;
  } catch {
    return null;
  }
}

export default function JobDetailPage({
  dashboardContext,
  publicContext,
}: JobDetailPageProps) {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string | undefined;
  const auth = useAuthContext();
  const { resolveGuildId } = useGuilds();

  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"overview" | "applicants">(
    "overview"
  );
  const [selectedApplication, setSelectedApplication] =
    useState<CompanyApplication | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  // ── Public-mode state (candidate apply flow) ─────────────────────────────
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [existingApplication, setExistingApplication] =
    useState<CandidateApplication | null>(null);
  const [guildMembershipStatus, setGuildMembershipStatus] = useState<
    "approved" | "pending" | "not_member" | "unknown"
  >("unknown");

  const backHref = dashboardContext ? "/dashboard/jobs" : "/browse/jobs";
  const editHref = dashboardContext
    ? `/dashboard/jobs/${jobId}/edit`
    : `/jobs/${jobId}/edit`;

  const {
    data: job,
    isLoading,
    error,
  } = useFetch(() => jobsApi.getById(jobId!), { skip: !jobId });

  const {
    data: applicationsData,
    isLoading: applicationsLoading,
    refetch: refetchApps,
  } = useFetch(
    () =>
      applicationsApi.getJobApplications(jobId!, {
        status: statusFilter,
        limit: 50,
      }),
    { skip: !jobId || publicContext }
  );

  const applications = applicationsData?.applications ?? [];

  // eslint-disable-next-line no-restricted-syntax -- triggers re-fetch on filter change (useFetch doesn't support custom deps)
  useEffect(() => {
    if (jobId && !publicContext) refetchApps();
  }, [statusFilter, jobId, refetchApps, publicContext]);

  // ── Public-mode fetches (candidate-side) ─────────────────────────────────
  const isAuthenticated = auth.isAuthenticated;
  const isCandidate = isAuthenticated && auth.userType === "candidate";
  const candidateId = isCandidate ? auth.userId : null;

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
      skip: !publicContext || !isAuthenticated || !auth.userId,
      onError: (err) => {
        logger.error("Failed to fetch profile", err, { silent: true });
      },
    },
  );

  useFetch(() => applicationsApi.getAll(), {
    skip: !publicContext || !isAuthenticated || !jobId,
    onSuccess: (data) => {
      const apps = data?.applications ?? [];
      if (Array.isArray(apps) && apps.length > 0) {
        const found = apps.find((a) => String(a.jobId) === String(jobId));
        if (found) setExistingApplication(found);
      }
    },
    onError: (err) => {
      logger.error("Failed to check applications", err, { silent: true });
    },
  });

  const publicJob = publicContext ? job : null;
  const guildId = publicJob?.guild?.trim();
  const isInvalidGuild =
    !guildId || guildId.length < 2 || !!guildId.match(/^[0-9]+Guild$/);
  const shouldCheckGuild =
    !!publicContext &&
    isAuthenticated &&
    !!publicJob &&
    !!publicJob.guild &&
    !isInvalidGuild &&
    !!auth.userId;

  const { isLoading: checkingGuildMembership } = useFetch(
    () => guildsApi.checkMembership(auth.userId as string, guildId!),
    {
      skip: !shouldCheckGuild,
      onSuccess: (membershipData) => {
        if (membershipData.isMember || membershipData.status === "approved") {
          setGuildMembershipStatus("approved");
        } else if (membershipData.status === "pending") {
          setGuildMembershipStatus("pending");
        } else {
          setGuildMembershipStatus("not_member");
        }
      },
      onError: (err) => {
        logger.error("Error checking guild membership", err, { silent: true });
      },
    },
  );

  const { data: matchScore } = useFetch(
    () => matchingApi.calculate(candidateId!, jobId!),
    { skip: !publicContext || !candidateId || !jobId },
  );

  const { updateStatus } = useApplicationStatusUpdate();

  const handleStatusChange = useCallback(
    async (application: CompanyApplication, newStatus: ApplicationStatus) => {
      const result = await updateStatus(
        {
          applicationId: application.id,
          candidateId: application.candidateId,
          jobId: application.jobId,
          currentStatus: application.status as ApplicationStatus,
          newStatus,
        },
        { onError: (msg) => toast.error(msg) }
      );

      if (result) {
        refetchApps();
        setSelectedApplication((prev) =>
          prev?.id === application.id
            ? { ...prev, status: newStatus as ApplicationStatus }
            : prev
        );
      }
    },
    [updateStatus, refetchApps]
  );

  const profileSocialLinks: SocialLink[] = useMemo(() => {
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
  }, [profileResume]);

  const handleApply = useCallback(() => {
    if (existingApplication) return;
    if (!auth.token) {
      const currentUrl = `/browse/jobs/${jobId}`;
      router.push(
        `/auth/login?type=candidate&redirect=${encodeURIComponent(currentUrl)}`,
      );
      return;
    }
    // Non-approved guild members go through the combined guild+job apply
    // wizard (candidate-side `GuildApplicationFlow`), which handles joining
    // the guild and submitting the job application in one flow.
    if (guildMembershipStatus !== "approved") {
      if (job?.guild) {
        const guildUuid = resolveGuildId(job.guild);
        if (guildUuid) {
          router.push(`/guilds/${guildUuid}/apply?jobId=${job.id}`);
        }
      }
      return;
    }
    setShowApplyModal(true);
  }, [
    existingApplication,
    auth.token,
    guildMembershipStatus,
    job,
    resolveGuildId,
    router,
    jobId,
  ]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => router.push(backHref)}>Back to Jobs</Button>
        </div>
      </div>
    );
  }

  if (!isLoading && !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground mb-4">Job not found.</p>
          <Button onClick={() => router.push(backHref)}>Back to Jobs</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative animate-page-enter">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to jobs
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied to clipboard");
              }}
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              Share
            </Button>
            {dashboardContext && (
              <Button size="sm" onClick={() => router.push(editHref)}>
                <Edit className="w-4 h-4 mr-1.5" />
                Edit listing
              </Button>
            )}
            {publicContext && existingApplication && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push("/candidate/applications")}
              >
                <ClipboardList className="w-4 h-4 mr-1.5" />
                My applications
              </Button>
            )}
          </div>
        </div>

        <DataSection isLoading={isLoading} skeleton={null}>
          {job && (
            <JobDetailLayout
              job={job}
              dashboardContext={!!dashboardContext}
              publicContext={!!publicContext}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              applications={applications}
              applicationsLoading={applicationsLoading}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onApplicationOpen={(a) => {
                setSelectedApplication(a);
                setShowApplicationModal(true);
              }}
              publicProps={
                publicContext
                  ? {
                      isAuthenticated,
                      existingApplication,
                      guildMembershipStatus,
                      checkingGuildMembership,
                      onApply: handleApply,
                      matchScore: matchScore ?? null,
                      resolveGuildId,
                    }
                  : undefined
              }
            />
          )}

          {selectedApplication && (
            <ApplicationDetailModal
              application={selectedApplication}
              open={showApplicationModal}
              onOpenChange={setShowApplicationModal}
              onStatusChange={handleStatusChange}
            />
          )}

          {publicContext && job && auth.userId && (
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
        </DataSection>
      </div>
    </div>
  );
}

interface PublicLayoutProps {
  isAuthenticated: boolean;
  existingApplication: CandidateApplication | null;
  guildMembershipStatus: "approved" | "pending" | "not_member" | "unknown";
  checkingGuildMembership: boolean;
  onApply: () => void;
  matchScore: MatchScoreResult | null;
  resolveGuildId: (name: string) => string | undefined;
}

interface JobDetailLayoutProps {
  job: Job;
  dashboardContext: boolean;
  publicContext: boolean;
  activeTab: "overview" | "applicants";
  onTabChange: (t: "overview" | "applicants") => void;
  applications: CompanyApplication[];
  applicationsLoading: boolean;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  onApplicationOpen: (a: CompanyApplication) => void;
  publicProps?: PublicLayoutProps;
}

function JobDetailLayout({
  job,
  dashboardContext,
  publicContext,
  activeTab,
  onTabChange,
  applications,
  applicationsLoading,
  statusFilter,
  onStatusFilterChange,
  onApplicationOpen,
  publicProps,
}: JobDetailLayoutProps) {
  const guildIconName = getGuildIconName(job.guild ?? "");
  const status = job.status ?? "draft";
  const statusConfig = JOB_STATUS_CONFIG[status] || JOB_STATUS_CONFIG.draft;

  const questions: ApplicationQuestion[] = useMemo(() => {
    if (job.applicationQuestions?.length) return job.applicationQuestions;
    if (job.screeningQuestions?.length) {
      return job.screeningQuestions.map((q, i) => ({
        id: `legacy-${i}`,
        type: "long_text" as const,
        label: q,
        required: true,
      }));
    }
    return [];
  }, [job.applicationQuestions, job.screeningQuestions]);

  const gallery = job.galleryUrls ?? [];
  const links = job.externalLinks ?? [];
  const skills = job.skills ?? [];
  const requirements = job.requirements ?? [];

  const embedSrc = job.embedUrl
    ? job.embedProvider === "loom"
      ? loomEmbedUrl(job.embedUrl)
      : youTubeEmbedUrl(job.embedUrl)
    : null;

  return (
    <div className="space-y-6">
      <HeroCard
        job={job}
        guildIconName={guildIconName}
        statusConfig={statusConfig}
      />

      {!dashboardContext && !publicContext && (
        <div className="flex items-center gap-1 border-b border-border">
          {(["overview", "applicants"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize",
                activeTab === tab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
              {tab === "applicants" && applications.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
                  ({applications.length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {(dashboardContext || publicContext || activeTab === "overview") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {job.description && (
              <Section icon={<Briefcase className="w-4 h-4" />} title="About this role">
                <div className="prose prose-invert prose-sm max-w-none text-foreground/90 leading-relaxed">
                  {renderMarkdown(job.description)}
                </div>
              </Section>
            )}

            {requirements.length > 0 && (
              <Section
                icon={<ListChecks className="w-4 h-4" />}
                title="What you'll bring"
              >
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {requirements.map((req, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-foreground/90 leading-relaxed"
                    >
                      <span className="mt-1.5 w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {skills.length > 0 && (
              <Section icon={<Sparkles className="w-4 h-4" />} title="Top skills">
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {gallery.length > 0 && (
              <Section icon={<ImageIcon className="w-4 h-4" />} title="Gallery">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {gallery.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-border bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- user upload, served from /uploads */}
                      <img
                        src={url}
                        alt={`Gallery ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {embedSrc && (
              <Section icon={<Play className="w-4 h-4" />} title="Watch the intro">
                <div className="aspect-video rounded-lg overflow-hidden border border-border bg-black">
                  <iframe
                    src={embedSrc}
                    title={`${job.embedProvider ?? "video"} embed`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </Section>
            )}

            {questions.length > 0 && (
              <Section
                icon={<HelpCircle className="w-4 h-4" />}
                title="Application form"
                meta={`${questions.length} question${questions.length === 1 ? "" : "s"}`}
              >
                <ol className="space-y-3">
                  {questions.map((q, i) => {
                    const meta = QUESTION_TYPE_META[q.type];
                    const Icon = meta.icon;
                    return (
                      <li
                        key={q.id || i}
                        className="rounded-xl border border-border bg-muted/30 p-4 flex items-start gap-3"
                      >
                        <span className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 text-primary grid place-items-center">
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">
                              {meta.label}
                            </span>
                            {q.required && (
                              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-foreground leading-snug">
                            {i + 1}. {q.label}
                          </p>
                          {q.helpText && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {q.helpText}
                            </p>
                          )}
                          {(q.type === "single_choice" ||
                            q.type === "multi_choice") &&
                            q.options && (
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {q.options.map((opt, j) => (
                                  <span
                                    key={j}
                                    className="px-2 py-0.5 rounded-full text-xs bg-card border border-border text-muted-foreground"
                                  >
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </Section>
            )}

            {links.length > 0 && (
              <Section
                icon={<ExternalLinkIcon className="w-4 h-4" />}
                title="Useful links"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {links.map((l, i) => (
                    <a
                      key={i}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 hover:bg-muted hover:border-border/70 transition-colors group"
                    >
                      <span className="w-8 h-8 rounded-md bg-card border border-border grid place-items-center flex-shrink-0">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground truncate">
                          {l.title}
                        </span>
                        <span className="block text-xs text-muted-foreground truncate">
                          {l.url}
                        </span>
                      </span>
                      <ExternalLinkIcon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </Section>
            )}
          </div>

          <aside className="lg:col-span-1 space-y-4">
            {publicContext && publicProps && (
              <PublicApplySidebar job={job} {...publicProps} />
            )}
            <SidebarCard title="At a glance">
              <KeyValue
                icon={<MapPin className="w-3.5 h-3.5" />}
                label="Location"
                value={job.location || "—"}
                hint={job.locationType ? job.locationType : undefined}
              />
              <KeyValue
                icon={<Briefcase className="w-3.5 h-3.5" />}
                label="Employment"
                value={job.type}
              />
              <KeyValue
                icon={<GraduationCap className="w-3.5 h-3.5" />}
                label="Experience"
                value={job.experienceLevel || "—"}
                capitalize
              />
              <KeyValue
                icon={<Banknote className="w-3.5 h-3.5" />}
                label="Compensation"
                value={formatSalaryRange({
                  min: job.salary?.min,
                  max: job.salary?.max,
                  currency: job.salary?.currency,
                })}
              />
              {job.department && (
                <KeyValue
                  icon={<Users className="w-3.5 h-3.5" />}
                  label="Department"
                  value={job.department}
                />
              )}
            </SidebarCard>

            <SidebarCard title="Reviewing guild">
              <div className="flex items-start gap-3">
                <GuildAvatar guild={job.guild} size="md" rounded="lg" />
                <div className="min-w-0">
                  <GuildBadge guild={job.guild} size="sm" />
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">
                    Experts in this guild stake reputation on every applicant
                    they vote through.
                  </p>
                </div>
              </div>
            </SidebarCard>

            {dashboardContext && (
              <SidebarCard title="Listing">
                <KeyValue
                  icon={<Eye className="w-3.5 h-3.5" />}
                  label="Views"
                  value={`${job.views ?? 0}`}
                />
                <KeyValue
                  icon={<Users className="w-3.5 h-3.5" />}
                  label="Applicants"
                  value={`${job.applicants ?? 0}`}
                />
                <KeyValue
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  label="Posted"
                  value={formatTimeAgo(job.createdAt)}
                />
              </SidebarCard>
            )}
          </aside>
        </div>
      )}

      {!dashboardContext && !publicContext && activeTab === "applicants" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Applicants · {applications.length}
            </h2>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="interviewed">Interviewed</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {applicationsLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No applicants yet.
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {applications.map((a) => (
                <li
                  key={a.id}
                  className="px-5 py-3.5 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => onApplicationOpen(a)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary grid place-items-center flex-shrink-0 font-semibold">
                      {a.candidate.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {a.candidate.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {a.candidate.email}
                        {a.candidate.experienceLevel
                          ? ` · ${a.candidate.experienceLevel}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <Badge
                        variant={
                          a.status === "accepted"
                            ? "default"
                            : a.status === "rejected"
                              ? "destructive"
                              : a.status === "interviewed"
                                ? "secondary"
                                : "outline"
                        }
                      >
                        {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {formatTimeAgo(a.appliedAt)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

interface HeroCardProps {
  job: Job;
  guildIconName: ReturnType<typeof getGuildIconName>;
  statusConfig: { label: string; className: string };
}

function HeroCard({ job, guildIconName, statusConfig }: HeroCardProps) {
  const hasHero = !!job.heroImageUrl;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div
        className={cn(
          "relative",
          hasHero ? "h-56 sm:h-72" : "h-32",
          "bg-gradient-to-br from-primary/15 via-primary/5 to-transparent"
        )}
      >
        {hasHero && (
          // eslint-disable-next-line @next/next/no-img-element -- backend-served upload
          <img
            src={job.heroImageUrl!}
            alt={job.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div
          className={cn(
            "absolute inset-0",
            hasHero
              ? "bg-gradient-to-t from-card via-card/40 to-card/0"
              : "bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.15),transparent_60%)]"
          )}
        />
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
          <span
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-semibold backdrop-blur-md",
              statusConfig.className
            )}
          >
            {statusConfig.label}
          </span>
          <div className="flex items-center gap-2">
            {job.featured && (
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary text-primary-foreground">
                Featured
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-8 -mt-8 relative pb-6">
        <div className="flex items-start gap-4">
          <span className="w-16 h-16 rounded-2xl bg-card border border-border grid place-items-center text-primary shadow-md flex-shrink-0">
            <VettedIcon name={guildIconName} className="w-8 h-8" />
          </span>
          <div className="min-w-0 flex-1 pt-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display">
              {job.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {[job.companyName, job.department].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Pill icon={<MapPin className="w-3.5 h-3.5" />}>
            {job.location || "—"}
            {job.locationType ? ` · ${job.locationType}` : ""}
          </Pill>
          <Pill icon={<Briefcase className="w-3.5 h-3.5" />}>{job.type}</Pill>
          <Pill icon={<Banknote className="w-3.5 h-3.5" />}>
            {formatSalaryRange({
              min: job.salary?.min,
              max: job.salary?.max,
              currency: job.salary?.currency,
            })}
          </Pill>
          {job.experienceLevel && (
            <Pill
              icon={<GraduationCap className="w-3.5 h-3.5" />}
              capitalize
            >
              {job.experienceLevel}
            </Pill>
          )}
          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Posted {formatTimeAgo(job.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  meta,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          {title}
        </h2>
        {meta && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {meta}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function KeyValue({
  icon,
  label,
  value,
  hint,
  capitalize,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "text-sm text-foreground font-medium leading-snug",
            capitalize && "capitalize"
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="text-xs text-muted-foreground capitalize">{hint}</p>
        )}
      </div>
    </div>
  );
}

function Pill({
  icon,
  children,
  capitalize,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  capitalize?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs font-medium text-foreground",
        capitalize && "capitalize"
      )}
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      {children}
    </span>
  );
}

interface PublicApplySidebarProps extends PublicLayoutProps {
  job: Job;
}

function PublicApplySidebar({
  job,
  isAuthenticated,
  existingApplication,
  guildMembershipStatus,
  checkingGuildMembership,
  onApply,
  matchScore,
  resolveGuildId,
}: PublicApplySidebarProps) {
  const router = useRouter();
  const hasAlreadyApplied = !!existingApplication;
  const invalidGuild =
    !!job.guild &&
    (job.guild.length < 2 || !!job.guild.match(/^[0-9]+Guild$/));

  const guildUuid = job.guild ? resolveGuildId(job.guild) : null;
  const applyDisabled =
    hasAlreadyApplied ||
    checkingGuildMembership ||
    guildMembershipStatus === "pending";

  const buttonLabel = checkingGuildMembership
    ? "Checking…"
    : hasAlreadyApplied
      ? "Already applied"
      : !isAuthenticated
        ? "Sign in to apply"
        : guildMembershipStatus === "not_member"
          ? `Apply & join ${job.guild}`
          : guildMembershipStatus === "pending"
            ? "Guild application pending"
            : "Apply now";

  return (
    <>
      {hasAlreadyApplied && existingApplication.status === "accepted" && (
        <div
          className={`relative overflow-hidden rounded-xl border-2 ${STATUS_COLORS.positive.border} ${STATUS_COLORS.positive.bgSubtle} p-4`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`w-10 h-10 rounded-full ${STATUS_COLORS.positive.bg} grid place-items-center flex-shrink-0`}
            >
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p
                className={`font-display font-bold ${STATUS_COLORS.positive.text} text-lg leading-tight`}
              >
                Accepted
              </p>
              <p className={`text-xs ${STATUS_COLORS.positive.text} opacity-70`}>
                Congratulations on your offer.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/candidate/applications")}
            className="text-sm text-primary hover:opacity-80 font-medium inline-flex items-center gap-1.5"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            View my applications
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {hasAlreadyApplied && existingApplication.status !== "accepted" && (
        <div
          className={`rounded-xl border-2 ${STATUS_COLORS.positive.border} ${STATUS_COLORS.positive.bgSubtle} p-4`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle2 className={`w-4 h-4 ${STATUS_COLORS.positive.icon}`} />
            <span className={`font-semibold text-sm ${STATUS_COLORS.positive.text}`}>
              Already applied
            </span>
          </div>
          <p className={`text-xs ${STATUS_COLORS.positive.text} opacity-70 mb-2`}>
            You applied on{" "}
            {new Date(existingApplication.appliedAt).toLocaleDateString()}
          </p>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs ${STATUS_COLORS.positive.text} opacity-70`}>
              Status:
            </span>
            <span
              className={`inline-flex items-center rounded-full font-medium px-2 py-0.5 text-xs ${
                (
                  APPLICATION_STATUS_CONFIG[existingApplication.status] ?? {
                    className: "bg-muted text-muted-foreground",
                  }
                ).className
              }`}
            >
              {(
                APPLICATION_STATUS_CONFIG[existingApplication.status] ?? {
                  label: existingApplication.status,
                }
              ).label}
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/candidate/applications")}
            className="text-sm text-primary hover:opacity-80 font-medium inline-flex items-center gap-1.5"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            View my applications
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="h-[3px] bg-primary" />
        <div className="p-5 space-y-4">
          {job.salary?.min && job.salary?.max && (
            <div>
              <div className="font-display text-2xl font-bold tracking-tight text-foreground">
                {formatSalaryRange({
                  min: job.salary.min,
                  max: job.salary.max,
                  currency: job.salary.currency,
                })}
              </div>
              {job.equityOffered && (
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium mt-1">
                  <Layers className="w-3 h-3" />
                  + Equity {job.equityRange && `(${job.equityRange})`}
                </div>
              )}
            </div>
          )}

          {invalidGuild && (
            <Alert variant="error" className="text-xs py-2">
              <span className="inline-flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  This job has invalid guild information. Please contact the
                  employer.
                </span>
              </span>
            </Alert>
          )}

          {isAuthenticated &&
            !checkingGuildMembership &&
            guildMembershipStatus === "not_member" &&
            job.guild &&
            !invalidGuild && (
              <div
                className={`p-3 ${STATUS_COLORS.warning.bgSubtle} border ${STATUS_COLORS.warning.border} rounded-lg`}
              >
                <div className="flex items-start gap-2">
                  <Shield
                    className={`w-3.5 h-3.5 ${STATUS_COLORS.warning.icon} flex-shrink-0 mt-0.5`}
                  />
                  <div>
                    <p
                      className={`text-xs font-semibold ${STATUS_COLORS.warning.text}`}
                    >
                      Guild membership required
                    </p>
                    <p
                      className={`text-[11px] ${STATUS_COLORS.warning.text} opacity-70 mt-0.5`}
                    >
                      Join <strong>{job.guild}</strong> to apply — you&apos;ll
                      fill the guild and job application in one flow.
                    </p>
                  </div>
                </div>
              </div>
            )}

          {isAuthenticated && guildMembershipStatus === "pending" && (
            <div
              className={`p-3 ${STATUS_COLORS.info.bgSubtle} border ${STATUS_COLORS.info.border} rounded-lg`}
            >
              <div className="flex items-start gap-2">
                <Clock
                  className={`w-3.5 h-3.5 ${STATUS_COLORS.info.icon} flex-shrink-0 mt-0.5`}
                />
                <div>
                  <p
                    className={`text-xs font-semibold ${STATUS_COLORS.info.text}`}
                  >
                    Guild application pending
                  </p>
                  <p
                    className={`text-[11px] ${STATUS_COLORS.info.text} opacity-70 mt-0.5`}
                  >
                    Your application to <strong>{job.guild}</strong> is under
                    review.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            type="button"
            onClick={onApply}
            disabled={applyDisabled}
            className="w-full"
            size="lg"
          >
            {checkingGuildMembership ? (
              <Loader2Inline />
            ) : (
              <Send className="w-4 h-4 mr-1.5" />
            )}
            {buttonLabel}
          </Button>
          {hasAlreadyApplied && (
            <p className="text-[11px] text-muted-foreground text-center -mt-1">
              You cannot apply to this position again.
            </p>
          )}
          {!hasAlreadyApplied &&
            isAuthenticated &&
            guildMembershipStatus === "not_member" && (
              <p className="text-[11px] text-muted-foreground text-center -mt-1">
                A short application is needed to join this guild.
              </p>
            )}
        </div>
      </div>

      {matchScore && (
        <MatchScoreBreakdown
          totalScore={matchScore.totalScore}
          breakdown={matchScore.breakdown}
          matchedSkills={matchScore.matchedSkills}
          missingSkills={matchScore.missingSkills}
        />
      )}

      {guildUuid && (
        <Link
          href={`/guilds/${guildUuid}`}
          className="block rounded-xl border border-border bg-card hover:border-primary/30 transition-colors p-4"
        >
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Reviewing guild
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              View guild profile
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
        </Link>
      )}
    </>
  );
}

function Loader2Inline() {
  return (
    <span className="inline-flex items-center mr-1.5">
      <span className="block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
    </span>
  );
}
