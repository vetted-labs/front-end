"use client";

import { useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import type { UploadedImage } from "@/types";
import { MAX_GALLERY_IMAGES } from "@/types";
import { extractApiError, jobsApi } from "@/lib/api";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validate(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `${file.name}: use JPG, PNG, or WebP.`;
  }
  if (file.size > MAX_BYTES) {
    return `${file.name}: file too large (max 4 MB).`;
  }
  return null;
}

interface GalleryGridProps {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  disabled?: boolean;
}

export function GalleryGrid({ value, onChange, disabled }: GalleryGridProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const filledCount = value.length;
  const slots = Math.max(0, MAX_GALLERY_IMAGES - filledCount - pendingCount);

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    const remaining = MAX_GALLERY_IMAGES - value.length - pendingCount;
    const accepted = files.slice(0, Math.max(0, remaining));
    if (accepted.length < files.length) {
      setError(
        `Only ${MAX_GALLERY_IMAGES} images allowed — extra files were skipped.`
      );
    }
    const validFiles: File[] = [];
    for (const f of accepted) {
      const v = validate(f);
      if (v) {
        setError(v);
        continue;
      }
      validFiles.push(f);
    }
    if (!validFiles.length) return;

    setPendingCount((c) => c + validFiles.length);
    const results = await Promise.allSettled(
      validFiles.map((f) => jobsApi.uploadAttachment(f))
    );
    const newImages: UploadedImage[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        newImages.push({
          url: r.value.url,
          filename: r.value.filename,
          sizeBytes: r.value.sizeBytes,
        });
      } else {
        const msg = extractApiError(
          r.reason,
          `Failed to upload ${validFiles[i].name}`
        );
        setError(msg);
        logger.error("gallery upload failed", r.reason, { silent: true });
      }
    });
    if (newImages.length) onChange([...value, ...newImages]);
    setPendingCount((c) => Math.max(0, c - validFiles.length));
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    void uploadFiles(arr);
  };

  const handleRemove = async (idx: number) => {
    const img = value[idx];
    if (!img) return;
    onChange(value.filter((_, i) => i !== idx));
    if (img.filename) {
      try {
        await jobsApi.deleteAttachment(img.filename);
      } catch (err) {
        logger.warn("Failed to delete gallery image on server", err, {
          silent: true,
        });
      }
    }
  };

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const tiles: React.ReactNode[] = [];
  // filled tiles
  value.forEach((img, i) => {
    tiles.push(
      <div
        key={`f-${i}-${img.filename}`}
        className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border bg-muted group"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded preview, dynamic origin */}
        <img
          src={img.url}
          alt={img.filename}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute top-2 left-2 w-[22px] h-[22px] grid place-items-center rounded-md bg-black/70 border border-border text-muted-foreground text-[10px] font-bold backdrop-blur-md cursor-grab"
          aria-label="Drag to reorder (coming soon)"
          // TODO(reorder): wire up @dnd-kit/sortable when available
        >
          ::
        </div>
        <button
          type="button"
          onClick={() => handleRemove(i)}
          className="absolute top-2 right-2 w-[22px] h-[22px] grid place-items-center rounded-md bg-black/70 border border-border text-foreground hover:text-rose-300 hover:border-rose-400/40 backdrop-blur-md"
          aria-label={`Remove ${img.filename}`}
        >
          <X className="w-3 h-3" />
        </button>
        <div className="absolute inset-x-0 bottom-0 px-2.5 py-1.5 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between text-[10.5px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-foreground/90 font-medium font-mono truncate max-w-[60%]">
            {img.filename}
          </span>
          <span>{formatBytes(img.sizeBytes)}</span>
        </div>
      </div>
    );
  });
  // pending tiles
  for (let i = 0; i < pendingCount; i++) {
    tiles.push(
      <div
        key={`u-${i}`}
        className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border bg-muted grid place-items-center"
      >
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="absolute bottom-2 inset-x-0 text-center text-[11px] text-muted-foreground">
          Uploading…
        </span>
      </div>
    );
  }
  // empty slots
  for (let i = 0; i < slots; i++) {
    tiles.push(
      <button
        key={`e-${i}`}
        type="button"
        onClick={openPicker}
        disabled={disabled}
        className={cn(
          "relative aspect-[4/3] rounded-xl border border-dashed transition-colors",
          "grid place-items-center text-muted-foreground",
          dragOver && i === 0
            ? "border-primary/40 bg-primary/5 text-primary"
            : "border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="w-8 h-8 rounded-full border border-dashed border-current grid place-items-center">
            <Plus className="w-4 h-4" />
          </span>
          <span className="text-[11px] tracking-wider uppercase">
            Drop or click
          </span>
        </div>
      </button>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">{tiles}</div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
