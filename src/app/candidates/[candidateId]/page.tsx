"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest, ApiError } from '@/lib/api';
import { CandidateProfileView } from '@/components/CandidateProfileView';
import { toast } from 'sonner';
import type { CandidateProfile } from '@/types';


export default function CandidateProfilePage() {
  const { candidateId } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<CandidateProfile & { viewerType?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerType, setViewerType] = useState<string>('');

  useEffect(() => {
    loadProfile();
  }, [candidateId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<CandidateProfile & { viewerType?: string }>(
        `/api/candidates/${candidateId}/profile`,
        { method: 'GET' }
      );

      setProfile(data);
      setViewerType(data.viewerType || '');
    } catch (error: unknown) {
      console.error('Failed to load profile:', error);

      if (error instanceof ApiError && error.status === 404) {
        toast.error('Candidate not found');
        router.push('/');
      } else {
        toast.error('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Candidate Not Found</h2>
          <p className="text-muted-foreground">The candidate profile you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const isOwner = viewerType === 'candidate' && typeof window !== 'undefined' &&
    localStorage.getItem('candidateId') === candidateId;

  return (
    <div className="min-h-screen bg-background animate-page-enter">
      <CandidateProfileView
        profile={profile}
        isOwner={isOwner}
      />
    </div>
  );
}
