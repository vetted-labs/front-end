"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { NativeSelect } from "@/components/ui/native-select";
import { EmptyState } from "@/components/ui/empty-state";
import { DataSection } from "@/lib/motion";
import { SkeletonCard } from "@/components/ui/skeleton";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { guildsApi, questsTeamApi } from "@/lib/api";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { useAuthContext } from "@/hooks/useAuthContext";
import { FOUNDING_EXPERTS_POOL_UUID } from "@/config/quests";
import { truncateAddress } from "@/lib/utils";
import { toast } from "sonner";
import type { ExpertMember, Guild } from "@/types";

/**
 * Batch-1 founder designation (VET-115 §9). TEAM-ONLY: the underlying
 * `POST /api/experts/admin/batch1` endpoint is gated on the platform-admin
 * Bearer JWT, so a non-admin caller gets a 403 (surfaced as an inline error).
 *
 * The admin multi-selects experts from the Founding Experts Pool and designates
 * them as founders of a chosen real (non-pool) guild. Server-side this approves
 * them into that guild and flips their allocated VETD to paid.
 *
 * Batch-2 (peer vetting) needs NO new UI — it reuses the existing guild
 * application review flow (ReviewGuildApplicationModal) with server-side
 * founders-only reviewer filtering.
 */
export function BatchFoundersAdmin() {
  const { address: wagmiAddress } = useExpertAccount();
  const auth = useAuthContext();
  const address = wagmiAddress || auth.walletAddress || "";

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetGuildId, setTargetGuildId] = useState<string>("");
  const { execute, isLoading: designating } = useApi();

  // Candidate cohort = members of the Founding Experts Pool. Identity +
  // reputation are reachable from the member list; completed-quest /
  // approved-share / eligibility signals are NOT on this shape yet (see note).
  const {
    data: members,
    isLoading: loadingMembers,
    error: membersError,
    refetch,
  } = useFetch(
    () => guildsApi.getMembers(FOUNDING_EXPERTS_POOL_UUID, { role: "member", limit: 200 }),
    {
      skip: !address,
      onError: () => {},
    },
  );

  // Real guilds the founders can be designated into (exclude the pool itself).
  const { data: guilds } = useFetch(() => guildsApi.getAll(), {
    skip: !address,
    onError: () => {},
  });

  const realGuilds: Guild[] = useMemo(
    () => (guilds ?? []).filter((g) => g.id !== FOUNDING_EXPERTS_POOL_UUID),
    [guilds],
  );

  const experts: ExpertMember[] = members?.experts ?? [];

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === experts.length ? new Set() : new Set(experts.map((e) => e.id)),
    );
  }

  async function designate() {
    if (selected.size === 0) {
      toast.error("Select at least one expert");
      return;
    }
    if (!targetGuildId) {
      toast.error("Choose the guild to designate founders into");
      return;
    }
    await execute(
      () => questsTeamApi.designateFounders(Array.from(selected), targetGuildId),
      {
        onSuccess: () => {
          toast.success(
            `Designated ${selected.size} founder${selected.size === 1 ? "" : "s"}`,
          );
          setSelected(new Set());
          refetch();
        },
        onError: (msg) => toast.error(msg),
      },
    );
  }

  if (!address) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <WalletRequiredState message="Connect your wallet to manage founders" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Designate Founders"
        description="Promote experts from the Founding Experts Pool into a real guild (batch 1). This pays out their allocated VETD."
      />

      <Alert variant="info" className="mt-4">
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Team-only. This action requires a platform-admin session — others will be
          rejected by the server.
        </span>
      </Alert>

      <div className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <NativeSelect
            label="Designate into guild"
            value={targetGuildId}
            onChange={(e) => setTargetGuildId(e.target.value)}
          >
            <option value="">Select a guild…</option>
            {realGuilds.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button
          variant="default"
          isLoading={designating}
          disabled={selected.size === 0 || !targetGuildId}
          onClick={designate}
        >
          Designate as Founders ({selected.size})
        </Button>
      </div>

      {membersError && (
        <Alert variant="error" className="mt-4">
          {membersError}
        </Alert>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Showing identity + reputation. TODO: completed-quest count, approved-shares
        count, and streak eligibility per expert are not yet exposed by the
        member-list API — surface them here once the backend adds those signals
        (see VET-115 §9a).
      </p>

      <DataSection
        isLoading={loadingMembers}
        skeleton={<SkeletonCard className="mt-4 min-h-[260px]" />}
      >
        {experts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No pool members"
            description="No experts in the Founding Experts Pool yet."
          />
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={selected.size === experts.length && experts.length > 0}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/40"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Expert</th>
                  <th className="px-4 py-3 font-semibold">Wallet</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 text-right font-semibold">Reputation</th>
                </tr>
              </thead>
              <tbody>
                {experts.map((e) => {
                  const isSel = selected.has(e.id);
                  return (
                    <tr
                      key={e.id}
                      onClick={() => toggle(e.id)}
                      className={`cursor-pointer border-t border-border transition-colors ${
                        isSel ? "bg-primary/5" : "hover:bg-muted/30"
                      }`}
                    >
                      <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${e.fullName}`}
                          checked={isSel}
                          onChange={() => toggle(e.id)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/40"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{e.fullName}</span>
                        {e.email && (
                          <span className="block text-xs text-muted-foreground">{e.email}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {truncateAddress(e.walletAddress)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{e.role}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {e.reputation?.toLocaleString() ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataSection>
    </div>
  );
}
