"use client";

import { useState } from "react";
import { Copy, Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { questsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { toast } from "sonner";
import type { QuestReferralSummary } from "@/types";

interface ReferralCardProps {
  wallet: string;
}

/** Referral link + accepted-referral status (v1: link + status; auto-pay is a fast-follow). */
export function ReferralCard({ wallet }: ReferralCardProps) {
  const [referral, setReferral] = useState<QuestReferralSummary | null>(null);
  const [copied, setCopied] = useState(false);

  const { isLoading } = useFetch(
    () => questsApi.getReferral(wallet),
    {
      skip: !wallet,
      onSuccess: setReferral,
      onError: () => toast.error("Failed to load your referral link"),
    },
  );

  const link =
    referral && typeof window !== "undefined"
      ? `${window.location.origin}/expert/apply?ref=${referral.code}`
      : "";

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Referral link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — please copy the link manually");
    }
  }

  const accepted = referral?.referrals.filter((r) => r.status === "accepted") ?? [];

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-card p-6">
      <div className="absolute left-0 right-0 top-0 h-[2px] bg-primary/60" />
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Refer an expert</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Share your link to invite experts you trust. Referral rewards (15 VETD each) arrive
        once your invitee is accepted — <span className="text-primary">reward payout coming soon</span>.
      </p>

      <div className="mt-4 flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Your referral link"
            value={isLoading ? "Loading…" : link}
            readOnly
          />
        </div>
        <Button
          variant="outline"
          onClick={copyLink}
          disabled={!link}
          icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground">
          Accepted referrals: <span className="text-primary tabular-nums">{accepted.length}</span>{" "}
          <span className="text-muted-foreground/70">(tracking activates with reward payout)</span>
        </p>
      </div>
    </section>
  );
}
