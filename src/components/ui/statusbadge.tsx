interface StatusBadgeProps {
  status: "draft" | "active" | "paused" | "closed" | "pending" | "interviewing" | "offered" | "rejected" | "accepted";
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const statusConfig = {
    draft: { label: "Draft", color: "bg-muted text-muted-foreground" },
    active: { label: "Active", color: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" },
    paused: { label: "Paused", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
    closed: { label: "Closed", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
    pending: { label: "Pending", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
    interviewing: { label: "Interviewing", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
    offered: { label: "Offered", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
    accepted: { label: "Accepted", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" }
  };

  const config = statusConfig[status] || statusConfig.draft;
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.color} ${sizeClass}`}>
      {config.label}
    </span>
  );
}
