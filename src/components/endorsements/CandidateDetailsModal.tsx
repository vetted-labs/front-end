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
  Target
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface CandidateDetailsModalProps {
  application: any | null;
  isOpen: boolean;
  onClose: () => void;
  onEndorseCandidate: (application: any) => void;
}

export function CandidateDetailsModal({
  application,
  isOpen,
  onClose,
  onEndorseCandidate
}: CandidateDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'application' | 'job' | 'skills'>('overview');

  const ensureHttps = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

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

  const formatSalary = (min?: number, max?: number, currency = 'USD') => {
    if (!min) return 'Not specified';
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 });
    return max ? `${formatter.format(min)} - ${formatter.format(max)}` : formatter.format(min);
  };

  const guildScore = application.guild_score ? (parseFloat(application.guild_score.toString()) * 10).toFixed(0) : null;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: User },
    { id: 'application' as const, label: 'Application', icon: FileSearch },
    { id: 'job' as const, label: 'Job Details', icon: Briefcase },
    { id: 'skills' as const, label: 'Skills', icon: Target },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg animate-in fade-in duration-200">
      <div
        className="relative max-w-[720px] w-full mx-4 max-h-[90vh] flex flex-col rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 bg-card/80 backdrop-blur-2xl border border-white/[0.08] dark:bg-card/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="relative overflow-hidden px-6 pt-7 pb-6 flex-shrink-0">
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-primary/15 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/8 rounded-full blur-[60px] pointer-events-none" />

          <div className="relative flex items-start justify-between gap-4">
            {/* Candidate info */}
            <div className="flex items-center gap-4 min-w-0">
              <Avatar className="w-14 h-14 border-2 border-white/[0.1] shadow-lg flex-shrink-0">
                {application.candidate_profile_picture_url && (
                  <AvatarImage src={application.candidate_profile_picture_url} alt={application.candidate_name} />
                )}
                <AvatarFallback className="bg-primary/15 text-primary text-lg font-bold">
                  {candidateInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground leading-tight truncate">{application.candidate_name}</h2>
                  <Badge className="border-primary/20 bg-primary/10 text-primary text-[10px] px-1.5 py-0">
                    Verified
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate mt-0.5">{application.candidate_headline}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {application.experience_level && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{application.experience_level}</Badge>
                  )}
                  {skillMatchData.percentage > 0 && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                      skillMatchData.percentage >= 70
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : skillMatchData.percentage >= 40
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20'
                    }`}>
                      <Star className="w-2.5 h-2.5 mr-0.5" />
                      {skillMatchData.percentage}%
                    </Badge>
                  )}
                  {guildScore && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
                      <Award className="w-2.5 h-2.5 mr-0.5" />
                      {guildScore}/100
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/[0.06] transition-all flex-shrink-0"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Score cards + links row */}
          <div className="relative mt-4 flex flex-wrap items-center gap-3">
            {skillMatchData.percentage > 0 && (
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Match</p>
                <p className="text-lg font-bold text-primary tabular-nums">{skillMatchData.percentage}%</p>
              </div>
            )}
            {guildScore && (
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Guild</p>
                <p className="text-lg font-bold text-primary tabular-nums">{guildScore}</p>
              </div>
            )}

            <div className="flex-1" />

            {/* Quick links */}
            <div className="flex gap-2">
              {application.linkedin && (
                <a href={ensureHttps(application.linkedin)} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-primary/30 transition-all">
                  <Linkedin className="w-4 h-4 text-muted-foreground" />
                </a>
              )}
              {application.github && (
                <a href={ensureHttps(application.github)} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-primary/30 transition-all">
                  <Github className="w-4 h-4 text-muted-foreground" />
                </a>
              )}
              {application.resume_url && (
                <a href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/candidates/${application.candidate_id}/resume`} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-primary/30 transition-all">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="px-6 py-6 flex-shrink-0">
          <div className="flex p-1 bg-white/[0.04] rounded-2xl border border-white/[0.06]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-4">

          {/* Overview */}
          {activeTab === 'overview' && (
            <>
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Bio</p>
                {application.candidate_bio ? (
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{application.candidate_bio}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No bio provided</p>
                )}
              </div>

              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Application Summary</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Position</p>
                    <p className="text-sm font-semibold">{application.job_title}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Company</p>
                    <p className="text-sm font-semibold">{application.company_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                    <Badge variant="secondary" className="text-[10px]">{application.status || 'Pending'}</Badge>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Applied</p>
                    <p className="text-sm">{new Date(application.applied_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Application */}
          {activeTab === 'application' && (
            <>
              {application.cover_letter && (
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cover Letter</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{application.cover_letter}</p>
                </div>
              )}

              {application.screening_answers && Object.keys(application.screening_answers).length > 0 && (
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Screening Questions</p>
                  <div className="space-y-3">
                    {Object.entries(application.screening_answers).map(([question, answer]: [string, any], idx) => (
                      <div key={idx} className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Q: {question}</p>
                        <p className="text-sm">{answer}</p>
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
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-5">
              <div>
                <h3 className="text-lg font-bold mb-1">{application.job_title}</h3>
                <p className="text-sm text-muted-foreground">{application.company_name}</p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                {application.location && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> {application.location}
                  </span>
                )}
                {application.job_type && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Briefcase className="w-3.5 h-3.5" /> {application.job_type}
                  </span>
                )}
                {(application.salary_min || application.salary_max) && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="w-3.5 h-3.5" />
                    {formatSalary(application.salary_min, application.salary_max, application.salary_currency)}
                  </span>
                )}
              </div>

              {application.job_description && (
                <>
                  <div className="h-px bg-white/[0.06]" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{application.job_description}</p>
                  </div>
                </>
              )}

              {application.requirements && application.requirements.length > 0 && (
                <>
                  <div className="h-px bg-white/[0.06]" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Requirements</p>
                    <ul className="space-y-2">
                      {application.requirements.map((req: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {application.job_skills && (
                <>
                  <div className="h-px bg-white/[0.06]" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Required Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(application.job_skills)
                        ? application.job_skills
                        : application.job_skills.split(',')
                      ).map((skill: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{skill.trim()}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Skills Match */}
          {activeTab === 'skills' && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overall Match</span>
                  <span className="text-2xl font-bold tabular-nums">{skillMatchData.percentage}%</span>
                </div>
                <Progress
                  value={skillMatchData.percentage}
                  className={`h-2 ${
                    skillMatchData.percentage >= 70
                      ? '[&>div]:bg-primary'
                      : skillMatchData.percentage >= 40
                      ? '[&>div]:bg-amber-400'
                      : '[&>div]:bg-rose-400'
                  }`}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Based on matching job requirements with candidate bio and experience
                </p>
              </div>

              {skillMatchData.matched.length > 0 && (
                <>
                  <div className="h-px bg-white/[0.06]" />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Matched ({skillMatchData.matched.length})</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {skillMatchData.matched.map((skill: string, i: number) => (
                        <Badge key={i} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" /> {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {skillMatchData.missing.length > 0 && (
                <>
                  <div className="h-px bg-white/[0.06]" />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Missing ({skillMatchData.missing.length})</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {skillMatchData.missing.map((skill: string, i: number) => (
                        <Badge key={i} variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs">
                          <XCircle className="w-3 h-3 mr-1" /> {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {guildScore && (
                <>
                  <div className="h-px bg-white/[0.06]" />
                  <div className="flex items-center justify-between rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Guild Review Score</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Community evaluation</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      <span className="text-2xl font-bold text-primary tabular-nums">{guildScore}</span>
                      <span className="text-sm text-muted-foreground">/100</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 pb-5 pt-4 border-t border-white/[0.06] flex-shrink-0">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 text-sm font-semibold rounded-2xl border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition-all"
            >
              Close
            </Button>
            <button
              onClick={() => {
                onClose();
                onEndorseCandidate(application);
              }}
              className="flex-1 h-12 flex items-center justify-center gap-2 text-sm font-bold rounded-2xl bg-gradient-to-r from-primary via-primary to-accent text-[hsl(var(--gradient-button-text))] shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
            >
              <Zap className="w-4 h-4" />
              Endorse Candidate
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
