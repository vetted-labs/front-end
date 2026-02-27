import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { FileText, Linkedin, Github, ExternalLink, MapPin, Briefcase, TrendingUp } from 'lucide-react';
import { getAssetUrl } from '@/lib/api';

interface CandidateProfileViewProps {
  profile: {
    id: string;
    fullName: string;
    headline: string;
    bio?: string;
    experienceLevel: string;
    linkedIn?: string;
    github?: string;
    resumeUrl?: string;
    applicationCount: number;
    endorsementCount: number;
    avgGuildScore?: number | null;
    email?: string;
    phone?: string;
    walletAddress?: string;
    createdAt: string;
  };
  isOwner: boolean;
}

export function CandidateProfileView({ profile, isOwner }: CandidateProfileViewProps) {
  // Generate initials from full name
  const initials = profile.fullName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  // Format date
  const joinDate = new Date(profile.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header Section */}
      <Card className="mb-6">
        <CardContent className="p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24 text-2xl">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div>
                <h1 className="text-3xl font-bold">{profile.fullName}</h1>
                <p className="text-xl text-muted-foreground mt-1">
                  {profile.headline}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <Badge variant="secondary" className="text-sm">
                    {profile.experienceLevel}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Joined {joinDate}
                  </span>
                </div>
              </div>
            </div>

            {isOwner && (
              <Link href="/candidate/profile" className={cn(buttonVariants({ variant: "outline" }))}>
                Edit Profile
              </Link>
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <Briefcase className="w-4 h-4" />
                <span className="text-sm font-medium">Applications</span>
              </div>
              <p className="text-2xl font-bold">{profile.applicationCount}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Endorsements</span>
              </div>
              <p className="text-2xl font-bold">{profile.endorsementCount}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Avg Score</span>
              </div>
              <p className="text-2xl font-bold">
                {profile.avgGuildScore ? profile.avgGuildScore.toFixed(1) : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio */}
      {profile.bio && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {profile.bio}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Links & Resume */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Links & Resume</CardTitle>
          <CardDescription>
            Professional links and documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {profile.linkedIn && (
              <a href={profile.linkedIn} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                <Linkedin className="w-4 h-4 mr-2" />
                LinkedIn
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
            {profile.github && (
              <a href={profile.github} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                <Github className="w-4 h-4 mr-2" />
                GitHub
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
            {profile.resumeUrl && (
              <a href={getAssetUrl(profile.resumeUrl)} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>
                <FileText className="w-4 h-4 mr-2" />
                View Resume
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
          </div>

          {!profile.linkedIn && !profile.github && !profile.resumeUrl && (
            <p className="text-sm text-muted-foreground">
              No links or resume available yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Private Information (Owner Only) */}
      {isOwner && (profile.email || profile.phone || profile.walletAddress) && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Private Information
              <Badge variant="default" className="text-xs">Only You</Badge>
            </CardTitle>
            <CardDescription>
              This information is only visible to you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.email && (
              <div>
                <span className="font-medium text-sm">Email:</span>{' '}
                <span className="text-muted-foreground">{profile.email}</span>
              </div>
            )}
            {profile.phone && (
              <div>
                <span className="font-medium text-sm">Phone:</span>{' '}
                <span className="text-muted-foreground">{profile.phone}</span>
              </div>
            )}
            {profile.walletAddress && (
              <div>
                <span className="font-medium text-sm">Wallet Address:</span>{' '}
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {profile.walletAddress}
                </code>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
