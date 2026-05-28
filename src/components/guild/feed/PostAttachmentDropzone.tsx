"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { guildFeedApi } from "@/lib/api";
import { extractApiError } from "@/lib/api";

export interface PostAttachment {
  url: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}

interface PostAttachmentDropzoneProps {
  guildId: string;
  attachments: PostAttachment[];
  onChange: (next: PostAttachment[]) => void;
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 4;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PostAttachmentDropzone({
  guildId,
  attachments,
  onChange,
}: PostAttachmentDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const slotsRemaining = MAX_FILES - attachments.length;
  const atCapacity = slotsRemaining <= 0;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;

      // Capacity gate — UI enforces 4, backend enforces 8.
      if (list.length > slotsRemaining) {
        toast.error(`You can attach up to ${MAX_FILES} images per post.`);
      }
      const accepted = list.slice(0, slotsRemaining).filter((file) => {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast.error(`${file.name}: only PNG, JPEG, or WebP images are allowed.`);
          return false;
        }
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name}: max file size is 10 MB.`);
          return false;
        }
        return true;
      });
      if (accepted.length === 0) return;

      setUploadingCount((c) => c + accepted.length);
      const uploaded: PostAttachment[] = [];
      await Promise.all(
        accepted.map(async (file) => {
          try {
            const result = await guildFeedApi.uploadImage(guildId, file);
            uploaded.push({
              url: result.url,
              mimeType: result.mimeType,
              sizeBytes: result.sizeBytes,
            });
          } catch (err) {
            toast.error(extractApiError(err, `Failed to upload ${file.name}.`));
          } finally {
            setUploadingCount((c) => Math.max(0, c - 1));
          }
        })
      );
      if (uploaded.length > 0) {
        onChange([...attachments, ...uploaded]);
      }
    },
    [attachments, guildId, onChange, slotsRemaining]
  );

  const removeAttachment = (idx: number) => {
    onChange(attachments.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        Attachments{" "}
        <span className="text-muted-foreground font-normal">
          (up to {MAX_FILES} images, 10 MB each)
        </span>
      </label>

      <div
        onDragOver={(e) => {
          if (atCapacity) return;
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (atCapacity) return;
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          if (atCapacity) return;
          inputRef.current?.click();
        }}
        role="button"
        tabIndex={atCapacity ? -1 : 0}
        onKeyDown={(e) => {
          if (atCapacity) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        data-testid="attachment-dropzone"
        aria-disabled={atCapacity}
        className={`flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
          atCapacity
            ? "border-border bg-muted/30 cursor-not-allowed opacity-60"
            : isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/40 hover:bg-muted/30"
        }`}
      >
        <Upload className="w-5 h-5 text-muted-foreground" />
        <p className="text-sm text-foreground">
          {atCapacity ? (
            <>Attachment limit reached</>
          ) : (
            <>
              <span className="font-medium">Click to upload</span> or drag and drop
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP · max 10 MB</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            // Reset so re-selecting the same file fires `change` again.
            e.target.value = "";
          }}
          data-testid="attachment-input"
        />
      </div>

      {(attachments.length > 0 || uploadingCount > 0) && (
        <ul className="mt-3 space-y-2" data-testid="attachment-list">
          {attachments.map((att, idx) => (
            <li
              key={`${att.url}-${idx}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-muted/30"
            >
              <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">
                  {att.url.split("/").pop() || att.url}
                </p>
                <p className="text-xs text-muted-foreground">
                  {att.mimeType} · {formatSize(att.sizeBytes)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                aria-label="Remove attachment"
                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
          {uploadingCount > 0 && (
            <li className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Uploading {uploadingCount} file{uploadingCount === 1 ? "" : "s"}...
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
