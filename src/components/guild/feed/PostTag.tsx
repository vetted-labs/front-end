import type { PostTag as PostTagType } from "@/types";

interface PostTagProps {
  tag: PostTagType;
}

const TAG_CONFIG: Record<PostTagType, { label: string; className: string }> = {
  discussion: {
    label: "Discussion",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  question: {
    label: "Question",
    className: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  },
  insight: {
    label: "Insight",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  job_related: {
    label: "Job-Related",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
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
