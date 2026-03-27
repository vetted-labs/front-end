"use client";

import { useState, useRef } from "react";
import { UserCircle, MoreHorizontal, Shield, Crown, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { TEAM_MEMBER_STATUS_CONFIG } from "@/config/constants";
import { STATUS_COLORS } from "@/config/colors";
import type { TeamMember, TeamMemberRole } from "@/types";

const ROLE_CONFIG: Record<TeamMemberRole, { label: string; icon: typeof Shield; className: string }> = {
  admin: { label: "Admin", icon: Crown, className: STATUS_COLORS.warning.badge },
  manager: { label: "Manager", icon: Shield, className: STATUS_COLORS.info.badge },
  recruiter: { label: "Recruiter", icon: User, className: "text-foreground/70 bg-muted/50 border-border" },
};

interface TeamMemberListProps {
  members: TeamMember[];
  isLoading: boolean;
  onUpdateRole: (memberId: string, role: TeamMemberRole) => void;
  onRemove: (memberId: string) => void;
  isUpdating: boolean;
}

export function TeamMemberList({ members, isLoading, onUpdateRole, onRemove, isUpdating }: TeamMemberListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <EmptyState
        icon={UserCircle}
        title="No team members yet"
        description="Invite your first team member to get started"
        className="py-10"
      />
    );
  }

  return (
    <div className="divide-y divide-border/30 dark:divide-white/[0.04]">
      {members.map((member) => {
        const roleConfig = ROLE_CONFIG[member.role];
        const statusConfig = TEAM_MEMBER_STATUS_CONFIG[member.status] || TEAM_MEMBER_STATUS_CONFIG.pending;
        const RoleIcon = roleConfig.icon;

        return (
          <div key={member.id} className="flex items-center gap-4 px-4 py-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-medium text-sm">
                {member.fullName.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{member.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            </div>

            <span className={cn(
              "inline-flex items-center gap-2 px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0",
              roleConfig.className
            )}>
              <RoleIcon className="w-3 h-3" />
              {roleConfig.label}
            </span>

            <span className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border flex-shrink-0",
              statusConfig.className
            )}>
              {statusConfig.label}
            </span>

            <MemberActions
              member={member}
              onUpdateRole={onUpdateRole}
              onRemove={onRemove}
              isUpdating={isUpdating}
            />
          </div>
        );
      })}
    </div>
  );
}

function MemberActions({
  member,
  onUpdateRole,
  onRemove,
  isUpdating,
}: {
  member: TeamMember;
  onUpdateRole: (memberId: string, role: TeamMemberRole) => void;
  onRemove: (memberId: string) => void;
  isUpdating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setOpen(false), open);

  const handleAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div className="relative flex-shrink-0" ref={menuRef}>
      <button
        className="p-1.5 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground"
        disabled={isUpdating}
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 w-40 rounded-lg border border-border bg-card shadow-lg py-1">
          {member.role !== "admin" && (
            <button
              onClick={() => handleAction(() => onUpdateRole(member.id, "admin"))}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
            >
              Make Admin
            </button>
          )}
          {member.role !== "manager" && (
            <button
              onClick={() => handleAction(() => onUpdateRole(member.id, "manager"))}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
            >
              Make Manager
            </button>
          )}
          {member.role !== "recruiter" && (
            <button
              onClick={() => handleAction(() => onUpdateRole(member.id, "recruiter"))}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors"
            >
              Make Recruiter
            </button>
          )}
          <button
            onClick={() => handleAction(() => onRemove(member.id))}
            className={`w-full text-left px-3 py-1.5 text-sm ${STATUS_COLORS.negative.text} hover:${STATUS_COLORS.negative.bgSubtle} transition-colors`}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
