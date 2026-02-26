"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { governanceApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";

import { GovernanceProposalCard } from "@/components/governance/GovernanceProposalCard";
import type { GovernanceProposalDetail } from "@/types";

type FilterStatus = "active" | "passed" | "rejected" | "all";

export default function GovernancePage() {
  const router = useRouter();
  const { address } = useAccount();
  const [proposals, setProposals] = useState<GovernanceProposalDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("active");

  useEffect(() => {
    loadProposals();
  }, [filter]);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const params = filter !== "all" ? { status: filter } : undefined;
      const response = await governanceApi.getProposals(params);
      setProposals(Array.isArray(response) ? response : []);
    } catch (error: unknown) {
      console.error("Error loading governance proposals:", error);
      toast.error("Failed to load proposals");
    } finally {
      setLoading(false);
    }
  };

  const filters: { value: FilterStatus; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "passed", label: "Passed" },
    { value: "rejected", label: "Rejected" },
    { value: "all", label: "All" },
  ];

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
          {filters.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Proposals List */}
        {loading ? null : proposals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No proposals found</p>
              <p className="text-muted-foreground mb-6">
                {filter === "active"
                  ? "There are no active governance proposals right now."
                  : `No ${filter} proposals to display.`}
              </p>
              <Button onClick={() => router.push("/expert/governance/create")}>
                <Plus className="w-4 h-4 mr-2" />
                Create Proposal
              </Button>
            </CardContent>
          </Card>
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
