import type { ExpertRole } from "@/types";

export type RankMetric = "reputation" | "reviewCount" | "consensusRate" | "endorsementCount";

export interface RankRequirement {
  label: string;
  metric: RankMetric | null;
  target: number | null;
  format?: "percent" | "number";
}

export interface RankConfig {
  level: number;
  name: string;
  role: ExpertRole;
  description: string;
  requirements: RankRequirement[];
  unlocks: string[];
}

export interface ExpertStats {
  reputation: number;
  reviewCount: number;
  consensusRate: number | null;
  endorsementCount: number;
}
