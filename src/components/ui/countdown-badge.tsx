"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUrgencyColors } from "@/config/colors";

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
