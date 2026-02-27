"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  Linkedin,
  Github,
  ExternalLink,
  FileText,
  Wallet,
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
import { useFetch } from "@/lib/hooks/useFetch";
import { logger } from "@/lib/logger";
import { truncateAddress, ensureHttps, formatSalaryRange } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CompanyApplication, CandidateGuildReport } from "@/types";
import { getPlatformIcon } from "@/lib/social-links";

type TabValue = "profile" | "application" | "guild-report" | "notes";

const tabs: { value: TabValue; label: string }[] = [
  { value: "profile", label: "Profile" },
  { value: "application", label: "Application" },
  { value: "guild-report", label: "Guild Report" },
  { value: "notes", label: "Notes" },
];

interface CandidateDetailPanelProps {
  application: CompanyApplication;
  onStatusChange: (applicationId: string, newStatus: string) => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function CandidateDetailPanel({
  application,
  onStatusChange,
  onBack,
  showBackButton,
}: CandidateDetailPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabValue>("profile");
  const [notes, setNotes] = useState(application.notes ?? "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Sync notes when the selected application changes
  useEffect(() => {
    setNotes(application.notes ?? "");
    setNotesSaved(false);
  }, [application.id, application.notes]);

  const { candidate, job } = application;

  const { data: guildReport, isLoading: guildReportLoading, error: guildReportError } = useFetch<CandidateGuildReport>(
    () => companyApi.getCandidateGuildReport(application.candidateId, application.jobId),
  );

  const resumeUrl = application.resumeUrl ? getAssetUrl(application.resumeUrl) : null;

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setIsSendingMessage(true);
    try {
      const result = await messagingApi.startConversation({
        applicationId: application.id,
        message: message.trim(),
      });
      toast.success("Message sent!");
      setMessage("");
      router.push(`/dashboard/messages/${result.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        try {
          const existing = await messagingApi.getConversationByApplication(application.id);
          if (existing) {
            router.push(`/dashboard/messages/${existing.id}`);
            return;
          }
        } catch {
          // fall through
        }
      }
      toast.error("Failed to send message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await applicationsApi.updateStatus(application.id, application.status, notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (error) {
      logger.error("Error saving notes", error, { silent: true });
      toast.error("Failed to save notes");
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/40 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {showBackButton && (
              <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors lg:hidden">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-semibold text-sm">
                {candidate.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-medium text-foreground truncate">{candidate.fullName}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {candidate.headline || candidate.email}
                {candidate.experienceLevel && ` · ${candidate.experienceLevel}`}
              </p>
            </div>
          </div>
          <Select
            value={application.status}
            onValueChange={(newStatus) => onStatusChange(application.id, newStatus)}
          >
            <SelectTrigger className="h-7 w-[120px] text-xs flex-shrink-0">
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

        {/* Contact links */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <a href={`mailto:${candidate.email}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Mail className="w-3 h-3" />{candidate.email}
          </a>
          {candidate.phone && (
            <a href={`tel:${candidate.phone}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Phone className="w-3 h-3" />{candidate.phone}
            </a>
          )}
          {candidate.socialLinks?.filter((l) => l.url?.trim()).map((link, idx) => {
            const Icon = getPlatformIcon(link.platform);
            return (
              <a key={idx} href={ensureHttps(link.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Icon className="w-3 h-3" />{link.label}
              </a>
            );
          })}
          {!candidate.socialLinks?.length && candidate.linkedIn && (
            <a href={ensureHttps(candidate.linkedIn)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Linkedin className="w-3 h-3" />LinkedIn
            </a>
          )}
          {!candidate.socialLinks?.length && candidate.github && (
            <a href={ensureHttps(candidate.github)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Github className="w-3 h-3" />GitHub
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-border/30 dark:border-white/[0.04]">
        <PillTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Tab Content (scrollable) */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {activeTab === "profile" && (
          <div className="space-y-5">
            <div className="rounded-lg border border-border/40 dark:border-white/[0.06] p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Resume</p>
              {resumeUrl ? (
                <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                  <FileText className="w-4 h-4" />View / Download Resume<ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">No resume uploaded</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {candidate.experienceLevel && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 dark:border-white/[0.06] text-xs font-medium text-foreground/80 capitalize">
                  {candidate.experienceLevel} level
                </span>
              )}
              {candidate.walletAddress && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 dark:border-white/[0.06] text-xs font-mono text-muted-foreground">
                  <Wallet className="w-3 h-3" />{truncateAddress(candidate.walletAddress)}
                </span>
              )}
            </div>
          </div>
        )}

        {activeTab === "application" && (
          <div className="space-y-5">
            <div className="rounded-lg border border-border/40 dark:border-white/[0.06] p-4 bg-muted/20 dark:bg-white/[0.02]">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Applied For</p>
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
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Cover Letter</p>
              {application.coverLetter ? (
                <div className="rounded-lg border border-border/40 dark:border-white/[0.06] p-4">
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{application.coverLetter}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No cover letter provided</p>
              )}
            </div>

            {application.screeningAnswers && application.screeningAnswers.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Screening Answers</p>
                <div className="space-y-3">
                  {application.screeningAnswers.map((answer: string, idx: number) => (
                    <div key={idx} className="rounded-lg border border-border/40 dark:border-white/[0.06] p-4">
                      <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Question {idx + 1}</p>
                      <p className="text-sm text-foreground/90 leading-relaxed">{answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "guild-report" && (
          <div className="space-y-5">
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
                <div className="rounded-lg border border-border/40 dark:border-white/[0.06] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Guild Review Summary</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                      guildReport.guildApplication.guildApproved
                        ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                        : guildReport.guildApplication.status === "rejected"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    }`}>
                      {guildReport.guildApplication.guildApproved ? "Approved" : guildReport.guildApplication.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-lg bg-muted/30 dark:bg-white/[0.02]">
                      <p className="text-lg font-semibold text-foreground">{guildReport.guildApplication.reviewCount}</p>
                      <p className="text-[11px] text-muted-foreground">Reviews</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-500/5">
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">{guildReport.guildApplication.approvalCount}</p>
                      <p className="text-[11px] text-muted-foreground">Approvals</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-500/5">
                      <p className="text-lg font-semibold text-red-600 dark:text-red-400">{guildReport.guildApplication.rejectionCount}</p>
                      <p className="text-[11px] text-muted-foreground">Rejections</p>
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
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Expert Reviews</p>
                    <div className="space-y-3">
                      {guildReport.reviews.map((review) => (
                        <div key={review.id} className="rounded-lg border border-border/40 dark:border-white/[0.06] p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{review.reviewerName}</span>
                              <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
                                review.vote === "approve" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              }`}>
                                {review.vote === "approve" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {review.vote === "approve" ? "Approved" : "Rejected"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-500" />
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

        {activeTab === "notes" && (
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Internal Notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes about this candidate..."
                rows={8}
                className="w-full px-4 py-3 text-sm rounded-lg border border-border/60 dark:border-white/[0.08] bg-background/60 dark:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground resize-none leading-relaxed"
              />
            </div>
            <Button onClick={handleSaveNotes} disabled={isSavingNotes} size="sm">
              {isSavingNotes ? "Saving..." : notesSaved ? "Saved!" : "Save Notes"}
            </Button>
          </div>
        )}
      </div>

      {/* Footer — Message compose */}
      <div className="flex-shrink-0 border-t border-border/40 px-5 py-3 space-y-2">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
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
              placeholder={`Message ${candidate.fullName}...`}
              className="w-full pl-4 pr-12 py-2 text-sm rounded-full border border-border/60 dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-background text-foreground placeholder:text-muted-foreground transition-all"
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSendingMessage}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              {isSendingMessage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          Applied {new Date(application.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}
