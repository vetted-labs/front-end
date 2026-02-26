"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui";
import { guildFeedApi } from "@/lib/api";
import { useApi } from "@/lib/hooks/useFetch";
import { validateMinLength } from "@/lib/validation";
import { toast } from "sonner";
import { PollCreator } from "./PollCreator";
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
  const [tag, setTag] = useState<PostTag>("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [poll, setPoll] = useState<CreatePollPayload | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

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
        }),
      {
        onSuccess: () => {
          toast.success("Post created!");
          onCreated();
        },
        onError: (err) => toast.error(err),
      }
    );
  };

  return (
    <Modal isOpen onClose={onClose} title="New Post" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert variant="error">{error}</Alert>}

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
                onClick={() => setTag(option.value)}
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
        </div>

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
            <p className="mt-1 text-xs text-red-500">{fieldErrors.title}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground text-right">
            {title.length}/200
          </p>
        </div>

        {/* Body */}
        <div>
          <label
            htmlFor="post-body"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Body <span className="text-muted-foreground font-normal">(Markdown supported)</span>
          </label>
          <textarea
            id="post-body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (fieldErrors.body) setFieldErrors((prev) => ({ ...prev, body: "" }));
            }}
            placeholder="Share your thoughts, ask a question, or provide insight..."
            rows={8}
            maxLength={5000}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 resize-y"
          />
          {fieldErrors.body && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.body}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground text-right">
            {body.length}/5000
          </p>
        </div>

        {/* Poll Creator */}
        <PollCreator poll={poll} onChange={setPoll} />
        {fieldErrors.poll && (
          <p className="text-xs text-red-500">{fieldErrors.poll}</p>
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
            disabled={isLoading}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
