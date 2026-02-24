"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, ArrowRight } from "lucide-react";

interface MyActiveEndorsementsProps {
  /** Endorsements filtered for the current guild */
  userEndorsements: any[];
  /** All endorsements across all guilds */
  allUserEndorsements: any[];
  /** Name of the current guild */
  guildName: string;
  /** Callback when a user clicks on an endorsement to view details */
  onSelectEndorsement: (applicationForModal: any) => void;
}

export function MyActiveEndorsements({
  userEndorsements,
  allUserEndorsements,
  guildName,
  onSelectEndorsement,
}: MyActiveEndorsementsProps) {
  const handleEndorsementClick = (endorsement: any) => {
    // Build application object from endorsement data
    // The modal expects snake_case flat structure
    const applicationForModal = {
      // IDs
      application_id: endorsement.application?.id,
      candidate_id: endorsement.candidate?.id,
      job_id: endorsement.job?.id,
      company_id: endorsement.job?.companyId,

      // Candidate info (flat snake_case from nested camelCase)
      candidate_name: endorsement.candidate?.name,
      candidate_email: endorsement.candidate?.email,
      candidate_headline: endorsement.candidate?.headline,
      candidate_profile_picture_url: endorsement.candidate?.profilePicture,
      candidate_bio: endorsement.candidate?.bio || '',
      candidate_wallet: endorsement.candidate?.walletAddress,

      // Job info
      job_title: endorsement.job?.title,
      job_description: endorsement.job?.description,
      company_name: endorsement.job?.companyName,
      company_logo: endorsement.job?.companyLogo,
      location: endorsement.job?.location,
      job_type: endorsement.job?.jobType,
      salary_min: endorsement.job?.salaryMin,
      salary_max: endorsement.job?.salaryMax,
      salary_currency: endorsement.job?.salaryCurrency,

      // Application details
      status: endorsement.application?.status,
      applied_at: endorsement.application?.appliedAt,
      cover_letter: endorsement.application?.coverLetter,
      screening_answers: endorsement.application?.screeningAnswers,

      // Guild info
      guild_score: endorsement.guildScore,

      // Current bid and rank info
      current_bid: endorsement.stakeAmount,
      rank: endorsement.blockchainData?.rank || 0,

      // Additional fields that might be used
      requirements: endorsement.job?.requirements || [],
      job_skills: endorsement.job?.skills || [],
      experience_level: endorsement.candidate?.experienceLevel,
      linkedin: endorsement.candidate?.linkedin,
      github: endorsement.candidate?.github,
      resume_url: endorsement.candidate?.resumeUrl,
    };

    onSelectEndorsement(applicationForModal);
  };

  return (
    <Card className="border-border/60 bg-gradient-to-r from-orange-500/10 via-cyan-500/5 to-transparent shadow-[0_30px_80px_-60px_rgba(255,106,0,0.7)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              My Active Endorsements
            </CardTitle>
            <CardDescription>
              {userEndorsements.length > 0
                ? `You have ${userEndorsements.length} active endorsement${userEndorsements.length !== 1 ? 's' : ''} in ${guildName}`
                : allUserEndorsements.length > 0
                ? `You have ${allUserEndorsements.length} endorsement${allUserEndorsements.length !== 1 ? 's' : ''} in other guilds`
                : `No active endorsements yet. Endorse candidates below to get started.`
              }
            </CardDescription>
          </div>
          {allUserEndorsements.length > 0 && (
            <Link href="/expert/endorsements/history">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
              >
                View All ({allUserEndorsements.length})
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {userEndorsements.length === 0 ? (
          <div className="text-center py-8">
            <Award className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              You haven't endorsed any candidates in {guildName} yet
            </p>
            {allUserEndorsements.length > 0 ? (
              <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-md">
                <p className="text-xs text-muted-foreground mb-2">
                  You have {allUserEndorsements.length} endorsement{allUserEndorsements.length !== 1 ? 's' : ''} in other guilds:
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {Array.from(new Set(allUserEndorsements.map((e: any) => e.guild?.name).filter(Boolean))).map((guildName: any) => (
                    <span key={guildName} className="text-xs px-2 py-1 bg-orange-500/10 rounded-full">
                      {guildName}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Browse applications below and endorse candidates you believe will succeed
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {userEndorsements.map((endorsement: any) => (
              <div
                key={endorsement.application?.id || endorsement.endorsementId}
                onClick={() => handleEndorsementClick(endorsement)}
                className="flex items-center justify-between p-4 bg-card/80 rounded-lg border border-border/60 hover:border-orange-500/40 hover:shadow-[0_20px_50px_-35px_rgba(255,106,0,0.6)] cursor-pointer transition-all group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-semibold group-hover:text-orange-600 dark:group-hover:text-orange-300 transition-colors">
                      {endorsement.candidate?.name}
                    </h4>
                    {endorsement.blockchainData?.rank > 0 && endorsement.blockchainData?.rank <= 3 && (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
                        🏆 Rank #{endorsement.blockchainData.rank}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {endorsement.job?.title} at {endorsement.job?.companyName}
                  </p>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mt-1">
                    Your Bid: {parseFloat(endorsement.stakeAmount || '0').toFixed(2)} VETD
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-muted-foreground">
                    {endorsement.blockchainData?.rank > 0 && (
                      <p>Rank #{endorsement.blockchainData.rank}</p>
                    )}
                    <p className="text-xs mt-1">
                      {endorsement.createdAt
                        ? new Date(endorsement.createdAt).toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-orange-600 dark:group-hover:text-orange-300 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
