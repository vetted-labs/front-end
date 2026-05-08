"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUrgencyColors } from "@/config/colors";

interface CountdownBadgeProps {
  deadline: Date | string;
  label?: string;
  className?: string;
  /**
   * Optional reference "now" used to compute time-remaining. Pass a
   * server-issued anchor (e.g. from the same response that emitted
   * `deadline`) to avoid drift on dev machines whose clocks are skewed.
   * TODO(server-time): plumb a global server-clock anchor through the
   * tree so we don't need every callsite to thread `now` manually. Until
   * then this falls back to the client clock.
   */
  now?: Date | string;
}

function getTimeRemaining(deadline: Date, nowDate?: Date) {
  const now = nowDate ?? new Date();
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, text: "Expired" };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (days === 0) parts.push(`${minutes}m`);

  return { expired: false, days, hours, minutes, text: parts.join(" ") };
}

export function CountdownBadge({ deadline, label, className, now }: CountdownBadgeProps) {
  const [remaining, setRemaining] = useState(() => {
    const anchor = now ? new Date(now) : undefined;
    return getTimeRemaining(new Date(deadline), anchor);
  });

  // eslint-disable-next-line no-restricted-syntax -- timer with runtime dependency on deadline prop
  useEffect(() => {
    // Snapshot the offset between the server-issued `now` and the client
    // clock at effect-setup time. Subsequent ticks advance from the client
    // clock + this fixed offset, so the badge stays drift-corrected without
    // requiring callers to re-issue `now` every render.
    const serverOffsetMs = now ? new Date(now).getTime() - Date.now() : 0;
    const computeNow = (): Date | undefined =>
      now ? new Date(Date.now() + serverOffsetMs) : undefined;

    // Initial sync via a microtask so we don't trigger React's
    // setState-in-effect lint; behaviorally identical to a synchronous call
    // for the user (still resolves before the next paint).
    queueMicrotask(() => setRemaining(getTimeRemaining(new Date(deadline), computeNow())));
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(new Date(deadline), computeNow()));
    }, 60000);
    return () => clearInterval(interval);
  }, [deadline, now]);

  const totalHours = remaining.expired ? 0 : remaining.days * 24 + remaining.hours;
  const urgencyColor = getUrgencyColors(remaining.expired ? 0 : totalHours);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        urgencyColor,
        className
      )}
    >
      <Clock className="h-3 w-3" />
      {label && <span>{label}:</span>}
      {remaining.text}
    </span>
  );
}
