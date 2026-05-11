"use client";

import { Shield } from "lucide-react";
import { GuildFeedTab } from "./GuildFeedTab";
import type { ExpertRole } from "@/types";

interface GuildInternalFeedTabProps {
  guildId: string;
  membershipRole?: ExpertRole;
}

/**
 * Internal feed tab for the private member workspace.
 *
 * Wraps the existing public-feed component with a gold-tinted "members only"
 * banner. Phase 5 adds an `is_private` filter to the post query — until then
 * the same feed renders here, with the banner setting context that members
 * can post recusal notices, rubric RFCs, internal Q&A.
 */
export function GuildInternalFeedTab({ guildId, membershipRole }: GuildInternalFeedTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-warning/25 bg-warning/[0.06] px-4 py-3 text-sm text-muted-foreground">
        <Shield className="h-4 w-4 flex-shrink-0 text-warning" />
        <span>
          <strong className="text-foreground">Internal feed</strong> — visible
          only to guild members. Posts here don&apos;t appear on the public guild
          page.
        </span>
      </div>
      <GuildFeedTab
        guildId={guildId}
        isMember={true}
        membershipRole={membershipRole}
        userType="expert"
        visibility="internal"
      />
    </div>
  );
}
