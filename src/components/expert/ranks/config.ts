import { Crown, Shield, Star, Swords, Trophy } from "lucide-react";
import type { ExpertRole } from "@/types";
import type { RankConfig } from "./types";

export const GUILD_RANK_CONFIGS: RankConfig[] = [
  {
    level: 1,
    name: "Recruit",
    role: "recruit",
    description: "Entry-level guild member who has passed initial vetting",
    requirements: [
      { label: "Pass guild application review", metric: null, target: null },
      { label: "Receive approval from guild members", metric: null, target: null },
      { label: "Complete profile verification", metric: null, target: null },
    ],
    unlocks: ["Reply to feed posts", "View guild discussions"],
  },
  {
    level: 2,
    name: "Apprentice",
    role: "apprentice",
    description: "Active participant building reputation through reviews",
    requirements: [
      { label: "Complete 10+ reviews", metric: "reviewCount", target: 10 },
      { label: "Maintain 70%+ consensus", metric: "consensusRate", target: 70, format: "percent" },
      { label: "Reputation score 50+", metric: "reputation", target: 50 },
    ],
    unlocks: ["Create feed posts", "Participate in discussions"],
  },
  {
    level: 3,
    name: "Craftsman",
    role: "craftsman",
    description: "Trusted reviewer eligible to endorse candidates",
    requirements: [
      { label: "Complete 50+ reviews", metric: "reviewCount", target: 50 },
      { label: "Maintain 75%+ consensus", metric: "consensusRate", target: 75, format: "percent" },
      { label: "Reputation score 150+", metric: "reputation", target: 150 },
      { label: "Endorse 5+ candidates", metric: "endorsementCount", target: 5 },
    ],
    unlocks: ["Edit others' posts", "Mark duplicates", "Endorse candidates"],
  },
  {
    level: 4,
    name: "Officer",
    role: "officer",
    description: "Senior guild member overseeing governance",
    requirements: [
      { label: "Complete 100+ reviews", metric: "reviewCount", target: 100 },
      { label: "Maintain 80%+ consensus", metric: "consensusRate", target: 80, format: "percent" },
      { label: "Reputation score 300+", metric: "reputation", target: 300 },
      { label: "Participate in guild governance", metric: null, target: null },
      { label: "Mentor 3+ lower-rank members", metric: null, target: null },
    ],
    unlocks: ["Pin/unpin posts", "Close/reopen threads", "Accept answers on behalf"],
  },
  {
    level: 5,
    name: "Guild Master",
    role: "master",
    description: "Elected leader representing the guild in platform governance. Only one per guild.",
    requirements: [
      { label: "Elected by guild members (1 per guild)", metric: null, target: null },
      { label: "Complete 200+ reviews", metric: "reviewCount", target: 200 },
      { label: "Maintain 85%+ consensus", metric: "consensusRate", target: 85, format: "percent" },
      { label: "Reputation score 500+", metric: "reputation", target: 500 },
      { label: "Proven leadership", metric: null, target: null },
    ],
    unlocks: [
      "Full delete/moderation",
      "Full guild control",
      "6-month term, re-electable via governance vote",
      "Must step down after 2 consecutive terms",
    ],
  },
];

export const RANK_ICONS: Record<ExpertRole, React.ElementType> = {
  recruit: Shield,
  apprentice: Swords,
  craftsman: Trophy,
  officer: Star,
  master: Crown,
};

export function getRankIndex(role: ExpertRole): number {
  return GUILD_RANK_CONFIGS.findIndex((r) => r.role === role);
}
