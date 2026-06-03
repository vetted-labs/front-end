"use client";

import { useState } from "react";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { questsApi, ApiError, extractApiError } from "@/lib/api";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { DataSection } from "@/lib/motion";
import { SkeletonCard } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollText } from "lucide-react";
import { toast } from "sonner";
import { StreakProgressCard } from "@/components/expert/quests/StreakProgressCard";
import { QuestCard } from "@/components/expert/quests/QuestCard";
import {
  QuestSubmitModal,
  type QuestSubmitPayload,
} from "@/components/expert/quests/QuestSubmitModal";
import { QuestShareModal } from "@/components/expert/quests/QuestShareModal";
import { QuestReviewPanel } from "@/components/expert/quests/QuestReviewPanel";
import { QuestFeedReviewPanel } from "@/components/expert/quests/QuestFeedReviewPanel";
import { ExpertFeed } from "@/components/expert/quests/ExpertFeed";
import type { Quest, QuestsResponse } from "@/types";

export default function QuestsPage() {
  const { address: wagmiAddress } = useExpertAccount();
  const auth = useAuthContext();
  const address = wagmiAddress || auth.walletAddress || "";

  const [modalQuest, setModalQuest] = useState<Quest | null>(null);
  const [shareQuest, setShareQuest] = useState<Quest | null>(null);
  const [busyQuestId, setBusyQuestId] = useState<string | null>(null);
  const [sharingQuestId, setSharingQuestId] = useState<string | null>(null);
  // Quest ids whose answer has been shared and is awaiting team review.
  const [sharedQuestIds, setSharedQuestIds] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = useFetch(
    () => questsApi.getQuests(address),
    {
      skip: !address,
      onError: () => toast.error("Failed to load quests"),
    },
  );

  const { execute } = useApi();

  if (!address) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <WalletRequiredState message="Connect your wallet to view your quests" />
      </div>
    );
  }

  async function completeQuest(quest: Quest) {
    setBusyQuestId(quest.id);
    await execute(() => questsApi.completeQuest(quest.id, address), {
      onSuccess: () => {
        // Bonus quests pay immediately; specific quests only count toward the allocation.
        toast.success(
          quest.category === "bonus"
            ? `+${quest.rewardAmount} VETD — "${quest.title}" complete`
            : `"${quest.title}" complete — counts toward your 500 VETD allocation`,
        );
        refetch();
      },
      onError: (msg) => toast.error(msg),
    });
    setBusyQuestId(null);
  }

  // Share a completed answer to the expert feed. Used both by the dedicated
  // share modal and by the share-on-submit intent from the submission modal.
  // Catches ApiError directly so we can branch on 409 (already shared) — the
  // useApi onError callback only surfaces the string message.
  async function shareToFeed(quest: Quest, expertiseField: string) {
    setSharingQuestId(quest.id);
    try {
      await questsApi.shareToFeed(quest.id, address, expertiseField);
      toast.success("Shared — pending team review");
      setSharedQuestIds((prev) => new Set(prev).add(quest.id));
      setShareQuest(null);
    } catch (err) {
      // 409 = already shared. Treat as a benign no-op so the UI still shows
      // the pending state instead of an error.
      if (err instanceof ApiError && err.status === 409) {
        toast.info("You already shared this answer — it's pending team review.");
        setSharedQuestIds((prev) => new Set(prev).add(quest.id));
        setShareQuest(null);
      } else {
        toast.error(extractApiError(err, "Failed to share your answer"));
      }
    } finally {
      setSharingQuestId(null);
    }
  }

  async function submitQuest(quest: Quest, payload: QuestSubmitPayload) {
    setBusyQuestId(quest.id);
    await execute(
      () =>
        questsApi.submitQuest(quest.id, address, {
          text: payload.text,
          url: payload.url,
          screenshot: payload.screenshot,
        }),
      {
        onSuccess: async () => {
          toast.success("Submitted for review");
          setModalQuest(null);
          // Share-on-submit intent: sharing only succeeds for an APPROVED
          // completion (backend gate), so attempt it but surface the team-review
          // expectation gracefully if it's not yet eligible.
          if (payload.share && payload.shareField) {
            await execute(
              () => questsApi.shareToFeed(quest.id, address, payload.shareField!),
              {
                onSuccess: () => {
                  toast.success("We'll share your answer once it's approved.");
                  setSharedQuestIds((prev) => new Set(prev).add(quest.id));
                },
                // Most common: the submission isn't approved yet → the BE
                // declines. Keep it quiet; the expert can re-share from the card
                // once approved.
                onError: () => {},
              },
            );
          }
          refetch();
        },
        onError: (msg) => toast.error(msg),
      },
    );
    setBusyQuestId(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader title="Quests" description="Complete quests to earn your $VETD allocation and reputation." />

      <DataSection
        isLoading={isLoading}
        skeleton={
          <div className="space-y-6">
            <SkeletonCard className="min-h-[160px]" />
            <SkeletonCard className="min-h-[320px]" />
          </div>
        }
      >
        {data && (
          <div className="mt-6 space-y-6">
            {/* Two-milestone allocation progress (replaces the daily streak). */}
            <StreakProgressCard streak={data.streak} />

            <Tabs defaultValue="quests">
              <TabsList>
                <TabsTrigger value="quests">Quests</TabsTrigger>
                <TabsTrigger value="feed">Feed</TabsTrigger>
                {data.isReviewer && <TabsTrigger value="review">Review</TabsTrigger>}
                {data.isReviewer && (
                  <TabsTrigger value="feed-review">Feed review</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="quests">
                <QuestLists
                  data={data}
                  busyQuestId={busyQuestId}
                  sharedQuestIds={sharedQuestIds}
                  onComplete={completeQuest}
                  onSubmit={setModalQuest}
                  onShare={setShareQuest}
                />
              </TabsContent>

              <TabsContent value="feed">
                <ExpertFeed wallet={address} />
              </TabsContent>

              {data.isReviewer && (
                <TabsContent value="review">
                  <QuestReviewPanel wallet={address} />
                </TabsContent>
              )}

              {data.isReviewer && (
                <TabsContent value="feed-review">
                  <QuestFeedReviewPanel />
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </DataSection>

      <QuestSubmitModal
        quest={modalQuest}
        isOpen={modalQuest !== null}
        submitting={busyQuestId === modalQuest?.id}
        onClose={() => setModalQuest(null)}
        onSubmit={submitQuest}
      />

      <QuestShareModal
        quest={shareQuest}
        isOpen={shareQuest !== null}
        sharing={sharingQuestId === shareQuest?.id}
        onClose={() => setShareQuest(null)}
        onShare={shareToFeed}
      />
    </div>
  );
}

interface QuestListsProps {
  data: QuestsResponse;
  busyQuestId: string | null;
  sharedQuestIds: Set<string>;
  onComplete: (quest: Quest) => void;
  onSubmit: (quest: Quest) => void;
  onShare: (quest: Quest) => void;
}

/**
 * Specific quests as the primary list (no per-quest $VETD, no category tags), with the
 * "Bonus" section pinned to the bottom (VET-115). Bonus quests DO show their fixed reward.
 */
function QuestLists({
  data,
  busyQuestId,
  sharedQuestIds,
  onComplete,
  onSubmit,
  onShare,
}: QuestListsProps) {
  return (
    <div className="space-y-6">
      {/* Specific quests — primary list */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-1 text-sm font-bold text-foreground">Quests</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Each completed quest counts toward your 500 VETD allocation.
        </p>
        {data.specific.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No quests yet"
            description="There are no active quests right now — check back soon."
          />
        ) : (
          <div className="space-y-3">
            {data.specific.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                busy={busyQuestId === quest.id}
                onComplete={onComplete}
                onSubmit={onSubmit}
                onShare={onShare}
                sharePending={sharedQuestIds.has(quest.id)}
                hideReward
              />
            ))}
          </div>
        )}
      </section>

      {/* Bonus — pinned to the bottom */}
      {data.bonus.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-bold text-foreground">Bonus</h3>
          <p className="mb-4 text-xs text-muted-foreground">To support the team</p>
          <div className="space-y-3">
            {data.bonus.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                busy={busyQuestId === quest.id}
                onComplete={onComplete}
                onSubmit={onSubmit}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
