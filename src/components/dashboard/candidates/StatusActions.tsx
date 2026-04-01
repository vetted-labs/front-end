"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import { getNextStatuses, isTerminalStatus } from "@/lib/statusTransitions";
import { STATUS_COLORS } from "@/config/colors";
import type { ApplicationStatus } from "@/types";

interface StatusActionsProps {
  currentStatus: ApplicationStatus;
  isUpdating: boolean;
  onAdvance: (newStatus: ApplicationStatus, note?: string) => void;
}

const ACTION_LABELS: Record<string, string> = {
  reviewing: "Start Review",
  interviewed: "Mark Interviewed",
  accepted: "Accept",
  rejected: "Reject",
};

export function StatusActions({
  currentStatus,
  isUpdating,
  onAdvance,
}: StatusActionsProps) {
  const [confirmStatus, setConfirmStatus] = useState<ApplicationStatus | null>(null);
  const [note, setNote] = useState("");

  const nextStatuses = getNextStatuses(currentStatus);
  const statusConfig = APPLICATION_STATUS_CONFIG[currentStatus];
  const isTerminal = isTerminalStatus(currentStatus);

  const handleConfirm = () => {
    if (!confirmStatus) return;
    onAdvance(confirmStatus, note.trim() || undefined);
    setConfirmStatus(null);
    setNote("");
  };

  const handleCancel = () => {
    setConfirmStatus(null);
    setNote("");
  };

  const needsConfirmation = (status: ApplicationStatus) =>
    status === "accepted" || status === "rejected";

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* Current status badge */}
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusConfig?.className ?? "bg-muted text-foreground"}`}
      >
        {statusConfig?.label ?? currentStatus}
      </span>

      {/* Action buttons for valid next statuses */}
      {!isTerminal &&
        nextStatuses.map((next) => {
          const isReject = next === "rejected";
          return (
            <Button
              key={next}
              size="sm"
              variant={isReject ? "outline" : "default"}
              disabled={isUpdating}
              isLoading={isUpdating && !isReject}
              className={
                isReject
                  ? `${STATUS_COLORS.negative.text} border-negative/20 hover:bg-negative/10 h-7 text-xs`
                  : "h-7 text-xs"
              }
              onClick={() => {
                if (needsConfirmation(next)) {
                  setConfirmStatus(next);
                } else {
                  onAdvance(next);
                }
              }}
            >
              {ACTION_LABELS[next] ?? next}
            </Button>
          );
        })}

      {/* Confirmation modal for terminal actions */}
      <Modal
        isOpen={!!confirmStatus}
        onClose={handleCancel}
        title={
          confirmStatus === "accepted"
            ? "Accept Candidate"
            : "Reject Candidate"
        }
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {confirmStatus === "accepted"
              ? "This will permanently mark the candidate as accepted. This action cannot be undone."
              : "This will permanently reject the candidate. This action cannot be undone."}
          </p>
          <div>
            <label
              htmlFor="transition-note"
              className="block text-xs font-medium text-muted-foreground mb-1.5"
            >
              Note (optional)
            </label>
            <textarea
              id="transition-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a reason or note for this decision..."
              rows={3}
              maxLength={1000}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background/60 dark:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant={confirmStatus === "rejected" ? "destructive" : "default"}
              disabled={isUpdating}
              onClick={handleConfirm}
            >
              {isUpdating
                ? "Updating..."
                : confirmStatus === "accepted"
                  ? "Confirm Accept"
                  : "Confirm Reject"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
