"use client";

import { useEffect } from "react";
import { parseStoryLabActive } from "@/lib/story-lab/parseStoryLabActive";

const STORY_PREFIXES = ["story-lab-"] as const;

function looksLikeStoryDom(node: Element): boolean {
  if (node.id && STORY_PREFIXES.some((p) => node.id.startsWith(p))) return true;
  for (const attr of node.getAttributeNames()) {
    if (attr.startsWith("data-story-lab-")) return true;
  }
  return false;
}

export function StoryLabLeakDetector() {
  // eslint-disable-next-line no-restricted-syntax -- diagnostic-only effect; runs once and observes DOM
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof window === "undefined") return;

    const reportLeak = (node: Element) => {
      if (parseStoryLabActive(window.location.search)) return;
      const summary = node.outerHTML.slice(0, 240);
       
      console.error("StoryLab leak detected:", summary);
      throw new Error(`StoryLab leak detected: ${summary}`);
    };

    const sweep = (root: ParentNode) => {
      const candidates = root.querySelectorAll<HTMLElement>(
        "[id^='story-lab-'], [data-story-lab-guild-id], [data-story-lab-review-url]",
      );
      candidates.forEach(reportLeak);
    };

    sweep(document.body);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element && looksLikeStoryDom(node)) reportLeak(node);
          if (node instanceof Element) sweep(node);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
