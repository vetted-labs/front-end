"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const LOCALSTORAGE_PREFIX = "vetted:draft:";
const SESSIONSTORAGE_ANON_TAB_KEY = "vetted:anon-tab-id";
const DRAFT_CLEARING_EVENT = "vetted:draft-clearing-identity";
const DRAFT_QUOTA_EVENT = "vetted:draft-quota-exceeded";
const DEFAULT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_DEBOUNCE_MS = 500;

interface StoredDraft<T> {
  version: number;
  savedAt: number;
  data: T;
}

interface DraftClearingDetail {
  /** Lowercased identity scope being cleared. */
  identity: string;
}

interface UseFormPersistenceOptions<T> {
  /** Stable namespace for the flow (e.g., "expert-apply", "guild-apply"). Must not contain `:`. */
  namespace: string;
  /**
   * User-identity scope. Wallet address for experts, userId for candidate/company,
   * `null`/`undefined` for genuinely anonymous flows like signup. Identities are
   * compared case-insensitively. Anonymous flows are scoped to a per-tab token
   * (sessionStorage-backed) so kiosks/shared devices don't leak drafts across users.
   */
  identity?: string | null;
  /**
   * Optional sub-key for parallel drafts under the same flow. Example: when an
   * expert has applications in flight to two guilds, pass each guildId so both
   * drafts coexist instead of overwriting one another. Must not contain `:`.
   */
  variant?: string | null;
  /** Schema version. Bump when the persisted shape changes incompatibly. */
  version: number;
  /** Drafts older than this are auto-discarded. Defaults to 7 days. */
  expiryMs?: number;
  /** Save debounce window. Defaults to 500ms. */
  debounceMs?: number;
  /**
   * Dot-separated paths to fields to strip before writing — e.g.,
   * `["password", "credentials.token"]`. Nested paths are walked; missing
   * segments are skipped silently.
   */
  excludeFields?: ReadonlyArray<string>;
  /**
   * If true (default), pending writes are flushed when the page becomes
   * hidden (`visibilitychange`) so users who close their tab quickly don't
   * lose the last keystrokes.
   */
  flushOnHide?: boolean;
  /** Called when a valid draft is found on hydrate or via cross-tab sync. */
  onRestore?: (data: T) => void;
  /** Migrate older versions. Return the upgraded T, or `null` to discard. */
  migrate?: (oldData: unknown, fromVersion: number) => T | null;
}

interface UseFormPersistenceReturn<T> {
  /** Persist a snapshot. Internally debounced — safe to call on every keystroke. */
  save: (data: T) => void;
  /** Force-flush a snapshot synchronously. Bypasses the debounce. */
  flush: (data: T) => void;
  /** Wipe the draft for the current identity/variant. Call after successful submit. */
  clear: () => void;
  /** True iff this mount restored a draft. Use to show a "draft restored" banner. */
  wasRestored: boolean;
  /** Hide the banner without clearing the draft. */
  dismissRestored: () => void;
}

function assertNoColon(value: string, label: string): void {
  if (value.includes(":")) {
    throw new Error(
      `[useFormPersistence] ${label} must not contain ':' (got "${value}") — keys would be ambiguous to parse.`
    );
  }
}

