"use client";

import { useState } from "react";
import {
  Mail,
  Phone,
  Linkedin,
  Github,
  ExternalLink,
  FileText,
  Calendar,
  Send,
  Loader2,
  Shield,
  CheckCircle,
  XCircle,
  Star,
  ArrowLeft,
} from "lucide-react";
import { applicationsApi, companyApi, getAssetUrl, messagingApi, ApiError } from "@/lib/api";
import { getPersonAvatar } from "@/lib/avatars";
import { STATUS_COLORS } from "@/config/colors";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { ensureHttps, formatSalaryRange } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { StatusActions } from "./StatusActions";
import { PipelineStepper } from "./PipelineStepper";
import { StatusTimeline } from "./StatusTimeline";
import type { CompanyApplication, CandidateGuildReport, ApplicationStatus, StatusTransition } from "@/types";
import { getPlatformIcon } from "@/lib/social-links";

type TabValue = "profile" | "application" | "guild-report" | "history" | "notes";

const tabs: { value: TabValue; label: string }[] = [
  { value: "profile", label: "Profile" },
  { value: "application", label: "Application" },
  { value: "guild-report", label: "Guild Report" },
  { value: "history", label: "History" },
  { value: "notes", label: "Notes" },
];

interface CandidateDetailPanelProps {
  application: CompanyApplication;
  onStatusChange: (applicationId: string, newStatus: ApplicationStatus, note?: string) => void;
  isUpdatingStatus?: boolean;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function CandidateDetailPanel({
  application,
  onStatusChange,
  isUpdatingStatus,
  onBack,
  showBackButton,
}: CandidateDetailPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabValue>("profile");
  // Notes are reset when application changes via the `key` prop on the parent —
  // callers should render <CandidateDetailPanel key={application.id} ... />
  const [notes, setNotes] = useState(application.notes ?? "");
  const [message, setMessage] = useState("");
  const { execute: executeSaveNotes, isLoading: isSavingNotes } = useApi();
  const { execute: executeSendMessage, isLoading: isSendingMessage } = useApi();

  const { candidate, job } = application;

  const { data: guildReport, isLoading: guildReportLoading, error: guildReportError } = useFetch<CandidateGuildReport>(
    () => companyApi.getCandidateGuildReport(application.candidateId, application.jobId),
    { skip: activeTab !== "guild-report" },
  );

  const { data: statusHistory, isLoading: historyLoading, refetch: refetchHistory } = useFetch<StatusTransition[]>(
    () => applicationsApi.getStatusHistory(application.id),
    { skip: activeTab !== "history" },
  );

  const handleStatusAdvance = async (newStatus: ApplicationStatus, note?: string) => {
    await onStatusChange(application.id, newStatus, note);
    refetchHistory();
  };

  const resumeUrl = application.resumeUrl ? getAssetUrl(application.resumeUrl) : null;

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    // 409 handling requires access to the original ApiError, so we wrap
    // the API call to handle that case before useApi's error path.
    await executeSendMessage(
      async () => {
        try {
          return await messagingApi.startConversation({
            applicationId: application.id,
            message: message.trim(),
          });
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            const existing = await messagingApi.getConversationByApplication(application.id);
            if (existing) {
              router.push(`/dashboard/messages/${existing.id}`);
              return existing;
            }
          }
          throw err;
        }
      },
      {
        onSuccess: (data) => {
          toast.success("Message sent!");
          setMessage("");
          const result = data as { id: string };
          router.push(`/dashboard/messages/${result.id}`);
        },
        onError: () => toast.error("Failed to send message"),
      }
    );
  };

  const handleSaveNotes = async () => {
    await executeSaveNotes(
      () => applicationsApi.updateNotes(application.id, notes),
      {
        onSuccess: () => {
          toast.success("Notes saved!");
        },
        onError: () => toast.error("Failed to save notes"),
      }
    );
  };

  const firstName = candidate.fullName.split(" ")[0];
  const appliedDate = new Date(application.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Collect all contact/social links for icon-only header buttons
  const contactLinks: { href: string; icon: typeof Mail; title: string }[] = [
    { href: `mailto:${candidate.email}`, icon: Mail, title: candidate.email },
  ];
  if (candidate.phone) {
    contactLinks.push({ href: `tel:${candidate.phone}`, icon: Phone, title: candidate.phone });
  }
  if (candidate.socialLinks?.length) {
    for (const link of candidate.socialLinks.filter((l) => l.url?.trim())) {
      contactLinks.push({
        href: ensureHttps(link.url),
        icon: getPlatformIcon(link.platform),
        title: link.label || link.platform,
      });
    }
  } else {
    if (candidate.linkedIn) {
      contactLinks.push({ href: ensureHttps(candidate.linkedIn), icon: Linkedin, title: "LinkedIn" });
    }
    if (candidate.github) {
      contactLinks.push({ href: ensureHttps(candidate.github), icon: Github, title: "GitHub" });
    }
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border px-6 pt-4 pb-3">
        {/* Row 1 — Back + status actions */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {showBackButton && (
              <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors lg:hidden" aria-label="Back to candidate list">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Applied {appliedDate}
            </span>
          </div>
          <StatusActions
            currentStatus={application.status}
            isUpdating={!!isUpdatingStatus}
            onAdvance={handleStatusAdvance}
          />
        </div>

        {/* Row 2 — Avatar + name + contacts + pipeline stepper */}
        <div className="flex items-center gap-4">
          <img
            src={getPersonAvatar(candidate.fullName)}
            alt={candidate.fullName}
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0 ring-1 ring-primary/10 bg-muted"
          />
          <div className="min-w-0 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-foreground truncate tracking-tight">{candidate.fullName}</h3>
              {/* Inline contact links */}
              {contactLinks.map((link, idx) => {
                const Icon = link.icon;
                const isExternal = !link.href.startsWith("mailto:") && !link.href.startsWith("tel:");
                return (
                  <a
                    key={idx}
                    href={link.href}
                    {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    title={link.title}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </a>
                );
              })}
            </div>
            {candidate.headline && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">{candidate.headline}</p>
            )}
          </div>
          <div className="flex-1 min-w-0 ml-auto">
            <PipelineStepper
              currentStatus={application.status}
              history={statusHistory ?? []}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-6 py-2 border-b border-border/30 dark:border-border">
        <PillTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content (scrollable) */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* Applied For — hero card */}
            <div className="rounded-xl border border-border bg-muted/30 p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Applied For</p>
              <p className="text-sm font-medium text-foreground">{job.title}</p>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                <span>{job.location}</span>
                {job.type && (
                  <>
                    <span className="text-border dark:text-white/10">&middot;</span>
                    <span>{job.type}</span>
                  </>
                )}
                {job.guild && (
                  <>
                    <span className="text-border dark:text-white/10">&middot;</span>
                    <span>{job.guild}</span>
                  </>
                )}
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Resume card */}
              <div className="col-span-2">
                {resumeUrl ? (
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/20 hover:bg-primary/[0.02] transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">View Resume</p>
                      <p className="text-xs text-muted-foreground mt-0.5">PDF document</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </a>
                ) : (
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-border">
                    <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">No resume uploaded</p>
                  </div>
                )}
              </div>

              {/* Experience */}
              {candidate.experienceLevel && (
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Experience</p>
                  <p className="text-sm font-medium text-foreground capitalize">{candidate.experienceLevel} Level</p>
                </div>
              )}

              {/* Contact card */}
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2.5">Contact</p>
                <div className="space-y-2">
                  <a href={`mailto:${candidate.email}`} className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{candidate.email}</span>
                  </a>
                  {candidate.phone && (
                    <a href={`tel:${candidate.phone}`} className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors">
                      <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />{candidate.phone}
                    </a>
                  )}
                </div>
              </div>

              {/* Links card */}
              {(candidate.socialLinks?.filter((l) => l.url?.trim()).length || candidate.linkedIn || candidate.github) && (
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2.5">Links</p>
                  <div className="space-y-2">
                    {candidate.socialLinks?.filter((l) => l.url?.trim()).map((link, idx) => {
                      const Icon = getPlatformIcon(link.platform);
                      return (
                        <a key={idx} href={ensureHttps(link.url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors">
                          <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />{link.label || link.platform}
                        </a>
                      );
                    })}
                    {!candidate.socialLinks?.length && candidate.linkedIn && (
                      <a href={ensureHttps(candidate.linkedIn)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors">
                        <Linkedin className="w-4 h-4 text-muted-foreground flex-shrink-0" />LinkedIn
                      </a>
                    )}
                    {!candidate.socialLinks?.length && candidate.github && (
                      <a href={ensureHttps(candidate.github)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors">
                        <Github className="w-4 h-4 text-muted-foreground flex-shrink-0" />GitHub
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "application" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border p-4 bg-muted/20">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Applied For</p>
              <p className="text-sm font-medium text-foreground">{job.title}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                <span>{job.location}</span>
                <span className="text-border dark:text-white/10">&middot;</span>
                <span>{job.type}</span>
                {job.salary && formatSalaryRange(job.salary) !== "Salary not specified" && (
                  <>
                    <span className="text-border dark:text-white/10">&middot;</span>
                    <span>{formatSalaryRange(job.salary)}</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Cover Letter</p>
              {application.coverLetter ? (
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{application.coverLetter}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No cover letter provided</p>
              )}
            </div>

            {application.screeningAnswers && application.screeningAnswers.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Screening Answers</p>
                <div className="space-y-3">
                  {application.screeningAnswers.map((answer: string, idx: number) => (
                    <div key={idx} className="rounded-lg border border-border p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Question {idx + 1}</p>
                      <p className="text-sm text-foreground/90 leading-relaxed">{answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "guild-report" && (
          <div className="space-y-6">
            {guildReportLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : guildReportError ? (
              <EmptyState
                icon={Shield}
                title="Failed to load guild report"
                description="There was an error retrieving the guild review data"
              />
            ) : !guildReport?.guildApplication ? (
              <EmptyState
                icon={Shield}
                title="No Guild Review"
                description="This candidate has not been reviewed by a guild for this position"
              />
            ) : (
              <>
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Guild Review Summary</p>
                    <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded text-xs font-medium border ${
                      guildReport.guildApplication.guildApproved
                        ? STATUS_COLORS.positive.badge
                        : guildReport.guildApplication.status === "rejected"
                          ? STATUS_COLORS.negative.badge
                          : STATUS_COLORS.warning.badge
                    }`}>
                      {guildReport.guildApplication.guildApproved ? "Approved" : guildReport.guildApplication.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <p className="text-sm font-medium text-foreground">{guildReport.guildApplication.reviewCount}</p>
                      <p className="text-xs text-muted-foreground">Reviews</p>
                    </div>
                    <div className={`text-center p-3 rounded-lg ${STATUS_COLORS.positive.bgSubtle}`}>
                      <p className={`text-sm font-medium ${STATUS_COLORS.positive.text}`}>{guildReport.guildApplication.approvalCount}</p>
                      <p className="text-xs text-muted-foreground">Approvals</p>
                    </div>
                    <div className={`text-center p-3 rounded-lg ${STATUS_COLORS.negative.bgSubtle}`}>
                      <p className={`text-sm font-medium ${STATUS_COLORS.negative.text}`}>{guildReport.guildApplication.rejectionCount}</p>
                      <p className="text-xs text-muted-foreground">Rejections</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span>Guild: <span className="text-foreground font-medium">{guildReport.guildApplication.guildName}</span></span>
                    <span className="text-border dark:text-white/10">&middot;</span>
                    <span className="capitalize">Expertise: {guildReport.guildApplication.expertiseLevel}</span>
                  </div>
                </div>

                {guildReport.reviews.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Expert Reviews</p>
                    <div className="space-y-3">
                      {guildReport.reviews.map((review) => (
                        <div key={review.id} className="rounded-lg border border-border p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{review.reviewerName}</span>
                              <span className={`inline-flex items-center gap-2 text-xs font-medium ${
                                review.vote === "approve" ? STATUS_COLORS.positive.text : STATUS_COLORS.negative.text
                              }`}>
                                {review.vote === "approve" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {review.vote === "approve" ? "Approved" : "Rejected"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Star className={`w-3 h-3 ${STATUS_COLORS.warning.icon}`} />
                              <span className="text-xs font-medium text-foreground">{review.overallScore}</span>
                            </div>
                          </div>
                          {review.feedback && (
                            <p className="text-sm text-foreground/80 leading-relaxed">{review.feedback}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div>
            {historyLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <StatusTimeline history={statusHistory ?? []} />
            )}
          </div>
        )}

        {activeTab === "notes" && (
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Internal Notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes about this candidate..."
                rows={8}
                className="w-full px-4 py-3 text-sm rounded-lg border border-border bg-background/60 dark:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground resize-none leading-relaxed"
              />
            </div>
            <Button onClick={handleSaveNotes} disabled={isSavingNotes} size="sm">
              {isSavingNotes ? "Saving..." : "Save Notes"}
            </Button>
          </div>
        )}
      </div>

      {/* Footer — Message compose */}
      <div className="flex-shrink-0 border-t border-border/30 dark:border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Message ${firstName}...`}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-border bg-muted/20 dark:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30 focus:bg-background text-foreground placeholder:text-muted-foreground transition-all"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isSendingMessage}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-white disabled:opacity-30 disabled:hover:bg-primary/10 disabled:hover:text-primary transition-all"
          >
            {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
