"use client";

import { useState, useRef, useMemo } from "react";
import { X, Briefcase, Loader2 } from "lucide-react";
import { jobsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import type { Job } from "@/types";

interface JobPickerProps {
  selected: string | null;
  selectedJob?: { id: string; title: string } | null;
  onChange: (jobId: string | null, job: { id: string; title: string } | null) => void;
}

/**
 * Job autocomplete dropdown shown above the body when the post is tagged
 * `job_related`. Posts in this category are linked to a `jobs.id` row via
 * `guild_posts.job_id` so the feed can render a job chip and the company
 * dashboard can backlink discussions onto their listing.
 */
export function JobPicker({ selected, selectedJob, onChange }: JobPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 250);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setOpen(false), open);

  const { data, isLoading } = useFetch<Job[]>(
    () => jobsApi.search(debouncedQuery, { limit: 8 }),
    {
      // Skip the very first empty query if the user hasn't focused the
      // input — avoids a hot list of jobs flashing in. Once they focus
      // we fetch even on empty query so the dropdown isn't dead.
      skip: !open && debouncedQuery.length === 0,
    }
  );

  const results = useMemo(() => data ?? [], [data]);

  if (selected && selectedJob) {
    return (
      <div className="mt-2">
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Linked Job
        </label>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5"
          data-testid="job-picker-selected"
        >
          <Briefcase className="w-4 h-4 text-primary shrink-0" />
          <span className="flex-1 text-sm text-foreground truncate">{selectedJob.title}</span>
          <button
            type="button"
            onClick={() => onChange(null, null)}
            aria-label="Clear linked job"
            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2" ref={containerRef}>
      <label
        htmlFor="job-picker-input"
        className="block text-sm font-medium text-foreground mb-1.5"
      >
        Link a Job <span className="text-muted-foreground font-normal">(optional)</span>
      </label>
      <div className="relative">
        <Briefcase className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="job-picker-input"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search active jobs..."
          autoComplete="off"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
          data-testid="job-picker-input"
        />
        {isLoading && (
          <Loader2 className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
        )}

        {open && (
          <div
            className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-auto rounded-lg border border-border bg-popover shadow-lg"
            data-testid="job-picker-dropdown"
          >
            {results.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-muted-foreground">
                {isLoading
                  ? "Searching..."
                  : debouncedQuery
                    ? "No matching jobs found."
                    : "Start typing to search jobs."}
              </p>
            ) : (
              <ul className="py-1">
                {results.map((job) => (
                  <li key={job.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(job.id, { id: job.id, title: job.title });
                        setOpen(false);
                        setQuery("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                      data-testid={`job-picker-option-${job.id}`}
                    >
                      <div className="text-sm font-medium text-foreground truncate">
                        {job.title}
                      </div>
                      {job.companyName && (
                        <div className="text-xs text-muted-foreground truncate">
                          {job.companyName}
                          {job.location ? ` · ${job.location}` : ""}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
