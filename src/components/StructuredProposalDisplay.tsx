"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Briefcase,
  GraduationCap,
  Heart,
  Link as LinkIcon,
  Award,
  Calendar
} from "lucide-react";

interface StructuredProposalDisplayProps {
  proposal: {
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
}

export function StructuredProposalDisplay({ proposal, compact = false }: StructuredProposalDisplayProps) {
  const hasStructuredData =
    proposal.skills_summary ||
    proposal.experience_summary ||
    proposal.motivation_statement;

  // If no structured data exists, fall back to legacy display
  if (!hasStructuredData && proposal.proposal_text) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {proposal.proposal_text}
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {proposal.years_of_experience !== undefined && proposal.years_of_experience > 0 && (
            <>
              <Calendar className="w-4 h-4" />
              <span>{proposal.years_of_experience} years experience</span>
            </>
          )}
        </div>

        {proposal.skills_summary && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Skills</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {proposal.skills_summary}
            </p>
          </div>
        )}

        {proposal.motivation_statement && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Motivation</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {proposal.motivation_statement}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Candidate Info Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-border">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{proposal.candidate_name}</h3>
          <p className="text-sm text-muted-foreground">{proposal.candidate_email}</p>
        </div>
        {proposal.years_of_experience !== undefined && proposal.years_of_experience > 0 && (
          <Badge variant="secondary" className="text-base px-3 py-1">
            <Calendar className="w-4 h-4 mr-2" />
            {proposal.years_of_experience} years
          </Badge>
        )}
      </div>

      {/* Skills Summary */}
      {proposal.skills_summary && (
        <Card className="border-l-4 border-l-primary/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h4 className="font-semibold">Skills & Technical Competencies</h4>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {proposal.skills_summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Experience Summary */}
      {proposal.experience_summary && (
        <Card className="border-l-4 border-l-blue-500/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-5 h-5 text-blue-500" />
              <h4 className="font-semibold">Professional Experience</h4>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {proposal.experience_summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Motivation Statement */}
      {proposal.motivation_statement && (
        <Card className="border-l-4 border-l-purple-500/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 text-purple-500" />
              <h4 className="font-semibold">Motivation & Guild Alignment</h4>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {proposal.motivation_statement}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Credibility Evidence */}
      {proposal.credibility_evidence && (
        <Card className="border-l-4 border-l-green-500/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <LinkIcon className="w-5 h-5 text-green-500" />
              <h4 className="font-semibold">Portfolio & Credibility</h4>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-1">
              {proposal.credibility_evidence.split('\n').map((line, index) => {
                const trimmedLine = line.trim();
                if (!trimmedLine) return null;

                // Check if line is a URL
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
          </CardContent>
        </Card>
      )}

      {/* Key Achievements */}
      {proposal.achievements && proposal.achievements.length > 0 && (
        <Card className="border-l-4 border-l-amber-500/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-amber-500" />
              <h4 className="font-semibold">Key Achievements</h4>
            </div>
            <ul className="space-y-2">
              {proposal.achievements.map((achievement, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span className="flex-1">{achievement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
