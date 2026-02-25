"use client";

import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface ConversationFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  jobFilter: string;
  onJobFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  unreadOnly: boolean;
  onUnreadOnlyChange: (value: boolean) => void;
  jobs: { id: string; title: string }[];
}

export function ConversationFilters({
  search,
  onSearchChange,
  jobFilter,
  onJobFilterChange,
  statusFilter,
  onStatusFilterChange,
  unreadOnly,
  onUnreadOnlyChange,
  jobs,
}: ConversationFiltersProps) {
  return (
    <div className="px-4 py-3.5 border-b border-border/40 dark:border-white/[0.04] space-y-2.5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs rounded-full bg-muted/40 dark:bg-white/[0.05] border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground transition-colors"
        />
      </div>
      <div className="flex items-center gap-2">
        {jobs.length > 0 && (
          <select
            value={jobFilter}
            onChange={(e) => onJobFilterChange(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs rounded-full bg-muted/40 dark:bg-white/[0.05] border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
          >
            <option value="">All Jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        )}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="flex-1 px-3 py-1.5 text-xs rounded-full bg-muted/40 dark:bg-white/[0.05] border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="reviewing">Reviewing</option>
          <option value="interviewed">Interviewed</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <button
        type="button"
        onClick={() => onUnreadOnlyChange(!unreadOnly)}
        className={cn(
          "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
          unreadOnly
            ? "bg-primary/10 text-primary border-primary/30"
            : "bg-transparent text-muted-foreground border-border/40 dark:border-white/[0.06] hover:text-foreground"
        )}
      >
        Unread only
      </button>
    </div>
  );
}
