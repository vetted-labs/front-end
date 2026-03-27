import { Star } from "lucide-react";
import { truncateAddress } from "@/lib/utils";
import { RANK_COLORS, STATUS_COLORS } from "@/config/colors";
import type { PostAuthor } from "@/types";
import type { ExpertRole } from "@/types";

interface AuthorBadgeProps {
  author: PostAuthor;
  showReputation?: boolean;
  className?: string;
}

const ROLE_COLORS: Record<string, string> = {
  "Guild Lead": STATUS_COLORS.warning.badge,
  Expert: STATUS_COLORS.info.badge,
  Candidate: STATUS_COLORS.positive.badge,
  expert: STATUS_COLORS.info.badge,
  candidate: STATUS_COLORS.positive.badge,
};

const EXPERT_ROLE_COLORS: Record<ExpertRole, string> = {
  recruit: RANK_COLORS.recruit.badge,
  apprentice: RANK_COLORS.apprentice.badge,
  craftsman: RANK_COLORS.craftsman.badge,
  officer: RANK_COLORS.officer.badge,
  master: RANK_COLORS.master.badge,
};

const EXPERT_ROLE_LABELS: Record<ExpertRole, string> = {
  recruit: "Recruit",
  apprentice: "Apprentice",
  craftsman: "Craftsman",
  officer: "Officer",
  master: "Master",
};

export function AuthorBadge({
  author,
  showReputation = true,
  className = "",
}: AuthorBadgeProps) {
  // Prefer expertRole for display when available
  const expertRole = author.expertRole;
  const roleLabel = expertRole
    ? EXPERT_ROLE_LABELS[expertRole]
    : author.guildRole || (author.type === "expert" ? "Expert" : "Candidate");
  const roleColor = expertRole
    ? EXPERT_ROLE_COLORS[expertRole]
    : ROLE_COLORS[roleLabel] || ROLE_COLORS[author.type] || "bg-muted text-muted-foreground border-border";

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {/* Role Badge */}
      <span
        className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded-full border ${roleColor}`}
      >
        {roleLabel}
      </span>

      {/* Author Name */}
      <span className="text-sm font-medium text-foreground">
        {author.fullName || truncateAddress(author.walletAddress || "")}
      </span>

      {/* Reputation */}
      {showReputation && author.reputation > 0 && (
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <Star className={`w-3 h-3 ${STATUS_COLORS.warning.icon} fill-warning`} />
          {author.reputation}
        </span>
      )}
    </div>
  );
}
