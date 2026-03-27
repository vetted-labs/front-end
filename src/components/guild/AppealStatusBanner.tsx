"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Gavel,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { STATUS_COLORS } from "@/config/colors";
import type { GuildApplicationAppeal } from "@/types";

interface AppealStatusBannerProps {
  appeal: GuildApplicationAppeal;
}

export function AppealStatusBanner({ appeal }: AppealStatusBannerProps) {
  const isOverturned = appeal.status === "overturned";
  const isUpheld = appeal.status === "upheld";
  const isActive = appeal.status === "pending" || appeal.status === "reviewing";

  return (
    <Card
      className={`border-l-4 ${
        isOverturned
          ? `border-l-positive ${STATUS_COLORS.positive.bgSubtle}`
          : isUpheld
          ? `border-l-negative ${STATUS_COLORS.negative.bgSubtle}`
          : `border-l-warning ${STATUS_COLORS.warning.bgSubtle}`
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Gavel
            className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              isOverturned
                ? STATUS_COLORS.positive.icon
                : isUpheld
                ? STATUS_COLORS.negative.icon
                : STATUS_COLORS.warning.icon
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Appeal</span>
              <Badge
                variant="outline"
                className={`text-xs ${
                  isOverturned
                    ? `${STATUS_COLORS.positive.border} ${STATUS_COLORS.positive.text}`
                    : isUpheld
                    ? `${STATUS_COLORS.negative.border} ${STATUS_COLORS.negative.text}`
                    : `${STATUS_COLORS.warning.border} ${STATUS_COLORS.warning.text}`
                }`}
              >
                {appeal.status === "pending" && "Pending Review"}
                {appeal.status === "reviewing" && "Under Review"}
                {appeal.status === "upheld" && "Rejection Upheld"}
                {appeal.status === "overturned" && "Overturned — Admitted"}
              </Badge>
              <span className="text-xs text-muted-foreground/60">
                Filed {formatTimeAgo(appeal.createdAt)}
                {appeal.appealerName && ` by ${appeal.appealerName}`}
              </span>
            </div>

            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
              {appeal.justification}
            </p>

            {/* Progress */}
            {isActive && (
              <div className="flex items-center gap-3 mt-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span className="tabular-nums">
                    {appeal.votes.length}/{appeal.panelSize} voted
                  </span>
                </div>
                {appeal.votingDeadline && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Deadline: {formatTimeAgo(appeal.votingDeadline)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className={`${STATUS_COLORS.negative.text} tabular-nums`}>{appeal.votesUphold} uphold</span>
                  <span className={`${STATUS_COLORS.positive.text} tabular-nums`}>{appeal.votesOverturn} overturn</span>
                </div>
              </div>
            )}

            {/* Outcome */}
            {appeal.outcome && (
              <div className="flex items-center gap-2 mt-2">
                {isOverturned ? (
                  <CheckCircle2 className={`w-3.5 h-3.5 ${STATUS_COLORS.positive.icon}`} />
                ) : (
                  <XCircle className={`w-3.5 h-3.5 ${STATUS_COLORS.negative.icon}`} />
                )}
                <span className="text-xs font-medium">
                  {isOverturned
                    ? "Candidate has been admitted to the guild"
                    : "Original rejection confirmed"}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
