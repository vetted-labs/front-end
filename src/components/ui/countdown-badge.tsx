"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountdownBadgeProps {
  deadline: Date | string;
  label?: string;
  className?: string;
}

function getTimeRemaining(deadline: Date) {
  const now = new Date();
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

function getUrgencyColor(hours: number, expired: boolean) {
  if (expired) return "bg-destructive/10 text-destructive border-destructive/20";
  if (hours < 6) return "bg-red-500/10 text-red-600 border-red-500/20";
  if (hours < 24) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  return "bg-muted text-muted-foreground border-border";
}

export function CountdownBadge({ deadline, label, className }: CountdownBadgeProps) {
  const [remaining, setRemaining] = useState(() =>
    getTimeRemaining(new Date(deadline))
  );

  // eslint-disable-next-line no-restricted-syntax -- timer with runtime dependency on deadline prop
  useEffect(() => {
    setRemaining(getTimeRemaining(new Date(deadline)));
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(new Date(deadline)));
    }, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  const totalHours = remaining.days * 24 + remaining.hours;
  const urgencyColor = getUrgencyColor(totalHours, remaining.expired);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
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
