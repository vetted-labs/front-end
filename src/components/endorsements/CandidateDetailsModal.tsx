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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Candidate Profile & Application</DialogTitle>
        </DialogHeader>

        {/* Large Header with Avatar and Key Info */}
        <div className="flex items-start gap-8 p-6 pb-6 border-b flex-shrink-0 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <Avatar className="w-20 h-20 border-4 border-primary/20 shadow-lg">
            {application.candidate_profile_picture_url && (
              <AvatarImage src={application.candidate_profile_picture_url} alt={application.candidate_name} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
              {candidateInitials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold mb-1">{application.candidate_name}</h2>
            <p className="text-muted-foreground mb-3">{application.candidate_headline}</p>

            {/* Badges */}
            <div className="flex flex-wrap gap-3 mb-4">
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
                      ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                      : skillMatchData.percentage >= 40
                      ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20'
                      : 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
                  }`}
                >
                  <Star className="w-4 h-4 mr-1" />
                  {skillMatchData.percentage}% Skill Match
                </Badge>
              )}
              {guildScore && (
                <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">
                  <Award className="w-4 h-4 mr-1" />
                  Guild Score: {guildScore}/100
                </Badge>
              )}
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap gap-4 items-center">
              {application.linkedin && (
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="h-12 px-6 font-semibold text-base border-2 hover:border-primary/50 bg-white dark:bg-gray-950 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <a
                    href={ensureHttps(application.linkedin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Linkedin className="w-5 h-5" />
                    <span>LinkedIn</span>
                  </a>
                </Button>
              )}
              {application.github && (
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="h-12 px-6 font-semibold text-base border-2 hover:border-primary/50 bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <a
                    href={ensureHttps(application.github)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Github className="w-5 h-5" />
                    <span>GitHub</span>
                  </a>
                </Button>
              )}
              {application.resume_url && (
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="h-12 px-6 font-semibold text-base border-2 hover:border-primary/50 bg-white dark:bg-gray-950 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:text-purple-600 dark:hover:text-purple-400 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/candidates/${application.candidate_id}/resume`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    <span>Resume</span>
                  </a>
                </Button>
              )}
              <Button
                variant="default"
                size="lg"
                asChild
                className="h-12 px-8 font-bold text-base bg-gradient-to-r from-primary via-primary to-purple-600 hover:from-primary/90 hover:via-primary/90 hover:to-purple-700 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-110 border-0"
              >
                <a
                  href={`/candidates/${application.candidate_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <span>View Full Profile</span>
                  <ExternalLink className="w-5 h-5" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Tabs Content */}
        <div className="flex-1 overflow-y-auto min-h-0 scroll-smooth">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b shadow-sm">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="application">Application</TabsTrigger>
              <TabsTrigger value="job">Job Details</TabsTrigger>
              <TabsTrigger value="skills">Skills Match</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <Card>
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

              <Card>
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
                <Card>
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
                <Card>
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
              <Card>
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
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
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
              <Card>
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
                          ? '[&>div]:bg-green-500'
                          : skillMatchData.percentage >= 40
                          ? '[&>div]:bg-yellow-500'
                          : '[&>div]:bg-red-500'
                      }`}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Based on matching job requirements with candidate bio and experience
                    </p>
                  </div>

                  {skillMatchData.matched.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <h4 className="font-semibold">Matched Skills ({skillMatchData.matched.length})</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {skillMatchData.matched.map((skill: string, i: number) => (
                          <Badge
                            key={i}
                            className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
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
                            className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
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
                      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
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
                                <Award className="w-6 h-6 text-purple-500" />
                                <span className="text-3xl font-bold text-purple-700 dark:text-purple-400">
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
              className="flex-1 h-14 text-base font-semibold hover:bg-muted hover:scale-105 transition-all duration-200"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                onClose();
                onEndorseCandidate(application);
              }}
              className="flex-1 h-14 text-base font-bold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 hover:scale-105 hover:shadow-xl transition-all duration-200"
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
