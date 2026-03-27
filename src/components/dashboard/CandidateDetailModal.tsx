"use client";

import { useState } from "react";
import {
  Mail,
  Phone,
  Linkedin,
  Github,
  Calendar,
  Send,
  Loader2,
} from "lucide-react";
import { applicationsApi, companyApi, getAssetUrl, messagingApi, ApiError } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { logger } from "@/lib/logger";
import { ensureHttps, formatSalaryRange } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { CandidateModalProfile } from "./CandidateModalProfile";
import { CandidateModalGuildReport } from "./CandidateModalGuildReport";

type TabValue = "profile" | "application" | "guild-report" | "notes";

const tabs: { value: TabValue; label: string }[] = [
  { value: "profile", label: "Profile" },
  { value: "application", label: "Application" },
  { value: "guild-report", label: "Guild Report" },
  { value: "notes", label: "Notes" },
];

interface CandidateDetailModalProps {
  application: CompanyApplication;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (applicationId: string, newStatus: string) => void;
}

export function CandidateDetailModal({
  application,
  isOpen,
  onClose,
  onStatusChange,
}: CandidateDetailModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabValue>("profile");
  const [notes, setNotes] = useState(application.notes ?? "");
  const { execute: executeSaveNotes, isLoading: isSavingNotes } = useApi();
  const [message, setMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const { candidate, job } = application;

  const { data: guildReport } = useFetch<CandidateGuildReport>(
    () => companyApi.getCandidateGuildReport(application.candidateId, application.jobId),
  );

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
      // 409 = conversation already exists — find it and navigate there
      if (err instanceof ApiError && err.status === 409) {
        try {
          const existing = await messagingApi.getConversationByApplication(application.id);
          if (existing) {
            router.push(`/dashboard/messages/${existing.id}`);
            return;
          }
        } catch {
          // fall through to generic error
        }
      }
      toast.error("Failed to send message");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSaveNotes = async () => {
    await executeSaveNotes(
      () => applicationsApi.updateStatus(application.id, application.status, notes),
      {
        onSuccess: () => toast.success("Notes saved!"),
        onError: (errorMsg) => {
          logger.error("Error saving notes", errorMsg, { silent: true });
          toast.error("Failed to save notes");
        },
      }
    );
  };

  const resumeUrl = application.resumeUrl
    ? getAssetUrl(application.resumeUrl)
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* ── Header ── */}
        <div className="flex-shrink-0 border-b border-border/40 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-medium text-sm">
                  {candidate.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-foreground truncate">
                  {candidate.fullName}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {candidate.headline && (
                    <span>{candidate.headline}</span>
                  )}
                  {candidate.headline && candidate.experienceLevel && (
                    <span> &middot; </span>
                  )}
                  {candidate.experienceLevel && (
                    <span className="capitalize">
                      {candidate.experienceLevel}
                    </span>
                  )}
                  {!candidate.headline && !candidate.experienceLevel && (
                    <span>{candidate.email}</span>
                  )}
                </p>
              </div>
            </div>
            <Select
              value={application.status}
              onValueChange={(newStatus) =>
                onStatusChange(application.id, newStatus)
              }
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

          {/* Contact quick-links row */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <a
              href={`mailto:${candidate.email}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="w-3 h-3" />
              {candidate.email}
            </a>
            {candidate.phone && (
              <a
                href={`tel:${candidate.phone}`}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="w-3 h-3" />
                {candidate.phone}
              </a>
            )}
            {/* Dynamic social links with fallback to legacy fields */}
            {candidate.socialLinks && candidate.socialLinks.length > 0
              ? candidate.socialLinks
                  .filter((link) => link.url?.trim())
                  .map((link, idx) => {
                    const Icon = getPlatformIcon(link.platform);
                    return (
                      <a
                        key={idx}
                        href={ensureHttps(link.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Icon className="w-3 h-3" />
                        {link.label}
                      </a>
                    );
                  })
              : (
                <>
                  {candidate.linkedIn && (
                    <a
                      href={ensureHttps(candidate.linkedIn)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Linkedin className="w-3 h-3" />
                      LinkedIn
                    </a>
                  )}
                  {candidate.github && (
                    <a
                      href={ensureHttps(candidate.github)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Github className="w-3 h-3" />
                      GitHub
                    </a>
                  )}
                </>
              )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex-shrink-0 px-6 py-3 border-b border-border/30 dark:border-white/[0.04]">
          <PillTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* ── Tab Content (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <CandidateModalProfile candidate={candidate} resumeUrl={resumeUrl} />
          )}

          {/* Application Tab */}
          {activeTab === "application" && (
            <div className="space-y-5">
              {/* Position summary */}
              <div className="rounded-lg border border-border/40 dark:border-white/[0.06] p-4 bg-muted/20 dark:bg-white/[0.02]">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Applied For
                </p>
                <p className="text-sm font-medium text-foreground">
                  {job.title}
                </p>
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

              {/* Cover letter */}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Cover Letter
                </p>
                {application.coverLetter ? (
                  <div className="rounded-lg border border-border/40 dark:border-white/[0.06] p-4">
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {application.coverLetter}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No cover letter provided
                  </p>
                )}
              </div>

              {/* Screening answers */}
              {application.screeningAnswers &&
                application.screeningAnswers.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                      Screening Answers
                    </p>
                    <div className="space-y-3">
                      {application.screeningAnswers.map(
                        (answer: string, idx: number) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-border/40 dark:border-white/[0.06] p-4"
                          >
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">
                              Question {idx + 1}
                            </p>
                            <p className="text-sm text-foreground/90 leading-relaxed">
                              {answer}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Guild Report Tab */}
          {activeTab === "guild-report" && (
            <div className="space-y-5">
              <CandidateModalGuildReport guildReport={guildReport} />
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Internal Notes
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal notes about this candidate..."
                  rows={8}
                  className="w-full px-4 py-3 text-sm rounded-lg border border-border/60 dark:border-white/[0.08] bg-background/60 dark:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground resize-none leading-relaxed"
                />
              </div>
              <Button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                size="sm"
              >
                {isSavingNotes ? "Saving..." : "Save Notes"}
              </Button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 border-t border-border/40 px-6 py-4 space-y-3">
          {/* Chat input pill */}
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
                className="w-full pl-4 pr-12 py-2.5 text-sm rounded-full border border-border/60 dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-background text-foreground placeholder:text-muted-foreground transition-all"
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSendingMessage}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                {isSendingMessage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Applied{" "}
              {new Date(application.appliedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
