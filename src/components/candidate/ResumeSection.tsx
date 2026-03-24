"use client";

import {
  FileText,
  Upload,
  Loader2,
  CheckCircle,
  Download,
  X,
} from "lucide-react";
import { getAssetUrl } from "@/lib/api";

interface ResumeSectionProps {
  resumeUrl?: string;
  resumeFileName?: string;
  isEditing: boolean;
  isSaving: boolean;
  resumeFile: File | null;
  uploadProgress: number;
  error?: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onRemoveFile: () => void;
  onClearResume: () => void;
}

export default function ResumeSection({
  resumeUrl,
  resumeFileName,
  isEditing,
  isSaving,
  resumeFile,
  uploadProgress,
  error,
  onFileChange,
  onUpload,
  onRemoveFile,
  onClearResume,
}: ResumeSectionProps) {
  return (
    <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
      <div className="px-6 py-4 border-b border-border/40">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          Resume / CV
        </h2>
      </div>
      <div className="p-6">
        {resumeUrl ? (
          <div className="flex items-center justify-between p-4 bg-green-500/5 border border-green-500/15 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {resumeFileName || "resume.pdf"}
                </p>
                <p className="text-xs text-muted-foreground">Uploaded</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={getAssetUrl(resumeUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
              {isEditing && (
                <button
                  onClick={onClearResume}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : isEditing ? (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors">
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              Upload your resume
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              PDF or Word document, max 5MB
            </p>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={onFileChange}
              className="hidden"
              id="resume-upload"
            />
            <label
              htmlFor="resume-upload"
              className="inline-flex items-center px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer transition-colors"
            >
              Choose File
            </label>
          </div>
        ) : (
          <div className="text-center py-6">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No resume uploaded yet</p>
          </div>
        )}

        {resumeFile && (
          <div className="mt-4 p-4 bg-primary/5 border border-primary/15 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {resumeFile.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({(resumeFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                onClick={onRemoveFile}
                className="p-1 text-muted-foreground hover:text-foreground rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {uploadProgress > 0 && (
              <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
            <button
              onClick={onUpload}
              disabled={isSaving}
              className="w-full py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Resume
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm mt-3">{error}</p>
        )}
      </div>
    </div>
  );
}
