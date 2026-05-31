"use client";

import { MessageSquare } from "lucide-react";
import { GuildFeedTab } from "./GuildFeedTab";
import type { ExpertRole } from "@/types";

interface GuildInternalFeedTabProps {
  guildId: string;
  membershipRole?: ExpertRole;
}

/**
 * Workspace feed tab — shows the same public guild conversations members
 * see on the public guild page, so the workspace doesn't feel empty.
 *
 * A private members-only feed (recusal notices, rubric RFCs, internal Q&A)
 * is deferred to v2; when that lands, this tab gets a visibility toggle.
 */
export function GuildInternalFeedTab({ guildId, membershipRole }: GuildInternalFeedTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <span>A members only feed is coming soon.</span>
      </div>
      <GuildFeedTab
        guildId={guildId}
        isMember={true}
        membershipRole={membershipRole}
        userType="expert"
        visibility="public"
      />
    </div>
  );
}
