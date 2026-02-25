export interface SocialLink {
  platform: string;
  label: string;
  url: string;
}

export interface CandidateProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  linkedIn?: string;
  github?: string;
  socialLinks?: SocialLink[];
  experienceLevel?: string;
  headline?: string;
  bio?: string;
  walletAddress?: string;
  resumeUrl?: string;
  resumeFileName?: string;
}

/** Candidate as listed in guild member lists. */
export interface CandidateMember {
  id: string;
  fullName: string;
  email: string;
  headline?: string;
  experienceLevel?: string;
  reputation: number;
  endorsements?: number;
  joinedAt?: string;
}
