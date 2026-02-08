"use client";

import { Coins, DollarSign, TrendingUp, FileText, Award } from "lucide-react";

interface Earnings {
  totalPoints: number;
  totalEndorsementEarnings: number;
  recentEarnings: Array<{
    id: string;
    type: "proposal" | "endorsement";
    amount: number;
    description: string;
    date: string;
  }>;
}

interface GuildEarningsTabProps {
  earnings: Earnings;
}

export function GuildEarningsTab({ earnings }: GuildEarningsTabProps) {
  return (
    <div className="space-y-6">
      {/* Earnings Summary */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <Coins className="w-10 h-10 text-primary" />
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Total Points Earned</p>
          <p className="text-3xl font-bold text-foreground">
            {earnings.totalPoints.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            From proposal participation
          </p>
        </div>

        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-10 h-10 text-primary" />
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Endorsement Earnings</p>
          <p className="text-3xl font-bold text-foreground">
            ${earnings.totalEndorsementEarnings.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            From successful endorsements
          </p>
        </div>
      </div>

      {/* Recent Earnings */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Recent Earnings History
        </h3>
        {earnings.recentEarnings.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Coins className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Earnings Yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Start reviewing proposals and endorsing candidates to earn rewards.
              Your earnings will appear here once you participate in guild
              activities.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {earnings.recentEarnings.map((earning) => (
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
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                      <Award className="w-5 h-5 text-green-600" />
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
                  <p className="text-lg font-semibold text-green-600">
                    {earning.type === "proposal"
                      ? `+${earning.amount} pts`
                      : `+$${earning.amount}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
