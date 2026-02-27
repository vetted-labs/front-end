"use client";

import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { TeamMemberRole } from "@/types";

interface InviteTeamMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (data: { email: string; fullName: string; role: TeamMemberRole }) => Promise<void>;
}

export function InviteTeamMemberDialog({ isOpen, onClose, onInvite }: InviteTeamMemberDialogProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<TeamMemberRole>("recruiter");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) return;

    setIsSubmitting(true);
    try {
      await onInvite({ email: email.trim(), fullName: fullName.trim(), role });
      setEmail("");
      setFullName("");
      setRole("recruiter");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Team Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
            required
            className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 dark:border-white/[0.08] bg-background/60 dark:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com"
            required
            className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 dark:border-white/[0.08] bg-background/60 dark:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as TeamMemberRole)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border/60 dark:border-white/[0.08] bg-background/60 dark:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
          >
            <option value="recruiter">Recruiter</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1.5">
            {role === "admin" && "Full access to all company settings and team management"}
            {role === "manager" && "Can manage jobs, candidates, and view analytics"}
            {role === "recruiter" && "Can manage jobs and candidates"}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting || !email.trim() || !fullName.trim()} className="flex-1">
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            {isSubmitting ? "Inviting..." : "Send Invite"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
