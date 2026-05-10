"use client";

import { CreditCard, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { CompanyProfile } from "@/types";

interface BillingSectionProps {
  profile: CompanyProfile | null;
}

function formatTier(tier?: string): string {
  if (!tier) return "Free";
  return tier
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function BillingSection({ profile }: BillingSectionProps) {
  const tierLabel = formatTier(profile?.subscriptionTier);

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">
            <CreditCard className="w-4 h-4" />
          </span>
          Billing
        </h2>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold">
          <Sparkles className="w-3 h-3" />
          {tierLabel} plan
        </span>
      </div>

      <div className="p-5">
        <EmptyState
          icon={CreditCard}
          title="Subscription management coming soon"
          description="Plan upgrades, invoices, and payment methods will live here."
        />
      </div>
    </section>
  );
}
