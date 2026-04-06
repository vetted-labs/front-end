import React from "react";

/**
 * Renders basic markdown: **bold**, *italic*, bullet lists (- item), and paragraphs.
 * No external dependencies.
 */
export function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  return text.split("\n\n").map((block, i) => {
    const lines = block.split("\n");
    const isList =
      lines.length > 0 &&
      lines.every((l) => l.trim() === "" || /^[-*]\s/.test(l.trim()));

    if (isList) {
      const items = lines.filter((l) => l.trim() && /^[-*]\s/.test(l.trim()));
      return (
        <ul key={i} className="list-disc pl-5 space-y-1 mb-3">
          {items.map((line, j) => (
            <li key={j} className="text-sm text-muted-foreground">
              {formatInline(line.replace(/^[-*]\s+/, ""))}
            </li>
          ))}
        </ul>
      );
    }

    return (
      <p key={i} className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
        {formatInline(block)}
      </p>
    );
  });
}

function formatInline(text: string): React.ReactNode {
  // Split on **bold** and *italic* markers
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-foreground font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
