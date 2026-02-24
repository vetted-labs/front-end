import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  // Job statuses
  draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
  active: {
    label: "Active",
    color:
      "bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:text-primary dark:border-primary/70",
  },
  paused: {
    label: "Paused",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  },
  closed: {
    label: "Closed",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },

  // Application statuses
  pending: {
    label: "Pending",
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  reviewing: {
    label: "Reviewing",
    color:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  interviewed: {
    label: "Interviewed",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  interviewing: {
    label: "Interviewing",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  },
  accepted: {
    label: "Accepted",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
  offered: {
    label: "Offered",
    color:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  hired: {
    label: "Hired",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  shortlisted: {
    label: "Shortlisted",
    color:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  },

  // Proposal/governance statuses
  open: {
    label: "Open",
    color:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  passed: {
    label: "Passed",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
  executed: {
    label: "Executed",
    color:
      "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  },

  // Endorsement statuses
  endorsed: {
    label: "Endorsed",
    color:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  disputed: {
    label: "Disputed",
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  },
  resolved: {
    label: "Resolved",
    color:
      "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  },

  // Expert statuses
  approved: {
    label: "Approved",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  },
  suspended: {
    label: "Suspended",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  },
};

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const config = STATUS_STYLES[status] ?? {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    color: "bg-muted text-muted-foreground",
  };
  const sizeClass =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        config.color,
        sizeClass,
        className
      )}
    >
      {config.label}
    </span>
  );
}
