export interface MatchDimension {
  score: number;
  weight: number;
  details?: string;
}

export interface MatchScoreBreakdown {
  skills: MatchDimension;
  experience: MatchDimension;
  location: MatchDimension;
  guild: MatchDimension;
  salary: MatchDimension;
}

export interface MatchScoreResult {
  totalScore: number;
  breakdown: MatchScoreBreakdown;
  matchedSkills?: string[];
  missingSkills?: string[];
}

export interface RecommendedJob {
  jobId: string;
  title: string;
  company: string;
  companyId: string;
  matchScore: number;
  guildName?: string;
  salary?: string;
  location?: string;
  locationType?: string;
  createdAt: string;
}
