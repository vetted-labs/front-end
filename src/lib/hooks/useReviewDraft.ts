"use client";

import { useCallback, useRef, useState } from "react";
import { useMountEffect } from "./useMountEffect";
import { reviewsApi } from "@/lib/api";
import { logger } from "@/lib/logger";

const DEBOUNCE_MS = 1500;

type Flow = "proposal" | "guildApplication";

/**
 * Auto-saving draft hook for the Resilient Review flow.
 *
 * - Loads any existing server-side draft on mount.
 * - Debounces local edits and PUTs them to the backend after 1.5s of idle.
 * - Survives mid-signing crashes: when the form remounts, the latest draft
 *   is fetched and restored.
 *
 * The draft body is opaque JSON (one row per (application, reviewer, context)).
 * Cleared by the backend on a successful on-chain commit submit.
 */
export function useReviewDraft<T extends Record<string, unknown>>(
  flow: Flow,
  applicationId: string,
  initial: T
) {
  const [body, setBody] = useState<T>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const api = flow === "proposal" ? reviewsApi.proposal : reviewsApi.guildApplication;

  useMountEffect(() => {
    let alive = true;
    api
      .getDraft(applicationId)
      .then((draft) => {
        if (!alive) return;
        // apiRequest auto-unwraps the { success, data } envelope so `draft`
        // is already the ReviewDraftResponse | null payload.
        if (draft && draft.body) {
          setBody(draft.body as T);
        }
      })
      .catch(() => {
        /* no draft yet, or fetch failed — silent */
      });
    return () => {
      alive = false;
    };
  });

  const update = useCallback(
    (patch: Partial<T>) => {
      setBody((prev) => {
        const next = { ...prev, ...patch };
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
          try {
            setIsSaving(true);
            await api.putDraft(applicationId, next);
          } catch (err) {
            logger.warn(
              "Draft save failed (will retry on next edit)",
              err,
              { silent: true }
            );
          } finally {
            setIsSaving(false);
          }
        }, DEBOUNCE_MS);
        return next;
      });
    },
    [api, applicationId]
  );

  return { body, setBody, update, isSaving };
}
