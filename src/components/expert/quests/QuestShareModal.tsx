"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { EXPERTISE_FIELDS } from "@/config/quests";
import type { Quest } from "@/types";

interface QuestShareModalProps {
  quest: Quest | null;
  isOpen: boolean;
  sharing?: boolean;
  onClose: () => void;
  /** Share the completed answer tagged with the chosen expertise field. */
  onShare: (quest: Quest, expertiseField: string) => void;
}

/**
 * Share-to-feed modal for an already-completed (approved) quest answer
 * (VET-115 part 2). Lets the expert pick the expertise field the answer should
 * be tagged with; on confirm the parent calls `questsApi.shareToFeed`, which
 * the team then reviews before the answer becomes public.
 */
export function QuestShareModal({
  quest,
  isOpen,
  sharing = false,
  onClose,
  onShare,
}: QuestShareModalProps) {
  const [field, setField] = useState<string>(EXPERTISE_FIELDS[0]);

  if (!quest) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share answer to the feed" size="md">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Share your answer to{" "}
          <span className="font-medium text-foreground">&ldquo;{quest.title}&rdquo;</span> with
          other experts. The Vetted team reviews shared answers before they appear in the public
          feed.
        </p>

        <NativeSelect
          label="Expertise field"
          description="Other experts can filter the feed by this field."
          value={field}
          onChange={(e) => setField(e.target.value)}
        >
          {EXPERTISE_FIELDS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </NativeSelect>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={sharing}>
            Cancel
          </Button>
          <Button
            variant="default"
            isLoading={sharing}
            onClick={() => onShare(quest, field)}
          >
            Share for review
          </Button>
        </div>
      </div>
    </Modal>
  );
}
