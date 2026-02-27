"use client";

import { useState, useCallback } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { teamApi } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { Button } from "@/components/ui/button";
import { TeamMemberList } from "./TeamMemberList";
import { InviteTeamMemberDialog } from "./InviteTeamMemberDialog";
import type { TeamMember, TeamMemberRole } from "@/types";

export function TeamManagement() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const fetchMembers = useCallback(() => teamApi.list(), []);
  const {
    data: members,
    isLoading,
    refetch,
  } = useFetch<TeamMember[]>(fetchMembers, {
    onError: () => toast.error("Failed to load team members"),
  });

  const { execute, isLoading: isUpdating } = useApi();

  const handleInvite = async (data: { email: string; fullName: string; role: TeamMemberRole }) => {
    await execute(
      () => teamApi.invite(data),
      {
        onSuccess: () => {
          toast.success(`Invitation sent to ${data.email}`);
          refetch();
        },
        onError: (msg) => toast.error(msg || "Failed to send invitation"),
      }
    );
  };

  const handleUpdateRole = async (memberId: string, role: TeamMemberRole) => {
    await execute(
      () => teamApi.update(memberId, { role }),
      {
        onSuccess: () => {
          toast.success("Role updated");
          refetch();
        },
        onError: () => toast.error("Failed to update role"),
      }
    );
  };

  const handleRemove = async (memberId: string) => {
    await execute(
      () => teamApi.remove(memberId),
      {
        onSuccess: () => {
          toast.success("Team member removed");
          refetch();
        },
        onError: () => toast.error("Failed to remove team member"),
      }
    );
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden dark:bg-card/30 dark:border-white/[0.06]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 dark:border-white/[0.04]">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Team</h2>
          {members && members.length > 0 && (
            <p className="text-xs text-muted-foreground/60 mt-0.5">{members.length} member{members.length !== 1 ? "s" : ""}</p>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setShowInviteDialog(true)}
        >
          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
          Invite
        </Button>
      </div>

      <TeamMemberList
        members={members || []}
        isLoading={isLoading}
        onUpdateRole={handleUpdateRole}
        onRemove={handleRemove}
        isUpdating={isUpdating}
      />

      <InviteTeamMemberDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        onInvite={handleInvite}
      />
    </div>
  );
}
