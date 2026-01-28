import { LucideIcon, FileText, Award, DollarSign, TrendingUp } from "lucide-react";

type ActivityType = "proposal_vote" | "endorsement" | "earning" | "reputation_gain";

export const getActivityIconComponent = (type: ActivityType): LucideIcon => {
  switch (type) {
    case "proposal_vote":
      return FileText;      // Replaces 📝
    case "endorsement":
      return Award;         // Replaces 🏆
    case "earning":
      return DollarSign;    // Replaces 💰
    case "reputation_gain":
      return TrendingUp;    // Replaces 📈
    default:
      return FileText;
  }
};

export const getActivityColorClasses = (type: ActivityType): string => {
  // Simplified slate color scheme for all activities
  return "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700";
};

export const getActivityIconBgColor = (type: ActivityType): string => {
  // Consistent icon background
  return "bg-slate-200 dark:bg-slate-700";
};

export const getActivityIconColor = (type: ActivityType): string => {
  // Icon color (subtle variation for distinction)
  switch (type) {
    case "proposal_vote":
      return "text-slate-600 dark:text-slate-400";
    case "endorsement":
      return "text-slate-700 dark:text-slate-300";
    case "earning":
      return "text-slate-700 dark:text-slate-300";
    case "reputation_gain":
      return "text-slate-600 dark:text-slate-400";
    default:
      return "text-slate-600 dark:text-slate-400";
  }
};
