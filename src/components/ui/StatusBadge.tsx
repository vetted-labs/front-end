interface StatusBadgeProps {
  status: "draft" | "active" | "paused" | "closed" | "pending" | "interviewing" | "offered" | "rejected" | "accepted";
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const statusConfig = {
    draft: { label: "Draft", color: "bg-muted text-card-foreground" },
    active: { label: "Active", color: "bg-green-100 text-green-700" },
    paused: { label: "Paused", color: "bg-yellow-100 text-yellow-700" },
    closed: { label: "Closed", color: "bg-red-100 text-red-700" },
    pending: { label: "Pending", color: "bg-blue-100 text-blue-700" },
    interviewing: { label: "Interviewing", color: "bg-purple-100 text-purple-700" },
    offered: { label: "Offered", color: "bg-indigo-100 text-indigo-700" },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
    accepted: { label: "Accepted", color: "bg-green-100 text-green-700" }
  };

  const config = statusConfig[status] || statusConfig.draft;
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.color} ${sizeClass}`}>
      {config.label}
    </span>
  );
}
