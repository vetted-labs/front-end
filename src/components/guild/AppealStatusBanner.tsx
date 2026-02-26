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
          ? "border-l-emerald-500 bg-emerald-500/5"
          : isUpheld
          ? "border-l-red-500 bg-red-500/5"
          : "border-l-amber-500 bg-amber-500/5"
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Gavel
            className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              isOverturned
                ? "text-emerald-500"
                : isUpheld
                ? "text-red-500"
                : "text-amber-500"
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">Appeal</span>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  isOverturned
                    ? "border-emerald-500/30 text-emerald-500"
                    : isUpheld
                    ? "border-red-500/30 text-red-500"
                    : "border-amber-500/30 text-amber-500"
                }`}
              >
                {appeal.status === "pending" && "Pending Review"}
                {appeal.status === "reviewing" && "Under Review"}
                {appeal.status === "upheld" && "Rejection Upheld"}
                {appeal.status === "overturned" && "Overturned — Admitted"}
              </Badge>
              <span className="text-[10px] text-muted-foreground/60">
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
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span className="tabular-nums">
                    {appeal.votes.length}/{appeal.panelSize} voted
                  </span>
                </div>
                {appeal.votingDeadline && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Deadline: {formatTimeAgo(appeal.votingDeadline)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-red-500 tabular-nums">{appeal.votesUphold} uphold</span>
                  <span className="text-emerald-500 tabular-nums">{appeal.votesOverturn} overturn</span>
                </div>
              </div>
            )}

            {/* Outcome */}
            {appeal.outcome && (
              <div className="flex items-center gap-2 mt-2">
                {isOverturned ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
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
