import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Briefcase, DollarSign, Award, Star, Linkedin, Github, FileText, ExternalLink, Eye, Zap } from 'lucide-react';
import { useMemo } from 'react';

interface ApplicationCardProps {
  application: any;
  onViewDetails: (application: any) => void;
  onQuickEndorse: (application: any) => void;
}

export function ApplicationCard({ application, onViewDetails, onQuickEndorse }: ApplicationCardProps) {
  // Helper function to ensure URL has protocol
  const ensureHttps = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  const candidateInitials = application.candidate_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  // Calculate skill match percentage
  const skillMatch = useMemo(() => {
    if (!application.job_skills || !application.candidate_bio) return null;

    try {
      const jobSkills = typeof application.job_skills === 'string'
        ? application.job_skills.toLowerCase().split(',').map((s: string) => s.trim())
        : application.job_skills.map((s: string) => s.toLowerCase().trim());

      const candidateBio = application.candidate_bio.toLowerCase();

      const matchedSkills = jobSkills.filter((skill: string) =>
        candidateBio.includes(skill)
      );

      return Math.round((matchedSkills.length / jobSkills.length) * 100);
    } catch (error) {
      return null;
    }
  }, [application.job_skills, application.candidate_bio]);

  // Parse skills for display
  const skillsArray = useMemo(() => {
    if (!application.job_skills) return [];

    try {
      if (Array.isArray(application.job_skills)) {
        return application.job_skills;
      }
      return application.job_skills.split(',').map((s: string) => s.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }, [application.job_skills]);

  const formatSalary = (min?: number, max?: number, currency = 'USD') => {
    if (!min) return null;
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    });

    if (max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    }
    return formatter.format(min);
  };

  const guildScore = application.guild_score ? (parseFloat(application.guild_score.toString()) * 10).toFixed(0) : null;

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden transition-all hover:border-primary/40 hover:shadow-sm h-full flex flex-col">
      <CardContent className="p-6 flex flex-col flex-1">
        {/* Header with Avatar and Basic Info */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="w-16 h-16 border-2 border-border">
            {application.candidate_profile_picture_url && (
              <AvatarImage src={application.candidate_profile_picture_url} alt={application.candidate_name} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
              {candidateInitials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{application.candidate_name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
              {application.candidate_headline}
            </p>

            {/* Badges Row */}
            <div className="flex flex-wrap gap-2">
              {application.experience_level && (
                <Badge variant="secondary" className="text-xs">
                  {application.experience_level}
                </Badge>
              )}
              {skillMatch !== null && (
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    skillMatch >= 70
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : skillMatch >= 40
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20'
                  }`}
                >
                  <Star className="w-3 h-3 mr-1" />
                  {skillMatch}% Match
                </Badge>
              )}
              {guildScore && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                  <Award className="w-3 h-3 mr-1" />
                  {guildScore}/100
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Bio Preview */}
        {application.candidate_bio && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {application.candidate_bio}
            </p>
          </div>
        )}

        {/* Quick Links */}
        {(application.linkedin || application.github || application.resume_url) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {application.linkedin && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(ensureHttps(application.linkedin), '_blank', 'noopener,noreferrer');
                }}
              >
                <Linkedin className="w-3 h-3 mr-1" />
                LinkedIn
                <ExternalLink className="w-2 h-2 ml-1" />
              </Button>
            )}
            {application.github && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(ensureHttps(application.github), '_blank', 'noopener,noreferrer');
                }}
              >
                <Github className="w-3 h-3 mr-1" />
                GitHub
                <ExternalLink className="w-2 h-2 ml-1" />
              </Button>
            )}
            {application.resume_url && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/candidates/${application.candidate_id}/resume`, '_blank', 'noopener,noreferrer');
                }}
              >
                <FileText className="w-3 h-3 mr-1" />
                Resume
                <ExternalLink className="w-2 h-2 ml-1" />
              </Button>
            )}
          </div>
        )}

        {/* Skills Preview */}
        {skillsArray.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5">
              {skillsArray.slice(0, 5).map((skill: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {skillsArray.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{skillsArray.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Job Section */}
        <div className="border-t border-border/60 pt-4 mb-4">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-xs text-muted-foreground">Applied to:</h4>
          </div>
          <p className="font-semibold truncate text-sm">{application.job_title}</p>
          <p className="text-xs text-muted-foreground truncate">{application.company_name}</p>

          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
            {application.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" />
                {application.location}
              </span>
            )}
            {application.job_type && (
              <span className="flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-primary" />
                {application.job_type}
              </span>
            )}
            {(application.salary_min || application.salary_max) && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-primary" />
                {formatSalary(application.salary_min, application.salary_max, application.salary_currency)}
              </span>
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60 text-xs text-muted-foreground mb-4">
          <span>
            Applied {formatDistanceToNow(new Date(application.applied_at), { addSuffix: true })}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <Button
            variant="outline"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(application);
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
          <Button
            className="w-full bg-gradient-to-r from-primary to-accent text-[hsl(var(--gradient-button-text))]"
            onClick={(e) => {
              e.stopPropagation();
              onQuickEndorse(application);
            }}
          >
            <Zap className="w-4 h-4 mr-2" />
            Endorse Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
