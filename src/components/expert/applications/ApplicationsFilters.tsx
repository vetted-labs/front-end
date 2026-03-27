import { PillTabs } from "@/components/ui/pill-tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApplicationsTabType, ApplicationsFilterMode, GuildRecord } from "@/types";

interface PendingCounts {
  expert: number;
  candidate: number;
  proposals: number;
  history: number;
}

interface ApplicationsFiltersProps {
  activeTab: ApplicationsTabType;
  onTabChange: (tab: ApplicationsTabType) => void;
  selectedGuildId: string;
  onGuildChange: (guildId: string) => void;
  guilds: GuildRecord[];
  filterMode: ApplicationsFilterMode;
  onFilterModeChange: (mode: ApplicationsFilterMode) => void;
  pendingCounts: PendingCounts;
}

export function ApplicationsFilters({
  activeTab,
  onTabChange,
  selectedGuildId,
  onGuildChange,
  guilds,
  filterMode,
  onFilterModeChange,
  pendingCounts,
}: ApplicationsFiltersProps) {
  const tabs: { value: ApplicationsTabType; label: React.ReactNode }[] = [
    {
      value: "expert",
      label: (
        <>
          Expert Reviews
          {pendingCounts.expert > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/30 text-xs font-medium rounded-full">
              {pendingCounts.expert}
            </span>
          )}
        </>
      ),
    },
    {
      value: "candidate",
      label: (
        <>
          Candidate Reviews
          {pendingCounts.candidate > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/30 text-xs font-medium rounded-full">
              {pendingCounts.candidate}
            </span>
          )}
        </>
      ),
    },
    {
      value: "proposals",
      label: (
        <>
          Proposals
          {pendingCounts.proposals > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/30 text-xs font-medium rounded-full">
              {pendingCounts.proposals}
            </span>
          )}
        </>
      ),
    },
    {
      value: "history",
      label: (
        <>
          History
          {pendingCounts.history > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-muted text-muted-foreground text-xs font-medium rounded-full">
              {pendingCounts.history}
            </span>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PillTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

        <div className="flex items-center gap-2.5">
          <Select value={selectedGuildId} onValueChange={onGuildChange}>
            <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg border-border bg-background/70">
              <SelectValue placeholder="All Guilds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Guilds</SelectItem>
              {guilds.map((guild) => (
                <SelectItem key={guild.id} value={guild.id}>
                  {guild.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => onFilterModeChange("assigned")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filterMode === "assigned"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Assigned
            </button>
            <button
              onClick={() => onFilterModeChange("all")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filterMode === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