function getOrCreateAnonTabId(): string {
  if (typeof window === "undefined") return "anon";
  try {
    const ss = window.sessionStorage;
    let id = ss.getItem(SESSIONSTORAGE_ANON_TAB_KEY);
    if (!id) {
      const fallback = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const fresh =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : fallback;
      id = `anon-${fresh}`;
      ss.setItem(SESSIONSTORAGE_ANON_TAB_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function resolveIdentityKey(identity: string | null | undefined): string {
  return identity ? identity.toLowerCase() : getOrCreateAnonTabId();
}

function buildKey(
  namespace: string,
  identityKey: string,
  variant: string | null | undefined
): string {
  const v = variant ? variant : "default";
  if (v !== "default") assertNoColon(v, "variant");
  return `${LOCALSTORAGE_PREFIX}${namespace}:${identityKey}:${v}`;
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
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch (err) {
    // Most likely QuotaExceededError. Surface to consumers so they can show a
    // banner instead of silently failing.
    try {
      window.dispatchEvent(
        new CustomEvent(DRAFT_QUOTA_EVENT, { detail: { key, error: String(err) } })
      );
    } catch {
      // ignore
    }
  }
}

function deleteAtPath(target: Record<string, unknown>, segments: string[]): void {
  if (segments.length === 0) return;
  const [head, ...tail] = segments;
  if (tail.length === 0) {
    delete target[head];
    return;
  }
  const next = target[head];
  if (next && typeof next === "object") {
    deleteAtPath(next as Record<string, unknown>, tail);
  }
}

function stripExcluded<T>(data: T, exclude: ReadonlyArray<string> | undefined): T {
  if (!exclude || exclude.length === 0 || data === null || typeof data !== "object") {
    return data;
  }
  // Deep clone so the caller's object is never mutated.
  let copy: T;
  try {
    copy = JSON.parse(JSON.stringify(data)) as T;
  } catch {
    // If data isn't JSON-serializable we can't safely strip — return as-is.
    return data;
  }
  for (const path of exclude) {
    if (!path) continue;
    deleteAtPath(copy as Record<string, unknown>, path.split("."));
  }
  return copy;
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
 * guild contexts re-hydrates from the new key. It also listens for the
 * `vetted:draft-clearing-identity` event (dispatched by
 * `clearAllDraftsForIdentity`) and the `storage` event so cross-tab and
 * logout-time cleanup propagate without reviving drafts.
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
    flushOnHide = true,
    onRestore,
    migrate,
  } = options;

  // Validate the namespace once — adopters who hardcode it should fail loudly.
  if (namespace && namespace.includes(":")) {
    assertNoColon(namespace, "namespace");
  }

  // Stabilize excludeFields so a fresh array literal at the call site doesn't
  // recreate `save` on every render and reset the debounce timer continuously.
  const excludeFieldsKey = excludeFields ? excludeFields.join("|") : "";
  const stableExcludeFields = useMemo(
    () => (excludeFields ? [...excludeFields] : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key string captures content equality
    [excludeFieldsKey]
  );

  const identityKey = useMemo(
    () => resolveIdentityKey(identity),
    [identity]
  );
  const storageKey = useMemo(
    () => buildKey(namespace, identityKey, variant),
    [namespace, identityKey, variant]
  );

  const [wasRestored, setWasRestored] = useState(false);
  const onRestoreRef = useRef(onRestore);
  const migrateRef = useRef(migrate);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFlushedDataRef = useRef<T | null>(null);
  const hydratedKeyRef = useRef<string | null>(null);

  // eslint-disable-next-line no-restricted-syntax -- keeps callback refs current without re-hydrating
  useEffect(() => {
    onRestoreRef.current = onRestore;
    migrateRef.current = migrate;
  }, [onRestore, migrate]);

  // Hydrate when the storage key changes (identity / variant switch). Cancels
  // any pending debounce from the previous key first so we never write
  // stale-form-state under a new key.
  // eslint-disable-next-line no-restricted-syntax -- syncs external storage state with current identity/variant
  useEffect(() => {
    if (hydratedKeyRef.current === storageKey) return;
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    hydratedKeyRef.current = storageKey;
    lastFlushedDataRef.current = null;

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

  // Listen for cleanup signal dispatched by clearAllDraftsForIdentity. Fires
  // synchronously *before* localStorage entries are removed, giving us a
  // chance to cancel any in-flight debounced save that would otherwise
  // resurrect the draft after cleanup.
  // eslint-disable-next-line no-restricted-syntax -- subscribes to cross-component cleanup signal
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<DraftClearingDetail>).detail;
      if (!detail || detail.identity !== identityKey) return;
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      hydratedKeyRef.current = null;
      lastFlushedDataRef.current = null;
      setWasRestored(false);
    };
    window.addEventListener(DRAFT_CLEARING_EVENT, handler);
    return () => window.removeEventListener(DRAFT_CLEARING_EVENT, handler);
  }, [identityKey]);

  // Cross-tab cleanup propagation: when another tab removes our key (likely
  // via logout), reset local state instead of letting the next save resurrect
  // the draft. Note: we deliberately do NOT re-hydrate on cross-tab content
  // changes — last-writer-wins for normal saves keeps semantics simple and
  // avoids overwriting in-progress edits with another tab's snapshot.
  // eslint-disable-next-line no-restricted-syntax -- subscribes to cross-tab storage events for cleanup propagation
  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      if (event.newValue !== null) return;
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      lastFlushedDataRef.current = null;
      setWasRestored(false);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [storageKey]);

  // Flush pending save when the page is hidden so a tab close within the
  // debounce window doesn't drop the last keystrokes.
  // eslint-disable-next-line no-restricted-syntax -- listens for page lifecycle to flush pending writes
  useEffect(() => {
    if (!flushOnHide) return;
    const handler = () => {
      if (document.visibilityState !== "hidden") return;
      if (debounceTimerRef.current === null) return;
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      const snapshot = lastFlushedDataRef.current;
      if (snapshot === null) return;
      const sanitized = stripExcluded(snapshot, stableExcludeFields);
      const draft: StoredDraft<T> = {
        version,
        savedAt: Date.now(),
        data: sanitized,
      };
      safeWrite(storageKey, JSON.stringify(draft));
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [flushOnHide, storageKey, version, stableExcludeFields]);

  // Cleanup pending debounce timer on unmount.
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
      // Suppress writes that race ahead of hydration (e.g. parent's save
      // effect fires after a variant switch but before our hydrate completes).
      if (hydratedKeyRef.current !== storageKey) return;
      lastFlushedDataRef.current = data;
      if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        const sanitized = stripExcluded(data, stableExcludeFields);
        const draft: StoredDraft<T> = {
          version,
          savedAt: Date.now(),
          data: sanitized,
        };
        safeWrite(storageKey, JSON.stringify(draft));
        debounceTimerRef.current = null;
      }, debounceMs);
    },
    [storageKey, version, debounceMs, stableExcludeFields]
  );

  const flush = useCallback(
    (data: T) => {
      if (hydratedKeyRef.current !== storageKey) return;
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const sanitized = stripExcluded(data, stableExcludeFields);
      const draft: StoredDraft<T> = {
        version,
        savedAt: Date.now(),
        data: sanitized,
      };
      safeWrite(storageKey, JSON.stringify(draft));
      lastFlushedDataRef.current = data;
    },
    [storageKey, version, stableExcludeFields]
  );

  const clear = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    lastFlushedDataRef.current = null;
    safeRemove(storageKey);
    setWasRestored(false);
  }, [storageKey]);

  const dismissRestored = useCallback(() => {
    setWasRestored(false);
  }, []);

  return { save, flush, clear, wasRestored, dismissRestored };
}

