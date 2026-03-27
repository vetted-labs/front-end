import {
  Mail,
  Phone,
  Linkedin,
  Github,
  ExternalLink,
  FileText,
  Wallet,
} from "lucide-react";
import { truncateAddress, ensureHttps } from "@/lib/utils";
import type { CandidateProfile } from "@/types";
import { getPlatformIcon } from "@/lib/social-links";

interface CandidateModalProfileProps {
  candidate: CandidateProfile;
  resumeUrl: string | null;
}

export function CandidateModalProfile({ candidate, resumeUrl }: CandidateModalProfileProps) {
  const hasSocialLinks = candidate.socialLinks && candidate.socialLinks.some((l) => l.url?.trim());
  const hasLegacy = candidate.linkedIn || candidate.github;

  return (
    <div className="space-y-6">
      {/* Resume card */}
      <div className="rounded-lg border border-border p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Resume
        </p>
        {resumeUrl ? (
          <a
            href={resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <FileText className="w-4 h-4" />
            View / Download Resume
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">
            No resume uploaded
          </p>
        )}
      </div>

      {/* Contact info */}
      <div className="rounded-lg border border-border p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Contact Info
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={`mailto:${candidate.email}`}
            className="flex items-center gap-2 text-sm text-foreground/90 hover:text-primary transition-colors"
          >
            <Mail className="w-4 h-4 text-muted-foreground" />
            {candidate.email}
          </a>
          {candidate.phone && (
            <a
              href={`tel:${candidate.phone}`}
              className="flex items-center gap-2 text-sm text-foreground/90 hover:text-primary transition-colors"
            >
              <Phone className="w-4 h-4 text-muted-foreground" />
              {candidate.phone}
            </a>
          )}
        </div>
      </div>

      {/* Social links */}
      {(hasSocialLinks || hasLegacy) && (
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
            Social Profiles
          </p>
          <div className="space-y-2">
            {hasSocialLinks
              ? candidate.socialLinks!
                  .filter((link) => link.url?.trim())
                  .map((link, idx) => {
                    const Icon = getPlatformIcon(link.platform);
                    return (
                      <a
                        key={idx}
                        href={ensureHttps(link.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-foreground/90 hover:text-primary transition-colors"
                      >
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        {link.label}
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
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
                      className="flex items-center gap-2 text-sm text-foreground/90 hover:text-primary transition-colors"
                    >
                      <Linkedin className="w-4 h-4 text-muted-foreground" />
                      LinkedIn
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </a>
                  )}
                  {candidate.github && (
                    <a
                      href={ensureHttps(candidate.github)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-foreground/90 hover:text-primary transition-colors"
                    >
                      <Github className="w-4 h-4 text-muted-foreground" />
                      GitHub
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </a>
                  )}
                </>
              )}
          </div>
        </div>
      )}

      {/* Experience & Wallet */}
      <div className="flex flex-wrap gap-3">
        {candidate.experienceLevel && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground/80 capitalize">
            {candidate.experienceLevel} level
          </span>
        )}
        {candidate.walletAddress && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-muted-foreground">
            <Wallet className="w-3 h-3" />
            {truncateAddress(candidate.walletAddress)}
          </span>
        )}
      </div>
    </div>
  );
}
