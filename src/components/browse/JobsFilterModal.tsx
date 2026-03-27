"use client";

import { Modal } from "@/components/ui/modal";

interface JobsFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  allGuilds: string[];
  selectedGuilds: string[];
  onToggleGuild: (guild: string) => void;
  jobTypes: string[];
  selectedJobTypes: string[];
  onToggleJobType: (type: string) => void;
  locationTypes: string[];
  selectedLocationTypes: string[];
  onToggleLocationType: (type: string) => void;
  onClearAll: () => void;
}

export function JobsFilterModal({
  isOpen,
  onClose,
  allGuilds,
  selectedGuilds,
  onToggleGuild,
  jobTypes,
  selectedJobTypes,
  onToggleJobType,
  locationTypes,
  selectedLocationTypes,
  onToggleLocationType,
  onClearAll,
}: JobsFilterModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Filter Jobs">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Guilds Section */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3">Guilds</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allGuilds.map((guild) => (
              <button
                key={guild}
                onClick={() => onToggleGuild(guild)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                  selectedGuilds.includes(guild)
                    ? "bg-foreground text-background"
                    : "bg-card text-card-foreground border border-border hover:border-foreground/30"
                }`}
              >
                {guild}
              </button>
            ))}
          </div>
        </div>

        {/* Job Types Section */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3">
            Job Type
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {jobTypes.map((type) => (
              <button
                key={type}
                onClick={() => onToggleJobType(type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                  selectedJobTypes.includes(type)
                    ? "bg-foreground text-background"
                    : "bg-card text-card-foreground border border-border hover:border-foreground/30"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Location Types Section */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3">
            Work Location
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {locationTypes.map((type) => (
              <button
                key={type}
                onClick={() => onToggleLocationType(type)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                  selectedLocationTypes.includes(type)
                    ? "bg-foreground text-background"
                    : "bg-card text-card-foreground border border-border hover:border-foreground/30"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row gap-2">
        <button
          onClick={onClearAll}
          className="flex-1 px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Clear All
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Apply Filters
        </button>
      </div>
    </Modal>
  );
}
