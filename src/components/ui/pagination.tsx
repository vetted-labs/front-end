"use client";

import { ArrowLeft } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-foreground" />
        <span className="text-sm font-medium text-foreground">Previous</span>
      </button>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
          <span className="font-semibold text-foreground">{totalPages}</span>
        </span>
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span className="text-sm font-medium text-foreground">Next</span>
        <ArrowLeft className="w-4 h-4 text-foreground rotate-180" />
      </button>
    </div>
  );
}
