"use client";

import { createContext, useContext } from "react";
import type { FeedPrivileges } from "@/types";

interface FeedContextValue {
  guildId: string;
  isAuthenticated: boolean;
  isMember: boolean;
  privileges: FeedPrivileges;
  userId: string | null;
  onVoteUpdate: () => void;
  onRepliesChanged: () => void;
}

const FeedContext = createContext<FeedContextValue | null>(null);

export function FeedProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: FeedContextValue;
}) {
  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeedContext(): FeedContextValue {
  const ctx = useContext(FeedContext);
  if (!ctx) {
    throw new Error("useFeedContext must be used within a FeedProvider");
  }
  return ctx;
}
