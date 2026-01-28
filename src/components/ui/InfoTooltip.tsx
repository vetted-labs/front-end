"use client";
import { useState } from "react";
import { HelpCircle } from "lucide-react";

interface InfoTooltipProps {
  content: string;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function InfoTooltip({ content, side = "top", className = "" }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent",
  };

  // Return null if no content provided
  if (!content) {
    return null;
  }

  // Detect if content has markdown-style formatting
  const hasFormatting = content.includes('**') || content.includes('\n\n');

  // Parse formatted content into sections
  const renderContent = () => {
    if (!hasFormatting) {
      return <>{content}</>;
    }

    // Split by double newlines to get sections
    const sections = content.split('\n\n');

    return (
      <>
        {sections.map((section, index) => {
          // Check if this section has bold formatting
          if (section.includes('**')) {
            const boldMatch = section.match(/\*\*(.*?)\*\*/);
            if (boldMatch) {
              const boldText = boldMatch[1];
              const remainingText = section.replace(/\*\*(.*?)\*\*/, '').trim();

              return (
                <div key={index} className={index > 0 ? 'mt-2' : ''}>
                  <div className="font-semibold">{boldText}</div>
                  {remainingText && <div className="mt-1">{remainingText}</div>}
                </div>
              );
            }
          }

          // Regular section
          return (
            <div key={index} className={index > 0 ? 'mt-2' : ''}>
              {section}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors border border-slate-300 dark:border-slate-600"
        aria-label="More information"
      >
        <HelpCircle className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
      </button>

      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[side]} animate-in fade-in-0 zoom-in-95`}
          role="tooltip"
        >
          <div className="relative">
            <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-5 py-4 shadow-2xl w-[520px] text-sm leading-relaxed">
              {renderContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
