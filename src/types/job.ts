export type JobType = "Full-time" | "Part-time" | "Contract" | "Freelance";
export type LocationType = "remote" | "onsite" | "hybrid";
export type JobStatus = "draft" | "active" | "paused" | "closed";

export interface JobSalary {
  min: number | null;
  max: number | null;
  currency: string;
}

/** Supported question types on the candidate application form. */
export type ApplicationQuestionType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multi_choice"
  | "file_upload"
  | "url";

/** A single question on a job's custom application form. */
export interface ApplicationQuestion {
  /** uuid generated client-side on add */
  id: string;
  type: ApplicationQuestionType;
  /** 1–200 chars */
  label: string;
  required: boolean;
  /** 0–300 chars */
  helpText?: string;
  /** 2–10 unique entries (single_choice / multi_choice) */
  options?: string[];
  /** short_text default 200, long_text default 800 */
  maxLength?: number;
  /** file_upload, e.g. ['pdf','docx'] */
  allowedFileTypes?: string[];
}

/** A file uploaded as part of a job listing's media (hero / gallery). */
export interface UploadedImage {
  url: string;
  filename: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}

/** External link attached to a job listing. */
export interface ExternalLink {
  title: string;
  url: string;
}

/** Supported embed providers for the optional inline video embed. */
export type EmbedProvider = "youtube" | "loom";

/** All media/links that can be attached to a job listing. */
export interface JobAttachments {
  heroImage?: UploadedImage;
  /** max 6 */
  gallery: UploadedImage[];
  /** max 8 */
  externalLinks: ExternalLink[];
  embed?: { provider: EmbedProvider; url: string };
}

export const MAX_APPLICATION_QUESTIONS = 10;
export const MAX_GALLERY_IMAGES = 6;
export const MAX_EXTERNAL_LINKS = 8;

/** Canonical Job type — superset of all variations in the codebase. */
export interface Job {
  id: string;
  title: string;
  department?: string | null;
  location: string;
  locationType?: LocationType;
  type: JobType;
  salary: JobSalary;
  guildId?: string;
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
  /**
   * @deprecated Use `applicationQuestions` instead. Kept for one release while
   * older listings are migrated server-side. Each legacy entry maps to a
   * `long_text` ApplicationQuestion with `required: true`.
   */
  screeningQuestions?: string[];
  /** Custom application form (up to MAX_APPLICATION_QUESTIONS). */
  applicationQuestions?: ApplicationQuestion[];
  /** Hero image URL (single). */
  heroImageUrl?: string;
  /** Gallery image URLs (max MAX_GALLERY_IMAGES). */
  galleryUrls?: string[];
  /** External link rows (max MAX_EXTERNAL_LINKS). */
  externalLinks?: ExternalLink[];
  /** Canonicalized embed URL (YouTube watch / Loom share). */
  embedUrl?: string;
  embedProvider?: EmbedProvider;
  equityOffered?: boolean | null;
  equityRange?: string | null;
}

export interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalApplicants: number;
  averageTimeToHire: number;
}
