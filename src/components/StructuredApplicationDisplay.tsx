"use client";

interface StructuredApplicationDisplayProps {
  application: {
    candidate_name: string;
    candidate_email: string;
    years_of_experience?: number;
    skills_summary?: string;
    experience_summary?: string;
    motivation_statement?: string;
    credibility_evidence?: string;
    achievements?: string[];
    // Legacy field
    proposal_text?: string;
  };
  compact?: boolean;
  showHeader?: boolean;
}

export function StructuredApplicationDisplay({
  application,
  compact = false,
  showHeader = true,
}: StructuredApplicationDisplayProps) {
  const hasStructuredData =
    application.skills_summary ||
    application.experience_summary ||
    application.motivation_statement;

  // If no structured data exists, fall back to legacy display
  if (!hasStructuredData && application.proposal_text) {
    return (
      <div className="space-y-3">
        <p className="text-base text-muted-foreground leading-relaxed">
          {application.proposal_text}
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {application.years_of_experience !== undefined && application.years_of_experience > 0 && (
            <span>{application.years_of_experience} years experience</span>
          )}
        </div>

        {application.skills_summary && (
          <div>
            <span className="text-sm font-medium">Skills</span>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {application.skills_summary}
            </p>
          </div>
        )}

        {application.motivation_statement && (
          <div>
            <span className="text-sm font-medium">Motivation</span>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {application.motivation_statement}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Candidate Info Header — only shown when parent doesn't handle identity */}
      {showHeader && (
        <div className="pb-4 border-b border-border">
          <h3 className="text-lg font-semibold">{application.candidate_name}</h3>
          <p className="text-sm text-muted-foreground">
            {application.candidate_email}
            {application.years_of_experience !== undefined && application.years_of_experience > 0 && (
              <> &middot; {application.years_of_experience} years experience</>
            )}
          </p>
        </div>
      )}

      {/* Skills Summary */}
      {application.skills_summary && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Skills &amp; Technical Competencies
          </h3>
          <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
            {application.skills_summary}
          </p>
        </div>
      )}

      {/* Experience Summary */}
      {application.experience_summary && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Professional Experience
          </h3>
          <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
            {application.experience_summary}
          </p>
        </div>
      )}

      {/* Motivation Statement */}
      {application.motivation_statement && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Motivation &amp; Guild Alignment
          </h3>
          <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
            {application.motivation_statement}
          </p>
        </div>
      )}

      {/* Credibility Evidence */}
      {application.credibility_evidence && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Portfolio &amp; Credibility
          </h3>
          <div className="text-base text-foreground leading-relaxed space-y-1">
            {application.credibility_evidence.split('\n').map((line, index) => {
              const trimmedLine = line.trim();
              if (!trimmedLine) return null;

              const isUrl = trimmedLine.startsWith('http://') || trimmedLine.startsWith('https://');

              return isUrl ? (
                <a
                  key={index}
                  href={trimmedLine}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-primary hover:underline break-all"
                >
                  {trimmedLine}
                </a>
              ) : (
                <p key={index}>{trimmedLine}</p>
              );
            })}
          </div>
        </div>
      )}

      {/* Key Achievements */}
      {application.achievements && application.achievements.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Key Achievements
          </h3>
          <ul className="list-disc pl-4 space-y-1.5">
            {application.achievements.map((achievement, index) => (
              <li key={index} className="text-base text-foreground leading-relaxed">
                {typeof achievement === "string"
                  ? achievement
                  : typeof achievement === "object" && achievement !== null
                  ? `${(achievement as { year?: number; title?: string }).year ? `(${(achievement as { year?: number; title?: string }).year}) ` : ""}${(achievement as { year?: number; title?: string }).title ?? JSON.stringify(achievement)}`
                  : String(achievement)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
