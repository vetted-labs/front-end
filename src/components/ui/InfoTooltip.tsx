"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";

interface InfoTooltipProps {
  content: string;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function InfoTooltip({ content, side = "top", className = "" }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  if (!content) {
    return null;
  }

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    let top = 0;
    let left = 0;

    switch (side) {
      case "top":
        top = rect.top + scrollY;
        left = rect.left + scrollX + rect.width / 2;
        break;
      case "bottom":
        top = rect.bottom + scrollY;
        left = rect.left + scrollX + rect.width / 2;
        break;
      case "left":
        top = rect.top + scrollY + rect.height / 2;
        left = rect.left + scrollX;
        break;
      case "right":
        top = rect.top + scrollY + rect.height / 2;
        left = rect.right + scrollX;
        break;
    }

    setCoords({ top, left });
  }, [side]);

  const handleShow = () => {
    updatePosition();
    setIsVisible(true);
  };

  // Detect if content has markdown-style formatting
  const hasFormatting = content.includes('**') || content.includes('\n\n');

  const renderContent = () => {
    if (!hasFormatting) {
      return <>{content}</>;
    }

    const sections = content.split('\n\n');

    return (
      <>
        {sections.map((section, index) => {
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

          return (
            <div key={index} className={index > 0 ? 'mt-2' : ''}>
              {section}
            </div>
          );
        })}
      </>
    );
  };

  const positionStyle: React.CSSProperties = (() => {
    switch (side) {
      case "top":
        return { bottom: `calc(100vh - ${coords.top}px + 8px)`, left: coords.left, transform: "translateX(-50%)" };
      case "bottom":
        return { top: coords.top + 8, left: coords.left, transform: "translateX(-50%)" };
      case "left":
        return { top: coords.top, right: `calc(100vw - ${coords.left}px + 8px)`, transform: "translateY(-50%)" };
      case "right":
        return { top: coords.top, left: coords.left + 8, transform: "translateY(-50%)" };
    }
  })();

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={handleShow}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={handleShow}
        onBlur={() => setIsVisible(false)}
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted/60 hover:bg-muted transition-colors border border-border ${className}`}
        aria-label="More information"
      >
        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {isVisible && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className="fixed z-[9999] animate-in fade-in-0 zoom-in-95 pointer-events-none"
            style={positionStyle}
          >
            <div className="bg-popover text-popover-foreground border border-border rounded-xl px-4 py-3 shadow-2xl w-[min(90vw,420px)] text-sm leading-relaxed dark:bg-popover/95 dark:backdrop-blur-xl dark:border-white/[0.1]">
              {renderContent()}
            </div>
          </div>,
          document.body
        )
      }
    </>
  );
}
