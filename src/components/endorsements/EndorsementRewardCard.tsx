"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Lock, CheckCircle2, XCircle } from "lucide-react";
import { RetentionCountdown } from "./RetentionCountdown";

interface EndorsementRewardCardProps {
  reward: {
    id: string;
    applicationId: string;
    candidateName: string;
    jobTitle?: string;
    guildName?: string;
    immediateAmount: number;
    lockedAmount: number;
    totalAmount: number;
    status: "paid" | "locked" | "forfeited" | "released";
    hireDate?: string;
    retentionStartDate?: string;
  };
}

const statusConfig = {
  paid: {
    border: "border-l-green-500",
    badge: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: CheckCircle2,
    iconColor: "text-green-500",
    label: "Paid",
  },
  locked: {
    border: "border-l-amber-500",
    badge: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: Lock,
    iconColor: "text-amber-500",
    label: "Locked",
  },
  released: {
    border: "border-l-green-500",
    badge: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: CheckCircle2,
    iconColor: "text-green-500",
    label: "Released",
  },
  forfeited: {
    border: "border-l-red-500",
    badge: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: XCircle,
    iconColor: "text-red-500",
    label: "Forfeited",
  },
};

export function EndorsementRewardCard({ reward }: EndorsementRewardCardProps) {
  const config = statusConfig[reward.status] || statusConfig.locked;
  const StatusIcon = config.icon;

  return (
    <Card className={`border-l-4 ${config.border}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium">{reward.candidateName}</h4>
            {reward.jobTitle && (
              <p className="text-sm text-muted-foreground">{reward.jobTitle}</p>
            )}
            {reward.guildName && (
              <p className="text-xs text-muted-foreground">{reward.guildName}</p>
            )}
          </div>
          <Badge variant="outline" className={config.badge}>
            <StatusIcon className={`w-3 h-3 mr-1 ${config.iconColor}`} />
            {config.label}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Immediate</p>
            <p className="text-sm font-semibold text-green-500">
              {reward.immediateAmount.toFixed(2)} VETD
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Locked</p>
            <p className="text-sm font-semibold text-amber-500">
              {reward.lockedAmount.toFixed(2)} VETD
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-semibold">
              {reward.totalAmount.toFixed(2)} VETD
            </p>
          </div>
        </div>

        {reward.status === "locked" && reward.retentionStartDate && (
          <RetentionCountdown startDate={reward.retentionStartDate} />
        )}
      </CardContent>
    </Card>
  );
}
