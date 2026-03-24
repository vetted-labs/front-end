"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { governanceApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { GovernanceProposalCard } from "@/components/governance/GovernanceProposalCard";
import type { GovernanceProposalDetail, GovernanceFilterStatus } from "@/types";

const FILTERS: { value: GovernanceFilterStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "passed", label: "Passed" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export default function GovernancePage() {
  const router = useRouter();
  const [filter, setFilter] = useState<GovernanceFilterStatus>("active");
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const fetchProposals = useCallback(async () => {
    const params = filterRef.current !== "all" ? { status: filterRef.current } : undefined;
    const response = await governanceApi.getProposals(params);
    return Array.isArray(response) ? response : [];
  }, []);

  const { data: proposals, isLoading, refetch } = useFetch<GovernanceProposalDetail[]>(
    fetchProposals,
    {
      onError: () => toast.error("Failed to load proposals"),
    }
  );

  const handleFilterChange = (value: GovernanceFilterStatus) => {
    setFilter(value);
    filterRef.current = value;
    refetch();
  };

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Governance</h1>
            <p className="text-muted-foreground">
              Vote on protocol changes, guild elections, and platform governance proposals.
            </p>
          </div>
          <Button onClick={() => router.push("/expert/governance/create")}>
            <Plus className="w-4 h-4 mr-2" />
            Create Proposal
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Proposals List */}
        {isLoading ? null : !proposals || proposals.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No proposals found"
            description={
              filter === "active"
                ? "There are no active governance proposals right now."
                : `No ${filter} proposals to display.`
            }
            action={{
              label: "Create Proposal",
              onClick: () => router.push("/expert/governance/create"),
            }}
          />
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <GovernanceProposalCard
                key={proposal.id}
                proposal={proposal}
                onClick={() => router.push(`/expert/governance/${proposal.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
