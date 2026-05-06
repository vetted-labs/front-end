"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_PREFIX = "vetted:draft:";
const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_DEBOUNCE_MS = 500;

interface StoredDraft<T> {
  version: number;
  savedAt: number;
  data: T;
}

interface UseFormPersistenceOptions<T> {
  /** Stable namespace for the flow (e.g., "expert-apply", "guild-apply"). */
  namespace: string;
  /**
   * User-identity scope. Wallet address for experts, userId for candidate/company,
   * `null`/`undefined` for genuinely anonymous flows like signup. Drafts are
   * isolated per identity so two users on the same browser don't collide.
   */
  identity?: string | null;
  /**
   * Optional sub-key for parallel drafts under the same flow. Example: when an
   * expert has applications in flight to two guilds, pass each guildId so both
   * drafts coexist instead of overwriting one another.
   */
  variant?: string | null;
  /** Schema version. Bump when the persisted shape changes incompatibly. */
  version: number;
  /** Drafts older than this are auto-discarded. Defaults to 7 days. */
  expiryMs?: number;
  /** Save debounce window. Defaults to 500ms. */
  debounceMs?: number;
  /** Field paths (top-level keys) to strip before writing — e.g., `["password"]`. */
  excludeFields?: ReadonlyArray<keyof T & string>;
  /** Called once on mount when a valid draft is found. */
  onRestore?: (data: T) => void;
  /** Migrate older versions. Return the upgraded T, or `null` to discard. */
  migrate?: (oldData: unknown, fromVersion: number) => T | null;
}

interface UseFormPersistenceReturn<T> {
  /** Persist a snapshot. Internally debounced — safe to call on every keystroke. */
  save: (data: T) => void;
  /** Wipe the draft for the current identity/variant. Call after successful submit. */
  clear: () => void;
  /** True iff this mount restored a draft. Use to show a "draft restored" banner. */
  wasRestored: boolean;
  /** Hide the banner without clearing the draft. */
  dismissRestored: () => void;
}

function buildKey(namespace: string, identity: string | null | undefined, variant: string | null | undefined): string {
  const id = identity ? identity.toLowerCase() : "anon";
  const v = variant ? variant : "default";
  return `${STORAGE_PREFIX}${namespace}:${id}:${v}`;
}

function safeRead(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function safeWrite(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    // quota exceeded or storage unavailable — silently ignore
  }
}

function stripExcluded<T>(data: T, exclude: ReadonlyArray<string> | undefined): T {
  if (!exclude || exclude.length === 0 || data === null || typeof data !== "object") return data;
  const copy: Record<string, unknown> = { ...(data as Record<string, unknown>) };
  for (const key of exclude) delete copy[key];
  return copy as T;
}

/**
 * Persists form data to localStorage so users can resume after refresh, tab
 * close, or accidental navigation. Drafts are scoped per `(namespace, identity,
 * variant)` so two users on the same browser don't collide and a single user
 * can have parallel drafts (e.g., applying to two guilds at once).
 *
 * Stored payload shape: `{ version, savedAt, data }`. Schema changes should
 * bump `version`; supply `migrate` to upgrade older drafts in place, or return
 * `null` from `migrate` to discard.
 *
 * The hook resets when `identity` or `variant` changes — switching wallets or
 * guild contexts re-hydrates from the new key.
 */
export function useFormPersistence<T>(
  options: UseFormPersistenceOptions<T>
): UseFormPersistenceReturn<T> {
  const {
    namespace,
    identity,
    variant,
    version,
    expiryMs = DEFAULT_EXPIRY_MS,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    excludeFields,
    onRestore,
    migrate,
  } = options;

  const storageKey = useMemo(
    () => buildKey(namespace, identity, variant),
    [namespace, identity, variant]
  );

  const [wasRestored, setWasRestored] = useState(false);
  const onRestoreRef = useRef(onRestore);
  const migrateRef = useRef(migrate);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHydratedKeyRef = useRef<string | null>(null);

  // eslint-disable-next-line no-restricted-syntax -- keeps callback refs current without re-hydrating
  useEffect(() => {
    onRestoreRef.current = onRestore;
    migrateRef.current = migrate;
  }, [onRestore, migrate]);

  // Hydrate when the key changes (identity / variant switch).
  // eslint-disable-next-line no-restricted-syntax -- syncs external storage state with current identity/variant
  useEffect(() => {
    if (lastHydratedKeyRef.current === storageKey) return;
    lastHydratedKeyRef.current = storageKey;

    const raw = safeRead(storageKey);
    if (!raw) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets banner when no draft exists for the new key
      setWasRestored(false);
      return;
    }

    let parsed: StoredDraft<unknown>;
    try {
      parsed = JSON.parse(raw) as StoredDraft<unknown>;
    } catch {
      safeRemove(storageKey);
      setWasRestored(false);
      return;
    }

    if (Date.now() - parsed.savedAt > expiryMs) {
      safeRemove(storageKey);
      setWasRestored(false);
      return;
    }

    let restored: T | null = null;
    if (parsed.version === version) {
      restored = parsed.data as T;
    } else if (migrateRef.current) {
      try {
        restored = migrateRef.current(parsed.data, parsed.version);
      } catch {
        restored = null;
      }
    }

    if (restored === null) {
      safeRemove(storageKey);
      setWasRestored(false);
      return;
    }

    onRestoreRef.current?.(restored);
    setWasRestored(true);
  }, [storageKey, version, expiryMs]);

  // eslint-disable-next-line no-restricted-syntax -- clears pending debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  const save = useCallback(
    (data: T) => {
      if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        const sanitized = stripExcluded(data, excludeFields);
        const draft: StoredDraft<T> = {
          version,
          savedAt: Date.now(),
          data: sanitized,
        };
        safeWrite(storageKey, JSON.stringify(draft));
        debounceTimerRef.current = null;
      }, debounceMs);
    },
    [storageKey, version, debounceMs, excludeFields]
  );

  const clear = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    safeRemove(storageKey);
    setWasRestored(false);
  }, [storageKey]);

  const dismissRestored = useCallback(() => {
    setWasRestored(false);
  }, []);

  return { save, clear, wasRestored, dismissRestored };
}

/**
 * Wipes every draft scoped to a given identity across all namespaces and
 * variants. Wire this into `AuthContext.logout()` so a logging-out user's
 * drafts don't leak to whoever signs in next on the same device.
 */
export function clearAllDraftsForIdentity(identity: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const id = identity ? identity.toLowerCase() : "anon";

  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch {
    return;
  }

  const toDelete: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    // Key shape: vetted:draft:{namespace}:{identity}:{variant}
    const parts = key.slice(STORAGE_PREFIX.length).split(":");
    if (parts.length < 3) continue;
    if (parts[1] === id) toDelete.push(key);
  }

  for (const key of toDelete) {
    try {
      storage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

/** Exposed for tests and adoption helpers. */
export const __DRAFT_STORAGE_PREFIX = STORAGE_PREFIX;
