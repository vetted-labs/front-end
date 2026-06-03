"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { EXPERTISE_FIELDS } from "@/config/quests";
import { toast } from "sonner";
import type { Quest } from "@/types";

export interface QuestSubmitPayload {
  text?: string;
  url?: string;
  screenshot?: File | null;
  /**
   * VET-115: when set, the expert also wants this answer shared to the expert
   * feed (tagged with `shareField`). Sharing only succeeds once the submission
   * is approved (backend gate), so the caller treats this as a deferred intent.
   */
  share?: boolean;
  shareField?: string;
}

interface QuestSubmitModalProps {
  quest: Quest | null;
  isOpen: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (quest: Quest, payload: QuestSubmitPayload) => void;
}

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function QuestSubmitModal({
  quest,
  isOpen,
  submitting = false,
  onClose,
  onSubmit,
}: QuestSubmitModalProps) {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [share, setShare] = useState(false);
  const [shareField, setShareField] = useState<string>(EXPERTISE_FIELDS[0]);

  if (!quest) return null;

  const action = quest.actionType ?? "";
  const needsUrl = action === "social_post";
  const allowsScreenshot = action === "bug_report" || action === "suggestion";
  const needsText = action !== "social_post"; // post just needs the link
  // Sharing to the expert feed only makes sense for free-text answers in a
  // field (not social posts / bug reports). The backend additionally gates
  // sharing on an APPROVED completion, so this is an opt-in intent captured at
  // submit time.
  const canShareToFeed =
    action === "expertise_answer" ||
    quest.questType === "text_answer" ||
    quest.questType === "rubric";

  function reset() {
    setText("");
    setUrl("");
    setScreenshot(null);
    setShare(false);
    setShareField(EXPERTISE_FIELDS[0]);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Screenshot must be a JPG, PNG, or WebP image");
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      toast.error("Screenshot must be under 5MB");
      return;
    }
    setScreenshot(file);
  }

  const screenshotRequired = action === "bug_report";

  function handleSubmit() {
    if (!quest) return;
    if (needsUrl && !url.trim()) {
      toast.error("Please paste the link to your post");
      return;
    }
    if (needsText && !text.trim()) {
      toast.error("Please describe your submission");
      return;
    }
    if (screenshotRequired && !screenshot) {
      toast.error("Please attach a screenshot of the bug");
      return;
    }
    onSubmit(quest, {
      text: text.trim() || undefined,
      url: url.trim() || undefined,
      screenshot,
      share: canShareToFeed ? share : undefined,
      shareField: canShareToFeed && share ? shareField : undefined,
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={quest.title} size="md">
      <div className="space-y-4">
        {quest.description && (
          <p className="text-sm text-muted-foreground">{quest.description}</p>
        )}

        {needsUrl && (
          <Input
            label="Link to your post"
            placeholder="https://x.com/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        )}

        {needsText && (
          <Textarea
            label={action === "bug_report" ? "What happened?" : "Your answer"}
            description={
              action === "bug_report"
                ? "Briefly explain how the bug occurred."
                : undefined
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            showCounter
            maxLength={5000}
            rows={5}
            required
          />
        )}

        {allowsScreenshot && (
          <div>
            <label className="text-sm font-medium text-foreground">
              Screenshot {action === "bug_report" ? "" : "(optional)"}
            </label>
            {screenshot ? (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                <span className="truncate text-sm text-foreground">{screenshot.name}</span>
                <button
                  type="button"
                  onClick={() => setScreenshot(null)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remove screenshot"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground hover:border-primary/40">
                <Upload className="h-4 w-4" />
                Choose an image (JPG, PNG, WebP — max 5MB)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </label>
            )}
          </div>
        )}

        {canShareToFeed && (
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <label className="inline-flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                data-testid="quest-share-to-feed"
                checked={share}
                onChange={(e) => setShare(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/40"
              />
              <span className="text-sm font-medium text-foreground">
                Share this answer to the expert feed
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  Once your answer is approved, the team reviews it before it appears publicly.
                </span>
              </span>
            </label>
            {share && (
              <div className="mt-3">
                <NativeSelect
                  label="Expertise field"
                  value={shareField}
                  onChange={(e) => setShareField(e.target.value)}
                >
                  {EXPERTISE_FIELDS.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="default" onClick={handleSubmit} isLoading={submitting}>
            Submit for review
          </Button>
        </div>
      </div>
    </Modal>
  );
}
