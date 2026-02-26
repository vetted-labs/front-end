"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownBodyProps {
  content: string;
  className?: string;
}

export function MarkdownBody({ content, className = "" }: MarkdownBodyProps) {
  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none
        prose-p:my-2 prose-p:leading-relaxed
        prose-ul:my-2 prose-ol:my-2
        prose-li:my-0.5
        prose-headings:mt-4 prose-headings:mb-2
        prose-strong:text-foreground prose-strong:font-semibold
        prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-muted prose-pre:rounded-lg prose-pre:p-3
        prose-blockquote:border-l-primary/50 prose-blockquote:text-muted-foreground
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        ${className}`}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
