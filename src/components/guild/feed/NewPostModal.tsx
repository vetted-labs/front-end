"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui";
import { guildFeedApi } from "@/lib/api";
import { useApi } from "@/lib/hooks/useFetch";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useExpertSession } from "@/lib/hooks/useExpertSession";
import { validateMinLength } from "@/lib/validation";
import { toast } from "sonner";
import { PollCreator } from "./PollCreator";
import { MarkdownToolbar } from "./MarkdownToolbar";
import { MarkdownBody } from "./MarkdownBody";
import { JobPicker } from "./JobPicker";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { PostAttachmentDropzone, type PostAttachment } from "./PostAttachmentDropzone";
import { logger } from "@/lib/logger";
import type { PostTag, GuildPost, CreatePollPayload } from "@/types";

interface NewPostModalProps {
  guildId: string;
  onClose: () => void;
  onCreated: () => void;
}

const TAG_OPTIONS: { value: PostTag; label: string }[] = [
  { value: "discussion", label: "Discussion" },
  { value: "question", label: "Question" },
  { value: "insight", label: "Insight" },
  { value: "job_related", label: "Job-Related" },
];

export function NewPostModal({ guildId, onClose, onCreated }: NewPostModalProps) {
  const { execute, isLoading, error } = useApi<GuildPost>();
  const { ensureSession, isSigning } = useExpertSession();
  const auth = useAuthContext();
  // Backend gate: only experts may create internal (is_private) posts.
  // Candidates / companies are rejected with 403, so hide the toggle entirely
  // for non-experts.
  const canCreateInternalPost = auth.userType === "expert";
  const [tag, setTag] = useState<PostTag>("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [poll, setPoll] = useState<CreatePollPayload | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<{ id: string; title: string } | null>(null);
  const [attachments, setAttachments] = useState<PostAttachment[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [signGateError, setSignGateError] = useState<string | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    const titleMinErr = validateMinLength(title, 5, "Title");
    if (titleMinErr) errors.title = titleMinErr;
    else if (title.length > 200) errors.title = "Title must be at most 200 characters";

    const bodyMinErr = validateMinLength(body, 10, "Body");
    if (bodyMinErr) errors.body = bodyMinErr;
    else if (body.length > 5000) errors.body = "Body must be at most 5000 characters";

    // Validate poll options if a poll is attached
    if (poll) {
      const filledOptions = poll.options.filter((o) => o.trim().length > 0);
      if (filledOptions.length < 2) {
        errors.poll = "Poll needs at least 2 non-empty options";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitPost = async () => {
    // Clean poll options before submission
    const cleanPoll = poll
      ? {
          ...poll,
          options: poll.options.filter((o) => o.trim().length > 0).map((o) => o.trim()),
        }
      : undefined;

    await execute(
      () =>
        guildFeedApi.createPost(guildId, {
          title: title.trim(),
          body: body.trim(),
          tag,
          poll: cleanPoll,
          // Only send `jobId` when the post is actually tagged job-related to
          // avoid bleeding stale selections from the picker if the user
          // switched tags mid-compose.
          jobId: tag === "job_related" && jobId ? jobId : undefined,
          // Only send `isPrivate` when the toggle is on AND the user can
          // actually create internal posts (experts only). The backend schema
          // is `.strict()`, so omit the field entirely otherwise.
          ...(canCreateInternalPost && isPrivate ? { isPrivate: true } : {}),
        }),
      {
        onSuccess: async (post) => {
          // Persist each uploaded image as a `guild_post_attachments` row.
          // Failures here don't roll back the post — the post is already
          // public — but we surface a non-blocking toast so the author
          // knows to retry.
          if (attachments.length > 0) {
            const failed: string[] = [];
            await Promise.all(
              attachments.map(async (att) => {
                try {
                  await guildFeedApi.addAttachment(guildId, post.id, att);
                } catch (err) {
                  logger.warn("[NewPostModal] addAttachment failed", err);
                  failed.push(att.url);
                }
              })
            );
            if (failed.length > 0) {
              toast.warning(
                `Post created, but ${failed.length} attachment${failed.length === 1 ? "" : "s"} failed to attach.`
              );
            }
          }
          toast.success("Post created!");
          onCreated();
        },
        onError: (err) => toast.error(err),
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSignGateError(null);

    // Gate: ensure the expert has a fresh signed-session JWT before posting.
    // The flag-off branch falls through to the legacy behavior.
    const session = await ensureSession();
    if (!session.ok && session.reason !== "flag-off") {
      if (session.reason === "user-rejected") {
        setSignGateError("Sign with your wallet to publish posts.");
        return;
      }
      toast.error(session.error ?? "Could not authenticate. Please try again.");
      return;
    }

    await submitPost();
  };

  const handleRetrySign = async () => {
    setSignGateError(null);
    const session = await ensureSession();
    if (!session.ok && session.reason !== "flag-off") {
      if (session.reason === "user-rejected") {
        setSignGateError("Sign with your wallet to publish posts.");
        return;
      }
      toast.error(session.error ?? "Could not authenticate. Please try again.");
      return;
    }
    await submitPost();
  };

  return (
    <Modal isOpen onClose={onClose} title="New Post" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}
        {signGateError && (
          <Alert variant="error">
            <div className="flex items-center justify-between gap-3">
              <span>{signGateError}</span>
              <button
                type="button"
                onClick={handleRetrySign}
                disabled={isSigning || isLoading}
                className="ml-3 px-3 py-1 text-xs font-medium rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigning ? "Signing..." : "Try again"}
              </button>
            </div>
          </Alert>
        )}

        {/* Tag Selector */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Tag
          </label>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setTag(option.value);
                  // Clear the job selection when switching off job-related so the
                  // selection doesn't ghost into the next compose attempt.
                  if (option.value !== "job_related") {
                    setJobId(null);
                    setSelectedJob(null);
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  tag === option.value
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "text-muted-foreground border-border hover:text-foreground hover:border-primary/30"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {tag === "job_related" && (
            <JobPicker
              selected={jobId}
              selectedJob={selectedJob}
              onChange={(id, job) => {
                setJobId(id);
                setSelectedJob(job);
              }}
            />
          )}
        </div>

        {/* Visibility — experts only. Backend rejects is_private posts from
            candidates/companies, so we don't surface the toggle to them at
            all. */}
        {canCreateInternalPost && (
          <div>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                data-testid="new-post-private-toggle"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                aria-checked={isPrivate}
                className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/40"
              />
              <span className="text-sm font-medium text-foreground">
                Members only (internal post)
              </span>
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              When enabled, only members of this guild will see the post.
            </p>
          </div>
        )}

        {/* Title */}
        <div>
          <label
            htmlFor="post-title"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Title
          </label>
          <input
            id="post-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: "" }));
            }}
            placeholder="What do you want to discuss?"
            maxLength={200}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
          />
          {fieldErrors.title && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.title}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground text-right">
            {title.length}/200
          </p>
        </div>

        {/* Body — toolbar + textarea-or-preview + mention popover */}
        <div className="relative">
          <label
            htmlFor="post-body"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Body{" "}
            <span className="text-muted-foreground font-normal">
              (Markdown supported · type @&lt; to mention an expert)
            </span>
          </label>
          <MarkdownToolbar
            textareaRef={bodyRef}
            value={body}
            onChange={setBody}
            isPreviewing={isPreviewing}
            onTogglePreview={() => setIsPreviewing((p) => !p)}
          />
          {isPreviewing ? (
            <div
              className="w-full min-h-[12rem] px-4 py-2.5 rounded-b-lg border border-t-0 border-border bg-background"
              data-testid="markdown-preview"
            >
              {body.trim().length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nothing to preview yet.</p>
              ) : (
                <MarkdownBody content={body} />
              )}
            </div>
          ) : (
            <textarea
              id="post-body"
              ref={bodyRef}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (fieldErrors.body) setFieldErrors((prev) => ({ ...prev, body: "" }));
              }}
              placeholder="Share your thoughts, ask a question, or provide insight..."
              rows={8}
              maxLength={5000}
              className="w-full px-4 py-2.5 rounded-b-lg border border-t-0 border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 resize-y"
            />
          )}
          <MentionAutocomplete textareaRef={bodyRef} value={body} onChange={setBody} />
          {fieldErrors.body && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.body}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground text-right">
            {body.length}/5000
          </p>
        </div>

        {/* Attachments */}
        <PostAttachmentDropzone
          guildId={guildId}
          attachments={attachments}
          onChange={setAttachments}
        />

        {/* Poll Creator */}
        <PollCreator poll={poll} onChange={setPoll} />
        {fieldErrors.poll && (
          <p className="text-xs text-destructive">{fieldErrors.poll}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="new-post-submit"
            disabled={isLoading || isSigning}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSigning ? "Signing..." : isLoading ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
