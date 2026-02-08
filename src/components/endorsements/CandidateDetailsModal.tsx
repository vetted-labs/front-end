import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Zap
} from 'lucide-react';
import { useMemo } from 'react';

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
  // Helper function to ensure URL has protocol
  const ensureHttps = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  // Calculate skill match percentage
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

      const percentage = Math.round((matched.length / jobSkills.length) * 100);

      return { percentage, matched, missing };
    } catch (error) {
      return { percentage: 0, matched: [], missing: [] };
    }
  }, [application?.job_skills, application?.candidate_bio]);

  if (!application) return null;

  const candidateInitials = application.candidate_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const formatSalary = (min?: number, max?: number, currency = 'USD') => {
    if (!min) return 'Not specified';
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-border/60 bg-gradient-to-b from-background via-background/95 to-muted/30 shadow-[0_30px_110px_-70px_rgba(255,106,0,0.55)]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-semibold text-muted-foreground uppercase tracking-wider">
            Candidate Profile & Application
          </DialogTitle>
        </DialogHeader>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 dark:bg-gradient-to-br dark:from-slate-950/80 dark:via-slate-900/80 dark:to-slate-950/90">
          <div className="pointer-events-none absolute -right-24 -top-20 h-60 w-60 rounded-full bg-orange-200/40 blur-3xl dark:bg-orange-500/20" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-60 w-60 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-500/15" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <Avatar className="w-20 h-20 border-4 border-orange-500/30 shadow-lg">
                {application.candidate_profile_picture_url && (
                  <AvatarImage src={application.candidate_profile_picture_url} alt={application.candidate_name} />
                )}
                <AvatarFallback className="bg-orange-500/10 text-orange-700 dark:text-orange-300 text-2xl font-semibold">
                  {candidateInitials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold font-display">{application.candidate_name}</h2>
                  <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300">
                    Verified Candidate
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">{application.candidate_headline}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {application.experience_level && (
                    <Badge variant="secondary">
                      {application.experience_level}
                    </Badge>
                  )}
                  {skillMatchData.percentage > 0 && (
                    <Badge
                      variant="outline"
                      className={`${
                        skillMatchData.percentage >= 70
                          ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20'
                          : skillMatchData.percentage >= 40
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20'
                      }`}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      {skillMatchData.percentage}% Skill Match
                    </Badge>
                  )}
                  {guildScore && (
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20">
                      <Award className="w-4 h-4 mr-1" />
                      Guild Score: {guildScore}/100
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {skillMatchData.percentage > 0 && (
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Skill Match</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{skillMatchData.percentage}%</p>
                </div>
              )}
              {guildScore && (
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Guild Score</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{guildScore}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="relative mt-6 flex flex-wrap gap-3">
            {application.linkedin && (
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-11 px-5 font-semibold text-sm border-border/60 bg-background/60 hover:border-orange-500/40 hover:text-orange-600 dark:hover:text-orange-200 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <a
                  href={ensureHttps(application.linkedin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Linkedin className="w-4 h-4" />
                  <span>LinkedIn</span>
                </a>
              </Button>
            )}
            {application.github && (
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-11 px-5 font-semibold text-sm border-border/60 bg-background/60 hover:border-orange-500/40 hover:text-orange-600 dark:hover:text-orange-200 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <a
                  href={ensureHttps(application.github)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub</span>
                </a>
              </Button>
            )}
            {application.resume_url && (
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-11 px-5 font-semibold text-sm border-border/60 bg-background/60 hover:border-orange-500/40 hover:text-orange-200 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/candidates/${application.candidate_id}/resume`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Resume</span>
                </a>
              </Button>
            )}
            <Button
              variant="default"
              size="lg"
              asChild
              className="h-11 px-6 font-bold text-sm bg-gradient-to-r from-orange-500 to-orange-400 text-slate-900 hover:from-orange-400 hover:to-orange-300 shadow-md hover:shadow-xl transition-all duration-300"
            >
              <a
                href={`/candidates/${application.candidate_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <span>View Full Profile</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Scrollable Tabs Content */}
        <div className="flex-1 overflow-y-auto min-h-0 scroll-smooth">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 sticky top-0 z-10 rounded-full border border-border/60 bg-background/80 p-1 shadow-sm backdrop-blur">
              <TabsTrigger
                value="overview"
                className="rounded-full data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-700 dark:data-[state=active]:text-orange-200 data-[state=active]:shadow"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="application"
                className="rounded-full data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-700 dark:data-[state=active]:text-orange-200 data-[state=active]:shadow"
              >
                Application
              </TabsTrigger>
              <TabsTrigger
                value="job"
                className="rounded-full data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-700 dark:data-[state=active]:text-orange-200 data-[state=active]:shadow"
              >
                Job Details
              </TabsTrigger>
              <TabsTrigger
                value="skills"
                className="rounded-full data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-700 dark:data-[state=active]:text-orange-200 data-[state=active]:shadow"
              >
                Skills Match
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle>Candidate Bio</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {application.candidate_bio ? (
                    <p className="text-sm leading-loose whitespace-pre-wrap">
                      {application.candidate_bio}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No bio provided</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle>Application Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Position</p>
                      <p className="font-semibold">{application.job_title}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Company</p>
                      <p className="font-semibold">{application.company_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge variant="secondary">{application.status || 'Pending'}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Applied</p>
                      <p className="text-sm">
                        {new Date(application.applied_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Application Tab */}
            <TabsContent value="application" className="space-y-6 mt-6">
              {application.cover_letter && (
                <Card className="border-border/60 bg-card/80">
                  <CardHeader>
                    <CardTitle>Cover Letter</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm whitespace-pre-wrap leading-loose">
                      {application.cover_letter}
                    </p>
                  </CardContent>
                </Card>
              )}

              {application.screening_answers && Object.keys(application.screening_answers).length > 0 && (
                <Card className="border-border/60 bg-card/80">
                  <CardHeader>
                    <CardTitle>Screening Questions & Answers</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {Object.entries(application.screening_answers).map(([question, answer]: [string, any], idx) => (
                        <div key={idx} className="p-5 bg-muted rounded-lg">
                          <p className="font-medium text-sm mb-2">Q: {question}</p>
                          <p className="text-sm text-muted-foreground">A: {answer}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!application.cover_letter && (!application.screening_answers || Object.keys(application.screening_answers).length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No additional application materials provided.</p>
                </div>
              )}
            </TabsContent>

            {/* Job Details Tab */}
            <TabsContent value="job" className="space-y-6 mt-6">
              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle>Job Posting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{application.job_title}</h3>
                    <p className="text-muted-foreground">{application.company_name}</p>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    {application.location && (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {application.location}
                      </span>
                    )}
                    {application.job_type && (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="w-4 h-4" />
                        {application.job_type}
                      </span>
                    )}
                    {(application.salary_min || application.salary_max) && (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="w-4 h-4" />
                        {formatSalary(application.salary_min, application.salary_max, application.salary_currency)}
                      </span>
                    )}
                  </div>

                  {application.job_description && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-2">Description</h4>
                      <p className="text-sm leading-loose whitespace-pre-wrap text-muted-foreground">
                        {application.job_description}
                      </p>
                    </div>
                  )}

                  {application.requirements && application.requirements.length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-3">Requirements</h4>
                      <ul className="space-y-2">
                        {application.requirements.map((req: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-orange-500 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {application.job_skills && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-3">Required Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(application.job_skills)
                          ? application.job_skills
                          : application.job_skills.split(',')
                        ).map((skill: string, i: number) => (
                          <Badge key={i} variant="secondary">{skill.trim()}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Skills Match Tab */}
            <TabsContent value="skills" className="space-y-6 mt-6">
              <Card className="border-border/60 bg-card/80">
                <CardHeader>
                  <CardTitle>Skill Match Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">Overall Match Score</span>
                      <span className="text-3xl font-bold">{skillMatchData.percentage}%</span>
                    </div>
                    <Progress
                      value={skillMatchData.percentage}
                      className={`h-3 ${
                        skillMatchData.percentage >= 70
                          ? '[&>div]:bg-orange-400'
                          : skillMatchData.percentage >= 40
                          ? '[&>div]:bg-amber-400'
                          : '[&>div]:bg-rose-400'
                      }`}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Based on matching job requirements with candidate bio and experience
                    </p>
                  </div>

                  {skillMatchData.matched.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                        <h4 className="font-semibold">Matched Skills ({skillMatchData.matched.length})</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {skillMatchData.matched.map((skill: string, i: number) => (
                          <Badge
                            key={i}
                            className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {skillMatchData.missing.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <XCircle className="w-5 h-5 text-red-500" />
                        <h4 className="font-semibold">Missing Skills ({skillMatchData.missing.length})</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {skillMatchData.missing.map((skill: string, i: number) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="bg-rose-500/10 text-rose-300 border-rose-500/20"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {guildScore && (
                    <div className="pt-4 border-t">
                      <Card className="bg-gradient-to-br from-orange-500/10 to-blue-500/10 border-orange-500/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">
                                Guild Review Score
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Based on community evaluation
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <Award className="w-6 h-6 text-orange-500 dark:text-orange-400" />
                                <span className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                                  {guildScore}
                                </span>
                                <span className="text-muted-foreground">/100</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sticky Footer with CTA */}
        <div className="border-t pt-6 mt-6 px-6 pb-6 bg-background flex-shrink-0">
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-14 text-base font-semibold border-border/60 hover:bg-muted/60 hover:scale-105 transition-all duration-200"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                onClose();
                onEndorseCandidate(application);
              }}
              className="flex-1 h-14 text-base font-bold bg-gradient-to-r from-orange-500 to-orange-400 text-slate-900 hover:from-orange-400 hover:to-orange-300 hover:scale-105 hover:shadow-xl transition-all duration-200"
            >
              <Zap className="w-5 h-5 mr-2" />
              Endorse Candidate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
