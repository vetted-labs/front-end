import { Star } from "lucide-react";
import { truncateAddress } from "@/lib/utils";
import type { PostAuthor } from "@/types";
import type { ExpertRole } from "@/types";

interface AuthorBadgeProps {
  author: PostAuthor;
  showReputation?: boolean;
  className?: string;
}

const ROLE_COLORS: Record<string, string> = {
  "Guild Lead": "bg-amber-500/15 text-amber-500 border-amber-500/30",
  Expert: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  Candidate: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  expert: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  candidate: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};

const EXPERT_ROLE_COLORS: Record<ExpertRole, string> = {
  recruit: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30",
  apprentice: "bg-teal-500/15 text-teal-500 border-teal-500/30",
  craftsman: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  officer: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  master: "bg-amber-500/15 text-amber-500 border-amber-500/30",
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
        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${roleColor}`}
      >
        {roleLabel}
      </span>

      {/* Author Name */}
      <span className="text-sm font-medium text-foreground">
        {author.walletAddress
          ? truncateAddress(author.walletAddress)
          : author.fullName}
      </span>

      {/* Reputation */}
      {showReputation && author.reputation > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          {author.reputation}
        </span>
      )}
    </div>
  );
}
