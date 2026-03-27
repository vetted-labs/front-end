import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Award,
  Star,
  Linkedin,
  Github,
  FileText,
  ExternalLink,
  MapPin,
  DollarSign,
  Briefcase,
  CheckCircle,
  XCircle,
  Zap,
  X,
  User,
  FileSearch,
  Target,
  Clock,
  Mail,
  HelpCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ensureHttps, formatSalaryRange, formatTimeAgo } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";
import type { EndorsementApplication } from "@/types";

interface CandidateDetailsModalProps {
  application: EndorsementApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onEndorseCandidate?: (application: EndorsementApplication) => void;
}

export function CandidateDetailsModal({
  application,
  isOpen,
  onClose,
  onEndorseCandidate
}: CandidateDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'application' | 'job' | 'skills'>('overview');

  const skillMatchData = useMemo(() => {
    if (!application?.job_skills || !application?.candidate_bio) {
      return { percentage: 0, matched: [], missing: [] };
    }
    try {
      const jobSkills = typeof application.job_skills === 'string'
        ? application.job_skills.toLowerCase().split(',').map((s: string) => s.trim())
        : application.job_skills.map((s: string) => s.toLowerCase().trim());
      const candidateBio = application.candidate_bio.toLowerCase();
      const matched = jobSkills.filter((skill: string) => candidateBio.includes(skill));
      const missing = jobSkills.filter((skill: string) => !candidateBio.includes(skill));
      return { percentage: Math.round((matched.length / jobSkills.length) * 100), matched, missing };
    } catch {
      return { percentage: 0, matched: [], missing: [] };
    }
  }, [application?.job_skills, application?.candidate_bio]);

  if (!isOpen || !application) return null;

  const candidateInitials = application.candidate_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  // guild_score is already on a 0-100 scale from IQR consensus scoring
  const guildScore = application.guild_score ? parseFloat(application.guild_score.toString()).toFixed(0) : null;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: User },
    { id: 'application' as const, label: 'Application', icon: FileSearch },
    { id: 'job' as const, label: 'Job Details', icon: Briefcase },
    { id: 'skills' as const, label: 'Skills', icon: Target },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg animate-in fade-in duration-200">
      <div
        className="relative max-w-[740px] w-full mx-4 max-h-[88vh] flex flex-col rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 bg-gradient-to-b from-card/95 to-card/85 backdrop-blur-2xl border border-white/[0.07]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="relative px-6 pt-6 pb-0 flex-shrink-0">
          {/* Ambient glow */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -top-8 right-20 w-32 h-32 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />

          <div className="relative flex items-start gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <Avatar className="w-14 h-14 rounded-xl border border-primary/20 shadow-lg shadow-primary/10">
                {application.candidate_profile_picture_url && (
                  <AvatarImage src={application.candidate_profile_picture_url} alt={application.candidate_name} className="rounded-xl" />
                )}
                <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-lg font-bold">
                  {candidateInitials}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-md ${STATUS_COLORS.positive.bgSubtle} ${STATUS_COLORS.positive.border} flex items-center justify-center`}>
                <CheckCircle className={`w-3 h-3 ${STATUS_COLORS.positive.text}`} />
              </div>
            </div>

            {/* Name + headline */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground leading-tight truncate">{application.candidate_name}</h2>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS.positive.badge}`}>
                  Verified
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">{application.candidate_headline}</p>
            </div>

            {/* Quick links + close */}
            <div className="flex items-center gap-1.5">
              {application.linkedin && (
                <a href={ensureHttps(application.linkedin)} target="_blank" rel="noopener noreferrer"
                  aria-label="LinkedIn profile"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-primary/30 transition-all">
                  <Linkedin className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              )}
              {application.github && (
                <a href={ensureHttps(application.github)} target="_blank" rel="noopener noreferrer"
                  aria-label="GitHub profile"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-primary/30 transition-all">
                  <Github className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              )}
              {application.resume_url && (
                <a href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/candidates/${application.candidate_id}/resume`} target="_blank" rel="noopener noreferrer"
                  aria-label="View resume"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-primary/30 transition-all">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              )}
              {(application.linkedin || application.github || application.resume_url) && (
                <div className="w-px h-5 bg-white/[0.06] mx-0.5" />
              )}
              <button
                onClick={onClose}
                aria-label="Close candidate details"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all flex-shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="relative flex items-center gap-2.5 mt-4 pb-5">
            {skillMatchData.percentage > 0 && (
              <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider leading-none">Skill Match</p>
                  <p className="text-base font-bold text-primary tabular-nums leading-tight mt-0.5">{skillMatchData.percentage}%</p>
                </div>
              </div>
            )}
            {guildScore && (
              <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Star className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider leading-none">Guild Score</p>
                  <p className="text-base font-bold text-primary tabular-nums leading-tight mt-0.5">{guildScore}<span className="text-xs text-muted-foreground font-normal">/100</span></p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-2">
              <div className={`w-8 h-8 rounded-lg ${STATUS_COLORS.positive.bgSubtle} flex items-center justify-center`}>
                <Clock className={`w-4 h-4 ${STATUS_COLORS.positive.text}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider leading-none">Applied</p>
                <p className="text-sm font-medium text-foreground leading-tight mt-0.5">{formatTimeAgo(application.applied_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Separator glow line */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        {/* ── Tab Bar ── */}
        <div className="px-6 pt-3 flex-shrink-0">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all border ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-primary/15 to-accent/10 text-primary border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border-transparent'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-3">

          {/* Overview */}
          {activeTab === 'overview' && (
            <>
              {/* Bio */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                    <User className="w-3 h-3 text-primary" />
                  </div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bio</h3>
                </div>
                {application.candidate_bio ? (
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{application.candidate_bio}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No bio provided</p>
                )}
              </div>

              {/* Application Summary */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                    <Briefcase className="w-3 h-3 text-primary" />
                  </div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Application Summary</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
                    <span className="text-xs text-muted-foreground">Position</span>
                    <span className="text-sm font-medium text-foreground">{application.job_title}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2.5">
                    <span className="text-xs text-muted-foreground">Company</span>
                    <span className="text-sm font-medium text-foreground">{application.company_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border ${STATUS_COLORS.warning.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS.warning.dot}`} />
                      {application.status || 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Applied</span>
                    <span className="text-sm text-foreground">{new Date(application.applied_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Highlights */}
              {(application.experience_level || skillMatchData.percentage > 0) && (
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                      <Zap className="w-3 h-3 text-primary" />
                    </div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Highlights</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {application.experience_level && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-foreground">
                        {application.experience_level}
                      </span>
                    )}
                    {skillMatchData.percentage > 0 && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                        {skillMatchData.percentage}% Match
                      </span>
                    )}
                    {skillMatchData.matched.length > 0 && skillMatchData.matched.slice(0, 4).map((skill: string, i: number) => (
                      <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-foreground capitalize">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Application */}
          {activeTab === 'application' && (
            <>
              {application.cover_letter && (
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                      <Mail className="w-3 h-3 text-primary" />
                    </div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cover Letter</h3>
                  </div>
                  <div className="pl-3 border-l-2 border-primary/20">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">{application.cover_letter}</p>
                  </div>
                </div>
              )}

              {application.screening_answers && Object.keys(application.screening_answers).length > 0 && (
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                      <HelpCircle className="w-3 h-3 text-primary" />
                    </div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Screening Questions</h3>
                  </div>
                  <div className="space-y-2.5">
                    {Object.entries(application.screening_answers).map(([question, answer], idx) => (
                      <div key={idx} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{question}</p>
                        <p className="text-sm text-foreground">{answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!application.cover_letter && (!application.screening_answers || Object.keys(application.screening_answers).length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No additional application materials provided.</p>
                </div>
              )}
            </>
          )}

          {/* Job Details */}
          {activeTab === 'job' && (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-4">
              {/* Job header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">{application.job_title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{application.company_name}</p>
                </div>
              </div>

              {/* Meta chips */}
              <div className="flex flex-wrap gap-2">
                {application.location && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5">
                    <MapPin className="w-3 h-3" /> {application.location}
                  </span>
                )}
                {application.job_type && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5">
                    <Briefcase className="w-3 h-3" /> {application.job_type}
                  </span>
                )}
                {(application.salary_min || application.salary_max) && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5">
                    <DollarSign className="w-3 h-3" />
                    {formatSalaryRange({ min: application.salary_min, max: application.salary_max, currency: application.salary_currency })}
                  </span>
                )}
              </div>

              {application.job_description && (
                <>
                  <div className="h-px bg-white/[0.06]" />
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{application.job_description}</p>
                  </div>
                </>
              )}

              {application.requirements && application.requirements.length > 0 && (
                <>
                  <div className="h-px bg-white/[0.06]" />
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Requirements</h4>
                    <div className="space-y-2">
                      {application.requirements.map((req: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle className="w-2.5 h-2.5 text-primary" />
                          </div>
                          <span className="text-sm text-foreground">{req}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {application.job_skills && (
                <>
                  <div className="h-px bg-white/[0.06]" />
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Required Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(application.job_skills)
                        ? application.job_skills
                        : application.job_skills.split(',')
                      ).map((skill: string, i: number) => (
                        <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-foreground">
                          {skill.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Skills Match */}
          {activeTab === 'skills' && (
            <>
              {/* Overall match */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-primary" />
                    </div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overall Match</h3>
                  </div>
                  <span className="text-2xl font-bold tabular-nums text-primary">{skillMatchData.percentage}%</span>
                </div>
                <Progress
                  value={skillMatchData.percentage}
                  className={`h-2 ${
                    skillMatchData.percentage >= 70
                      ? '[&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-accent'
                      : skillMatchData.percentage >= 40
                      ? '[&>div]:bg-warning'
                      : '[&>div]:bg-negative'
                  }`}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Based on matching job requirements with candidate bio and experience
                </p>
              </div>

              {/* Matched skills */}
              {skillMatchData.matched.length > 0 && (
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-5 h-5 rounded-md ${STATUS_COLORS.positive.bgSubtle} flex items-center justify-center`}>
                      <CheckCircle className={`w-3 h-3 ${STATUS_COLORS.positive.text}`} />
                    </div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Matched <span className={STATUS_COLORS.positive.text}>({skillMatchData.matched.length})</span>
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {skillMatchData.matched.map((skill: string, i: number) => (
                      <span key={i} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border ${STATUS_COLORS.positive.badge}`}>
                        <CheckCircle className="w-3 h-3" /> {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing skills */}
              {skillMatchData.missing.length > 0 && (
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-5 h-5 rounded-md ${STATUS_COLORS.negative.bgSubtle} flex items-center justify-center`}>
                      <XCircle className={`w-3 h-3 ${STATUS_COLORS.negative.text}`} />
                    </div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Missing <span className={STATUS_COLORS.negative.text}>({skillMatchData.missing.length})</span>
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {skillMatchData.missing.map((skill: string, i: number) => (
                      <span key={i} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border ${STATUS_COLORS.negative.badge}`}>
                        <XCircle className="w-3 h-3" /> {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Guild review score */}
              {guildScore && (
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Award className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Guild Review Score</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Community consensus evaluation</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-primary tabular-nums">{guildScore}</span>
                      <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 pb-5 pt-4 border-t border-white/[0.06] flex-shrink-0">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 text-sm font-medium rounded-xl border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all"
            >
              Close
            </Button>
            <button
              disabled={!onEndorseCandidate}
              onClick={() => {
                onClose();
                onEndorseCandidate?.(application);
              }}
              className="flex-[1.4] h-11 flex items-center justify-center gap-2 text-sm font-bold rounded-xl bg-gradient-to-r from-primary via-primary to-accent text-[hsl(var(--gradient-button-text))] shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Zap className="w-4 h-4" />
              Endorse Candidate
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
