"use client";
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { CandidateProfileView } from '@/components/CandidateProfileView';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { useFetch } from '@/lib/hooks/useFetch';
import { useAuthContext } from '@/hooks/useAuthContext';
import type { CandidateProfile } from '@/types';


export default function CandidateProfilePage() {
  const { candidateId } = useParams();
  const { userType, userId } = useAuthContext();

  const { data: profile, isLoading } = useFetch<CandidateProfile & { viewerType?: string }>(
    () => apiRequest<CandidateProfile & { viewerType?: string }>(
      `/api/candidates/${candidateId}/profile`,
      { method: 'GET' }
    ),
    {
      onError: (errorMessage) => {
        logger.error('Failed to load profile', errorMessage, { silent: true });
        toast.error('Failed to load profile');
      },
    }
  );

  if (isLoading) {
    return null;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Candidate Not Found</h2>
          <p className="text-muted-foreground">The candidate profile you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  const isOwner = userType === 'candidate' && userId === candidateId;

  return (
    <div className="min-h-screen bg-background animate-page-enter">
      <CandidateProfileView
        profile={profile}
        isOwner={isOwner}
      />
    </div>
  );
}
