"use client";

interface NotificationBadgeProps {
  count: number;
  maxDisplay?: number;
}

export function NotificationBadge({ count, maxDisplay = 99 }: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > maxDisplay ? `${maxDisplay}+` : count.toString();

  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
      {displayCount}
    </span>
  );
}
