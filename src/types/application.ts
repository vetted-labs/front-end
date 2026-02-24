export type ApplicationStatus =
  | "pending"
  | "reviewing"
  | "interviewed"
  | "accepted"
  | "rejected";

/** Application as seen by the candidate (includes embedded job). */
export interface CandidateApplication {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  coverLetter: string;
  appliedAt: string;
  job: {
    id: string;
    title: string;
    companyName?: string;
    location: string;
    type: string;
    salary?: { min: number; max: number; currency: string };
    skills?: string[];
    guild?: string;
  };
}

/** Application as seen by the company (includes embedded candidate). */
export interface CompanyApplication {
  id: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  appliedAt: string;
  coverLetter: string;
  resumeUrl?: string;
  screeningAnswers?: string[];
  candidate: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    headline?: string;
    experienceLevel?: string;
    walletAddress?: string;
    linkedIn?: string;
    github?: string;
  };
  job: {
    id: string;
    title: string;
    location: string;
    type: string;
    guild: string;
    salary?: { min: number | null; max: number | null; currency: string };
  };
}

/** Application in guild context (job applications tab). */
export interface GuildJobApplication {
  id: string;
  jobTitle: string;
  candidateName: string;
  candidateEmail: string;
  appliedAt: string;
  matchScore?: number;
  reviewedByRecruiter?: boolean;
  endorsementCount?: number;
  applicationSummary?: string;
  status?: ApplicationStatus;
  guildName?: string;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  reviewing: number;
  interviewed: number;
  accepted: number;
  rejected: number;
}
