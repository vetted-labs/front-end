"use client";

import { useState } from "react";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useFetch, useApi } from "@/lib/hooks/useFetch";
import { questsApi } from "@/lib/api";
import { WalletRequiredState } from "@/components/ui/wallet-required-state";
import { DataSection } from "@/lib/motion";
import { SkeletonCard } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollText } from "lucide-react";
import { toast } from "sonner";
import { StreakTracker } from "@/components/expert/quests/StreakTracker";
import { SegmentedProgress } from "@/components/expert/quests/SegmentedProgress";
import { QuestCard } from "@/components/expert/quests/QuestCard";
import {
  QuestSubmitModal,
  type QuestSubmitPayload,
} from "@/components/expert/quests/QuestSubmitModal";
import { ReferralCard } from "@/components/expert/quests/ReferralCard";
import { ExpertiseGate } from "@/components/expert/quests/ExpertiseGate";
import { QuestReviewPanel } from "@/components/expert/quests/QuestReviewPanel";
import type { Quest } from "@/types";

export default function QuestsPage() {
  const { address: wagmiAddress } = useExpertAccount();
  const auth = useAuthContext();
  const address = wagmiAddress || auth.walletAddress || "";

  const [modalQuest, setModalQuest] = useState<Quest | null>(null);
  const [busyQuestId, setBusyQuestId] = useState<string | null>(null);

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
        toast.success(`+${quest.rewardAmount} VETD — "${quest.title}" complete`);
        refetch();
      },
      onError: (msg) => toast.error(msg),
    });
    setBusyQuestId(null);
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
        onSuccess: () => {
          toast.success("Submitted for review");
          setModalQuest(null);
          refetch();
        },
        onError: (msg) => toast.error(msg),
      },
    );
    setBusyQuestId(null);
  }

  async function claimStreak() {
    setBusyQuestId("streak");
    await execute(() => questsApi.claimStreak(address), {
      onSuccess: (res) => {
        const r = res as import("@/types").StreakClaimResult;
        toast.success(`Day ${r.day} streak — +${r.reward} VETD`);
        refetch();
      },
      onError: (msg) => toast.error(msg),
    });
    setBusyQuestId(null);
  }

  const hasGuild = (data?.guilds.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader title="Quests" description="Complete quests to earn $VETD and reputation." />

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
            {/* Daily streak */}
            <section className="relative overflow-hidden rounded-xl border border-border bg-card p-6">
              <div className="absolute left-0 right-0 top-0 h-[2px] bg-primary/60" />
              <h2 className="mb-4 text-sm font-bold text-foreground">Daily streak</h2>
              <StreakTracker
                streak={data.streak}
                onClaim={claimStreak}
                claiming={busyQuestId === "streak"}
              />
            </section>

            <Tabs defaultValue="general">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="specific">Specific</TabsTrigger>
                {data.isReviewer && <TabsTrigger value="review">Review</TabsTrigger>}
              </TabsList>

              {/* General quests */}
              <TabsContent value="general">
                <div className="space-y-6">
                  <section className="rounded-xl border border-border bg-card p-6">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <h3 className="text-sm font-bold text-foreground">General quests</h3>
                      <SegmentedProgress
                        completed={data.summary.completedGeneral}
                        total={data.summary.totalGeneral}
                        className="w-40"
                      />
                    </div>
                    <div className="space-y-3">
                      {data.general.map((quest) => (
                        <QuestCard
                          key={quest.id}
                          quest={quest}
                          busy={busyQuestId === quest.id}
                          onComplete={completeQuest}
                          onSubmit={setModalQuest}
                          onReferral={() => {
                            document
                              .getElementById("quest-referral")
                              ?.scrollIntoView({ behavior: "smooth" });
                          }}
                        />
                      ))}
                    </div>
                  </section>

                  <div id="quest-referral">
                    <ReferralCard wallet={address} />
                  </div>
                </div>
              </TabsContent>

              {/* Specific quests */}
              <TabsContent value="specific">
                {!hasGuild ? (
                  <ExpertiseGate />
                ) : data.specific.length === 0 ? (
                  <EmptyState
                    icon={ScrollText}
                    title="No specific quests yet"
                    description="Your guilds have no active quests right now — check back soon."
                  />
                ) : (
                  <section className="rounded-xl border border-border bg-card p-6">
                    <h3 className="mb-4 text-sm font-bold text-foreground">
                      Quests for your guilds
                    </h3>
                    <div className="space-y-3">
                      {data.specific.map((quest) => (
                        <QuestCard
                          key={quest.id}
                          quest={quest}
                          busy={busyQuestId === quest.id}
                          onSubmit={setModalQuest}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </TabsContent>

              {/* Review (officers/masters) */}
              {data.isReviewer && (
                <TabsContent value="review">
                  <QuestReviewPanel wallet={address} />
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
    </div>
  );
}
