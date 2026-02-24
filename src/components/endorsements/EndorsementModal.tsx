import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle, XCircle, ExternalLink, Loader2, Award, FileText, Linkedin, Github, MapPin, DollarSign, Briefcase } from 'lucide-react';

interface EndorsementModalProps {
  application: any | null;
  isOpen: boolean;
  onClose: () => void;
  onEndorsementPlaced: () => void;
  userBalance: string;
  userStake: string;
  minimumBid: string;
  onPlaceEndorsement: (application: any, bidAmount: string) => Promise<void>;
}

export function EndorsementModal({
  application,
  isOpen,
  onClose,
  onEndorsementPlaced,
  userBalance,
  userStake,
  minimumBid,
  onPlaceEndorsement
}: EndorsementModalProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillMatch, setSkillMatch] = useState<number>(0);

  useEffect(() => {
    if (application) {
      calculateSkillMatch();
    }
  }, [application]);

  const calculateSkillMatch = () => {
    if (!application?.job_skills || !application?.candidate_bio) {
      setSkillMatch(0);
      return;
    }

    try {
      const jobSkills = typeof application.job_skills === 'string'
        ? application.job_skills.toLowerCase().split(',').map((s: string) => s.trim())
        : application.job_skills.map((s: string) => s.toLowerCase().trim());

      const candidateBio = application.candidate_bio.toLowerCase();

      const matchedSkills = jobSkills.filter((skill: string) =>
        candidateBio.includes(skill)
      );

      setSkillMatch(Math.round((matchedSkills.length / jobSkills.length) * 100));
    } catch (error) {
      console.error('Error calculating skill match:', error);
      setSkillMatch(0);
    }
  };

  const handleEndorse = async () => {
    if (!application) return;

    if (!bidAmount || parseFloat(bidAmount) < parseFloat(minimumBid)) {
      toast.error(`Minimum bid is ${minimumBid} VETD`);
      return;
    }

    if (parseFloat(userBalance) < parseFloat(bidAmount)) {
      toast.error(`Insufficient balance. You have ${userBalance} VETD`);
      return;
    }

    setIsSubmitting(true);

    try {
      await onPlaceEndorsement(application, bidAmount);
      setBidAmount('');
      onEndorsementPlaced();
      onClose();
    } catch (error: any) {
      console.error('Endorsement error:', error);
      // Error is already handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Endorse Candidate</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="application">Application</TabsTrigger>
            <TabsTrigger value="match">Job Match</TabsTrigger>
            <TabsTrigger value="job">Job Details</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Candidate Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {candidateInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{application.candidate_name}</h3>
                    <p className="text-muted-foreground">{application.candidate_headline}</p>
                    <Badge variant="secondary" className="mt-2">{application.experience_level}</Badge>
                  </div>
                </div>

                {application.candidate_bio && (
                  <div>
                    <h4 className="font-medium mb-2">Bio</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {application.candidate_bio}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {application.linkedin && (
                    <a href={application.linkedin} target="_blank" rel="noopener" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                      <Linkedin className="w-4 h-4 mr-2" />
                      LinkedIn
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                  {application.github && (
                    <a href={application.github} target="_blank" rel="noopener" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                      <Github className="w-4 h-4 mr-2" />
                      GitHub
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                  {application.resume_url && (
                    <a href={`/api/candidates/${application.candidate_id}/resume`} target="_blank" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                      <FileText className="w-4 h-4 mr-2" />
                      Resume
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>

                <Link href={`/candidates/${application.candidate_id}`} target="_blank" className={cn(buttonVariants({ variant: "link" }), "p-0 h-auto")}>
                  View Full Profile →
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Application Tab */}
          <TabsContent value="application" className="space-y-4 mt-4">
            {application.cover_letter && (
              <Card>
                <CardHeader>
                  <CardTitle>Cover Letter</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {application.cover_letter}
                  </p>
                </CardContent>
              </Card>
            )}

            {application.screening_answers && Object.keys(application.screening_answers).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Screening Answers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(application.screening_answers).map(([question, answer]: [string, any]) => (
                      <div key={question}>
                        <p className="font-medium text-sm mb-1">{question}</p>
                        <p className="text-sm text-muted-foreground">{answer}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!application.cover_letter && (!application.screening_answers || Object.keys(application.screening_answers).length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No additional application materials provided.
              </div>
            )}
          </TabsContent>

          {/* Job Match Tab */}
          <TabsContent value="match" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Skill Match Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Match Score</span>
                    <span className="text-2xl font-bold">{skillMatch}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        skillMatch >= 70 ? 'bg-green-500' : skillMatch >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${skillMatch}%` }}
                    />
                  </div>
                </div>

                {application.requirements && application.requirements.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Job Requirements</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {application.requirements.map((req: string, i: number) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {application.job_skills && (
                  <div>
                    <h4 className="font-medium mb-2">Required Skills</h4>
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

          {/* Job Details Tab */}
          <TabsContent value="job" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Job Posting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{application.job_title}</h3>
                  <p className="text-sm text-muted-foreground">{application.company_name}</p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {application.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {application.location}
                    </span>
                  )}
                  {application.job_type && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {application.job_type}
                    </span>
                  )}
                  {(application.salary_min || application.salary_max) && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {formatSalary(application.salary_min, application.salary_max, application.salary_currency)}
                    </span>
                  )}
                </div>

                {application.job_description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {application.job_description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Endorsement Form (Sticky Footer) */}
        <div className="border-t pt-4 mt-4 bg-background sticky bottom-0">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-xs text-muted-foreground">Your Balance</Label>
              <p className="font-semibold">{parseFloat(userBalance).toFixed(2)} VETD</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Your Stake</Label>
              <p className="font-semibold">{parseFloat(userStake).toFixed(2)} VETD</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="bidAmount">Endorsement Amount (VETD)</Label>
              <Input
                id="bidAmount"
                type="number"
                placeholder={`Min: ${minimumBid}`}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                min={minimumBid}
                step="0.1"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleEndorse}
                disabled={isSubmitting || !bidAmount || parseFloat(bidAmount) < parseFloat(minimumBid)}
                className="flex-1"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Place Endorsement
              </Button>
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
