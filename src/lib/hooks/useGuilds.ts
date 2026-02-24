"use client";

import { useState, useEffect, useCallback } from "react";
import { guildsApi, ApiError } from "@/lib/api";
import { resolveGuildId as matchGuild } from "@/lib/guildHelpers";
import type { GuildRecord } from "@/types";

// Module-level cache so every component shares one fetch
let cachedGuilds: GuildRecord[] | null = null;
let fetchPromise: Promise<GuildRecord[]> | null = null;

function fetchGuilds(): Promise<GuildRecord[]> {
  if (cachedGuilds) return Promise.resolve(cachedGuilds);
  if (fetchPromise) return fetchPromise;

  fetchPromise = guildsApi
    .getAll()
    .then((data: unknown) => {
      const list = Array.isArray(data) ? data : [];
      cachedGuilds = list.map((g: { id: string; name: string }) => ({
        id: g.id,
        name: g.name,
      }));
      return cachedGuilds;
    })
    .catch((err) => {
      // Clear promise so a later mount can retry
      fetchPromise = null;
      throw err;
    });

  return fetchPromise;
}

export function useGuilds() {
  const [guilds, setGuilds] = useState<GuildRecord[]>(cachedGuilds ?? []);
  const [isLoading, setIsLoading] = useState(!cachedGuilds);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedGuilds) {
      setGuilds(cachedGuilds);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchGuilds()
      .then((data) => {
        if (!cancelled) {
          setGuilds(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const msg =
            err instanceof ApiError
              ? err.message
              : (err as Error).message || "Failed to load guilds";
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const resolveGuildId = useCallback(
    (nameOrSlug: string): string | undefined => matchGuild(nameOrSlug, guilds),
    [guilds],
  );

  return { guilds, resolveGuildId, isLoading, error };
}
