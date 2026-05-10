"use client";

import { Loader2, MonitorSmartphone, Globe, Clock } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { useState } from "react";
import { formatTimeAgo, cn } from "@/lib/utils";
import type { AuthSession } from "@/types";

function describeUserAgent(ua?: string | null): string {
  if (!ua) return "Unknown device";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac OS X|Macintosh/i.test(ua)) {
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari · macOS";
    if (/Chrome/i.test(ua)) return "Chrome · macOS";
    return "macOS";
  }
  if (/Windows/i.test(ua)) {
    if (/Edge/i.test(ua)) return "Edge · Windows";
    if (/Chrome/i.test(ua)) return "Chrome · Windows";
    if (/Firefox/i.test(ua)) return "Firefox · Windows";
    return "Windows";
  }
  if (/Linux/i.test(ua)) return "Linux";
  return ua.length > 40 ? `${ua.slice(0, 40)}…` : ua;
}

export function SessionsList() {
  const { data, isLoading, error, refetch } = useFetch<AuthSession[]>(
    () => authApi.listSessions(),
  );
  const { execute, isLoading: isMutating } = useApi<{
    success: true;
    message?: string;
    revokedCount?: number;
  }>();
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  const sessions = data ?? [];

  // Heuristic: the "current" session is the most recently used one.
  // Backend doesn't surface a `current` flag, and the access token used to
  // authenticate this very request bumps `last_used_at` on the matching row.
  const currentSessionId = sessions[0]?.id;

  const handleRevoke = (sessionId: string) => {
    execute(() => authApi.revokeSession(sessionId), {
      onSuccess: () => {
        toast.success("Session revoked");
        refetch();
      },
      onError: (msg) => toast.error(msg || "Failed to revoke session"),
    });
  };

  const handleRevokeAll = () => {
    setConfirmRevokeAll(false);
    execute(() => authApi.revokeAllOtherSessions(), {
      onSuccess: (result) => {
        toast.success(
          result?.message ?? "Signed out from all other devices",
        );
        refetch();
      },
      onError: (msg) => toast.error(msg || "Failed to sign out devices"),
    });
  };

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">
            <MonitorSmartphone className="w-4 h-4" />
          </span>
          Active sessions
        </h2>
        {sessions.length > 1 && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {sessions.length} devices
          </span>
        )}
      </div>

      <div className="p-5 space-y-3">
        {error && <Alert variant="error">{error}</Alert>}

        {isLoading && !data ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading sessions…
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No active sessions found.
          </p>
        ) : (
          <ul className="divide-y divide-border/40 -mx-1">
            {sessions.map((session) => {
              const isCurrent = session.id === currentSessionId;
              return (
                <li
                  key={session.id}
                  className="px-1 py-3 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span
                      className={cn(
                        "w-9 h-9 rounded-lg grid place-items-center flex-shrink-0",
                        isCurrent
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <MonitorSmartphone className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {describeUserAgent(session.userAgent)}
                        </p>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded-md bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-[0.14em]">
                            This device
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center flex-wrap gap-x-3 gap-y-1">
                        {session.ipAddress && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {session.ipAddress}
                          </span>
                        )}
                        {session.lastUsedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Last used {formatTimeAgo(session.lastUsedAt)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {!isCurrent && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isMutating}
                      onClick={() => handleRevoke(session.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {sessions.length > 1 && (
          <div className="pt-3 mt-2 border-t border-border/40 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Signing out everywhere will keep this device signed in.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={isMutating}
              onClick={() => setConfirmRevokeAll(true)}
            >
              Sign out other devices
            </Button>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmRevokeAll}
        onClose={() => setConfirmRevokeAll(false)}
        onConfirm={handleRevokeAll}
        title="Sign out other devices?"
        message="All other browsers and devices will need to sign in again."
        confirmLabel="Sign out everywhere else"
        cancelLabel="Cancel"
        variant="destructive"
      />
    </section>
  );
}
