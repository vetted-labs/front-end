export type JobType = "Full-time" | "Part-time" | "Contract" | "Freelance";
export type LocationType = "remote" | "onsite" | "hybrid";
export type JobStatus = "draft" | "active" | "paused" | "closed";

export interface JobSalary {
  min: number | null;
  max: number | null;
  currency: string;
}

/** Canonical Job type — superset of all variations in the codebase. */
export interface Job {
  id: string;
  title: string;
  department?: string | null;
  location: string;
  locationType?: LocationType;
  type: JobType;
  salary: JobSalary;
  guild?: string;
  description?: string;
  requirements?: string[];
  skills?: string[];
  experienceLevel?: string;
  status?: JobStatus;
  applicants?: number;
  views?: number;
  companyId?: string;
  companyName?: string;
  companyLogo?: string;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string | null;
  featured?: boolean;
  screeningQuestions?: string[];
  equityOffered?: boolean | null;
  equityRange?: string | null;
}

export interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalApplicants: number;
  averageTimeToHire: number;
}
