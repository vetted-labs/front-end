"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { CandidateProfileView } from '@/components/CandidateProfileView';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function CandidateProfilePage() {
  const { candidateId } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewerType, setViewerType] = useState<string>('');

  useEffect(() => {
    loadProfile();
  }, [candidateId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(
        `/api/candidates/${candidateId}/profile`,
        { method: 'GET', requiresAuth: true }
      );

      if (response.success) {
        setProfile(response.data);
        setViewerType(response.viewerType);
      } else {
        toast.error('Failed to load profile');
      }
    } catch (error: any) {
      console.error('Failed to load profile:', error);

      if (error.status === 401) {
        toast.error('Please log in to view profiles');
        router.push('/auth/login');
      } else if (error.status === 404) {
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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
    <div className="min-h-screen bg-background">
      <CandidateProfileView
        profile={profile}
        isOwner={isOwner}
      />
    </div>
  );
}
