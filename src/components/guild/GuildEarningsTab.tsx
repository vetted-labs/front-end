"use client";

import { useState } from "react";
import { Coins, DollarSign, TrendingUp, FileText, Award, ChevronDown } from "lucide-react";
import { formatVetd } from "@/lib/utils";
import { STATUS_COLORS, STAT_ICON } from "@/config/colors";
import type { GuildEarningsOverview } from "@/types/guild";

const EARNINGS_PER_PAGE = 10;

interface GuildEarningsTabProps {
  earnings: GuildEarningsOverview;
}

export function GuildEarningsTab({ earnings }: GuildEarningsTabProps) {
  const [visibleEarnings, setVisibleEarnings] = useState(EARNINGS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Earnings Summary */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <Coins className="w-10 h-10 text-primary" />
            <TrendingUp className={`w-5 h-5 ${STATUS_COLORS.positive.icon}`} />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Points Earned</p>
          <p className="text-3xl font-bold text-foreground">
            {formatVetd(earnings.totalPoints, "")}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            From application participation
          </p>
        </div>

        <div className="bg-primary/5 rounded-xl p-6 border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-10 h-10 text-primary" />
            <TrendingUp className={`w-5 h-5 ${STATUS_COLORS.positive.icon}`} />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Endorsement Earnings</p>
          <p className="text-3xl font-bold text-foreground">
            {formatVetd(earnings.totalEndorsementEarnings)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            From successful endorsements
          </p>
        </div>
      </div>

      {/* Recent Earnings */}
      <div>
        <h3 className="text-xl font-bold text-foreground mb-4">
          Recent Earnings History
        </h3>
        {earnings.recentEarnings.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Coins className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              No Earnings Yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Start reviewing applications and endorsing candidates to earn rewards.
              Your earnings will appear here once you participate in guild
              activities.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {earnings.recentEarnings.slice(0, visibleEarnings).map((earning) => (
              <div
                key={earning.id}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-lg"
              >
                <div className="flex items-center">
                  {earning.type === "proposal" ? (
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                  ) : (
                    <div className={`w-10 h-10 ${STATUS_COLORS.positive.bgSubtle} rounded-lg flex items-center justify-center mr-4`}>
                      <Award className={`w-5 h-5 ${STATUS_COLORS.positive.icon}`} />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-foreground">
                      {earning.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(earning.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${STATUS_COLORS.positive.text}`}>
                    {earning.type === "proposal"
                      ? `+${earning.amount} pts`
                      : `+$${earning.amount}`}
                  </p>
                </div>
              </div>
            ))}
            {earnings.recentEarnings.length > visibleEarnings && (
              <button
                onClick={() => setVisibleEarnings((v) => v + EARNINGS_PER_PAGE)}
                className="w-full py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronDown className="w-4 h-4" />
                Show more ({earnings.recentEarnings.length - visibleEarnings} remaining)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
