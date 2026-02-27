"use client";

import { FileText, Mail, Briefcase, Linkedin, Github } from "lucide-react";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import { getAssetUrl } from "@/lib/api";
import type { Conversation } from "@/types";

interface CandidateInfoSidebarProps {
  conversation: Conversation;
}

export function CandidateInfoSidebar({ conversation }: CandidateInfoSidebarProps) {
  const status = APPLICATION_STATUS_CONFIG[conversation.applicationStatus] || APPLICATION_STATUS_CONFIG.pending;

  return (
    <div className="w-72 border-l border-border/40 dark:border-white/[0.06] bg-card/20 dark:bg-card/10 hidden xl:block overflow-y-auto">
      <div className="p-5 space-y-4">
        {/* Candidate identity */}
        <div className="text-center border-b border-border/20 dark:border-white/[0.04] pb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 ring-2 ring-primary/20 shadow-sm flex items-center justify-center mx-auto mb-2">
            <span className="text-primary font-bold text-lg">
              {conversation.candidateName.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground">{conversation.candidateName}</p>
          {conversation.candidateHeadline && (
            <p className="text-xs text-muted-foreground mt-0.5">{conversation.candidateHeadline}</p>
          )}
        </div>

        {/* Contact */}
        <div className="space-y-2 border-b border-border/20 dark:border-white/[0.04] pb-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Contact</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="w-3.5 h-3.5" />
            <span className="truncate">{conversation.candidateEmail}</span>
          </div>
        </div>

        {/* Experience */}
        {conversation.candidateExperienceLevel && (
          <div className="space-y-2 border-b border-border/20 dark:border-white/[0.04] pb-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Experience</p>
            <p className="text-xs text-foreground capitalize">{conversation.candidateExperienceLevel}</p>
          </div>
        )}

        {/* Application */}
        <div className="space-y-2 border-b border-border/20 dark:border-white/[0.04] pb-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Application</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Briefcase className="w-3.5 h-3.5" />
            <span className="truncate">{conversation.jobTitle}</span>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${status.className}`}>
            {status.label}
          </span>
        </div>

        {/* Socials */}
        {(conversation.candidateLinkedIn || conversation.candidateGithub) && (
          <div className="space-y-2 border-b border-border/20 dark:border-white/[0.04] pb-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Socials</p>
            <div className="flex items-center gap-2">
              {conversation.candidateLinkedIn && (
                <a
                  href={conversation.candidateLinkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-muted/40 hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
              {conversation.candidateGithub && (
                <a
                  href={conversation.candidateGithub}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-muted/40 hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                >
                  <Github className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Resume link */}
        {conversation.candidateResumeUrl && (
          <a
            href={getAssetUrl(conversation.candidateResumeUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium w-full text-center hover:bg-primary/15 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            View Resume
          </a>
        )}
      </div>
    </div>
  );
}