/**
 * Boilerplate-eliminating companion: subscribes the given snapshot to the
 * provided `save` function so adopters don't need to re-derive the same
 * `useEffect` + eslint-disable pattern at every call site.
 *
 * Pass `enabled=false` to suppress saves until the form has finished its own
 * mount-time setup (matching the existing `mounted` guard pattern).
 */
export function useDraftAutosave<T>(
  save: (data: T) => void,
  snapshot: T,
  enabled: boolean = true
): void {
  // eslint-disable-next-line no-restricted-syntax -- internal autosave bridge for useFormPersistence consumers
  useEffect(() => {
    if (!enabled) return;
    save(snapshot);
  }, [snapshot, enabled, save]);
}

/**
 * Wipes every draft scoped to a given identity across all namespaces and
 * variants. Wire into `AuthContext.logout()` AND wallet-disconnect paths so a
 * leaving user's drafts don't leak to whoever signs in next on the same
 * device.
 *
 * Dispatches `vetted:draft-clearing-identity` synchronously before deleting
 * keys, so any active hooks scoped to the same identity cancel pending
 * debounced saves and don't resurrect the draft microseconds later.
 */
export function clearAllDraftsForIdentity(identity: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const id = identity ? identity.toLowerCase() : "anon";

  try {
    window.dispatchEvent(
      new CustomEvent<DraftClearingDetail>(DRAFT_CLEARING_EVENT, {
        detail: { identity: id },
      })
    );
  } catch {
    // ignore — best-effort cleanup signal
  }

  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch {
    return;
  }

  const toDelete: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !key.startsWith(LOCALSTORAGE_PREFIX)) continue;
    // Key shape: vetted:draft:{namespace}:{identity}:{variant}
    // Namespace and identity are colon-free (asserted at write time);
    // variant is also colon-free for the same reason — so parts[1] is
    // unambiguously the identity segment.
    const parts = key.slice(LOCALSTORAGE_PREFIX.length).split(":");
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
export const __DRAFT_STORAGE_PREFIX = LOCALSTORAGE_PREFIX;
export const __DRAFT_CLEARING_EVENT = DRAFT_CLEARING_EVENT;
export const __DRAFT_QUOTA_EVENT = DRAFT_QUOTA_EVENT;
