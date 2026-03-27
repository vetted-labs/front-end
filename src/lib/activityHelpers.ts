import { LucideIcon, FileText, Award, DollarSign, TrendingUp } from "lucide-react";
import { STATUS_COLORS } from "@/config/colors";

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

export const getActivityColorClasses = (_type: ActivityType): string => {
  return `${STATUS_COLORS.neutral.bgSubtle} ${STATUS_COLORS.neutral.border}`;
};

export const getActivityIconBgColor = (_type: ActivityType): string => {
  return STATUS_COLORS.neutral.bgSubtle;
};

export const getActivityIconColor = (_type: ActivityType): string => {
  return STATUS_COLORS.neutral.text;
};
