import { STATUS_COLORS } from "@/config/colors";
import type { PostTag as PostTagType } from "@/types";

interface PostTagProps {
  tag: PostTagType;
}

const TAG_CONFIG: Record<PostTagType, { label: string; className: string }> = {
  discussion: {
    label: "Discussion",
    className: STATUS_COLORS.info.badge,
  },
  question: {
    label: "Question",
    className: STATUS_COLORS.pending.badge,
  },
  insight: {
    label: "Insight",
    className: STATUS_COLORS.warning.badge,
  },
  job_related: {
    label: "Job-Related",
    className: STATUS_COLORS.positive.badge,
  },
};

export function PostTagBadge({ tag }: PostTagProps) {
  const config = TAG_CONFIG[tag];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
