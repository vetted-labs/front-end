import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { History, Inbox } from "lucide-react";
import { ExpertReviewCard } from "./ExpertReviewCard";
import { CandidateReviewCard } from "./CandidateReviewCard";
import { ProposalCard } from "./ProposalCard";
import type {
  ApplicationsTabType,
  ApplicationsFilterMode,
  ExpertMembershipApplication,
  CandidateGuildApplication,
  GuildApplication,
} from "@/types";

type HistoryItem =
  | { type: "proposal"; data: GuildApplication; sortDate: string }
  | { type: "candidate"; data: CandidateGuildApplication; sortDate: string }
  | { type: "expert"; data: ExpertMembershipApplication; sortDate: string };

interface ApplicationsCardListProps {
  activeTab: ApplicationsTabType;
  filterMode: ApplicationsFilterMode;
  isLoading: boolean;
  isAllGuilds: boolean;
  selectedGuildName: string;
  paginatedItems: unknown[];
  historyList: HistoryItem[];
  totalItemCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onReviewExpert: (app: ExpertMembershipApplication) => void;
  onViewExpertReview: (app: ExpertMembershipApplication) => void;
  onReviewCandidate: (app: CandidateGuildApplication) => void;
  onViewCandidateReview: (app: CandidateGuildApplication) => void;
  onReviewProposal: (proposal: GuildApplication) => void;
  isStakedInGuild: (guildId?: string) => boolean;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-6 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-4 w-36 rounded-md bg-muted/50" />
                <div className="h-5 w-16 rounded-full bg-muted/40" />
              </div>
              <div className="h-3 w-48 rounded bg-muted/40" />
              <div className="flex gap-3 mt-1">
                <div className="h-3 w-20 rounded bg-muted/30" />
                <div className="h-3 w-24 rounded bg-muted/30" />
              </div>
            </div>
            <div className="h-8 w-20 rounded-lg bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ApplicationsCardList({
  activeTab,
  filterMode,
  isLoading,
  isAllGuilds,
  selectedGuildName,
  paginatedItems,
  historyList,
  totalItemCount,
  currentPage,
  totalPages,
  onPageChange,
  onReviewExpert,
  onViewExpertReview,
  onReviewCandidate,
  onViewCandidateReview,
  onReviewProposal,
  isStakedInGuild,
}: ApplicationsCardListProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (totalItemCount === 0) {
    return (
      <EmptyState
        icon={activeTab === "history" ? History : Inbox}
        title={
          activeTab === "expert" ? "No expert applications"
            : activeTab === "candidate" ? "No candidate applications"
            : activeTab === "proposals" ? "No proposals"
            : "No completed reviews"
        }
        description={
          activeTab === "history"
            ? "Completed reviews and finalized proposals will appear here."
            : filterMode === "assigned"
              ? "No items assigned to you right now."
              : isAllGuilds
                ? "No items across your guilds."
                : `No items in ${selectedGuildName}.`
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {activeTab === "expert" && (
        (paginatedItems as ExpertMembershipApplication[]).map((app) => (
          <ExpertReviewCard
            key={app.id}
            application={app}
            onReview={onReviewExpert}
            onViewReview={onViewExpertReview}
            showGuildBadge={isAllGuilds}
          />
        ))
      )}

      {activeTab === "candidate" && (
        (paginatedItems as CandidateGuildApplication[]).map((app) => (
          <CandidateReviewCard
            key={app.id}
            application={app}
            onReview={onReviewCandidate}
            onViewReview={onViewCandidateReview}
            showGuildBadge={isAllGuilds}
          />
        ))
      )}

      {activeTab === "proposals" && (
        (paginatedItems as GuildApplication[]).map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            onReview={onReviewProposal}
            meetsStakingRequirement={isStakedInGuild(proposal.guild_id)}
            showGuildBadge={isAllGuilds}
          />
        ))
      )}

      {activeTab === "history" && (
        (paginatedItems as typeof historyList).map((item) =>
          item.type === "proposal" ? (
            <ProposalCard
              key={`proposal-${item.data.id}`}
              proposal={item.data}
              onReview={onReviewProposal}
              meetsStakingRequirement={false}
              showGuildBadge={isAllGuilds}
            />
          ) : item.type === "expert" ? (
            <ExpertReviewCard
              key={`expert-${item.data.id}`}
              application={item.data}
              onReview={onReviewExpert}
              onViewReview={onViewExpertReview}
              showGuildBadge={isAllGuilds}
            />
          ) : (
            <CandidateReviewCard
              key={`candidate-${item.data.id}`}
              application={item.data}
              onReview={() => {}}
              onViewReview={onViewCandidateReview}
              showGuildBadge={isAllGuilds}
            />
          )
        )
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
