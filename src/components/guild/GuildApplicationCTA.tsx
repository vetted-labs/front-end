import { Eye } from "lucide-react";

interface GuildApplicationCTAProps {
  guildId: string;
  onNavigateToPublicPage: () => void;
}

/**
 * Call-to-action area displayed above the guild tabs.
 * Shows a link to the public guild page and can be extended
 * with membership-status-dependent CTAs.
 */
export function GuildApplicationCTA({ onNavigateToPublicPage }: GuildApplicationCTAProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 flex items-center gap-3 flex-wrap">
      <button
        onClick={onNavigateToPublicPage}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-muted/50 border border-border rounded-lg hover:border-primary/40 hover:bg-muted transition-all"
      >
        <Eye className="w-4 h-4" />
        View Public Guild Page
      </button>
    </div>
  );
}
