"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CreateProposalForm } from "@/components/governance/CreateProposalForm";

export default function CreateGovernanceProposalPage() {
  const router = useRouter();

  return (
    <div className="min-h-full animate-page-enter">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={() => router.push("/expert/governance")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Create Governance Proposal
            </h1>
            <p className="text-muted-foreground mt-1">
              Submit a proposal for the community to vote on
            </p>
          </div>
        </div>

        <CreateProposalForm />
      </div>
    </div>
  );
}
