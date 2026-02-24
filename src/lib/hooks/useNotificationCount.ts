"use client";

import { useState, useEffect } from "react";
import { notificationsApi } from "@/lib/api";

export function useNotificationCount(address: string | undefined, enabled: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled || !address) {
      setCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const result: any = await notificationsApi.getUnreadCount(address);
        setCount(result?.count || 0);
      } catch {
        // Silently fail — badge just won't show
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [enabled, address]);

  return count;
}
