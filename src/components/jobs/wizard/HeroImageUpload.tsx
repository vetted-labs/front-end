"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import type { UploadedImage } from "@/types";
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

interface HeroImageUploadProps {
  value?: UploadedImage;
  onChange: (img: UploadedImage | undefined) => void;
  disabled?: boolean;
}

export function HeroImageUpload({
  value,
  onChange,
  disabled,
}: HeroImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validate = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Use a JPG, PNG, or WebP image.";
    }
    if (file.size > MAX_BYTES) {
      return `File is too large (max ${formatBytes(MAX_BYTES)}).`;
    }
    return null;
  };

  const upload = async (file: File) => {
    const v = validate(file);
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const res = await jobsApi.uploadAttachment(file);
      // Try to capture image dimensions client-side so the meta chip can show them.
      let width: number | undefined;
      let height: number | undefined;
      try {
        const dims = await readImageDimensions(file);
        width = dims.width;
        height = dims.height;
      } catch {
        // swallow — dimensions are nice-to-have
      }
      const image: UploadedImage = {
        url: res.url,
        filename: res.filename,
        sizeBytes: res.sizeBytes,
        width,
        height,
      };
      onChange(image);
    } catch (err) {
      const msg = extractApiError(err, "Hero image upload failed.");
      setError(msg);
      logger.error("hero upload failed", err, { silent: true });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    void upload(file);
  };

  const handleRemove = async () => {
    const current = value;
    onChange(undefined);
    setError(null);
    if (current?.filename) {
      try {
        await jobsApi.deleteAttachment(current.filename);
      } catch (err) {
        // Don't block UX — surface as a warning toast via logger.
        logger.warn("Failed to delete hero image on server", err, {
          silent: true,
        });
      }
    }
  };

  const openPicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  // ----- empty / dropzone state -----
  if (!value) {
    return (
      <div>
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !isUploading) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          disabled={disabled || isUploading}
          className={cn(
            "relative w-full aspect-video rounded-2xl border border-dashed",
            "bg-muted/40 grid place-items-center text-muted-foreground",
            "transition-colors disabled:cursor-not-allowed",
            isDragging
              ? "border-primary/60 bg-primary/5 text-primary"
              : "border-border hover:border-primary/40 hover:bg-muted"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <span className="text-sm font-medium">Uploading…</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center px-4">
              <div className="w-12 h-12 rounded-full border border-dashed border-current grid place-items-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                Drop your hero image here or click to browse
              </span>
              <span className="text-xs text-muted-foreground">
                JPG · PNG · WebP — max 4 MB · recommend 1600 × 900
              </span>
            </div>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  // ----- uploaded preview state -----
  const dims = value.width && value.height ? `${value.width}×${value.height}` : null;

  return (
    <div>
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-border bg-muted">
        {/* User-uploaded image with dynamic origin — next/image would require
            configuring remotePatterns for every backend host. Plain <img> is
            acceptable for a preview-only component. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value.url}
          alt="Hero preview"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* meta chip */}
        <div className="absolute top-3 left-3 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-black/60 border border-border text-[11px] text-foreground backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="truncate max-w-[200px]">{value.filename}</span>
          {dims && <span className="text-muted-foreground">· {dims}</span>}
          <span className="text-muted-foreground">
            · {formatBytes(value.sizeBytes)}
          </span>
        </div>

        {/* actions */}
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            type="button"
            onClick={openPicker}
            disabled={disabled || isUploading}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-black/70 border border-border text-foreground text-xs font-medium backdrop-blur-md hover:bg-black/80 disabled:opacity-50"
          >
            <Upload className="w-3 h-3" />
            Replace
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled || isUploading}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-black/70 border border-border text-rose-300 text-xs font-medium backdrop-blur-md hover:bg-black/80 disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" />
            Remove
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function readImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}
