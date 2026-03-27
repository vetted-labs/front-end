"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui";
import { STATUS_COLORS } from "@/config/colors";
import { Trophy, Building2, Briefcase, X } from "lucide-react";
import type { CandidateApplication } from "@/types";

const CONFETTI_COLORS = [
  STATUS_COLORS.positive.bg,
  STATUS_COLORS.positive.bg,
  STATUS_COLORS.positive.bg,
  STATUS_COLORS.info.bg,
  STATUS_COLORS.warning.bg,
  STATUS_COLORS.warning.bg,
  "bg-primary",
  "bg-accent",
];

// Deterministic positions (no Math.random, SSR-safe)
const CONFETTI_PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  left: `${((i * 17 + 7) % 100)}%`,
  delay: `${(i * 130) % 3000}ms`,
  duration: `${2200 + (i * 170) % 1200}ms`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  size: i % 3 === 0 ? "w-2 h-2" : i % 3 === 1 ? "w-1.5 h-1.5" : "w-2.5 h-1",
}));

const SPARKLE_POSITIONS = [
  { top: "-8px", left: "-8px", delay: "0ms" },
  { top: "-8px", right: "-8px", delay: "375ms" },
  { bottom: "-8px", left: "-8px", delay: "750ms" },
  { bottom: "-8px", right: "-8px", delay: "1125ms" },
];

function ConfettiParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {CONFETTI_PARTICLES.map((p, i) => (
        <div
          key={i}
          className={`absolute ${p.size} ${p.color} rounded-sm animate-confetti-fall`}
          style={{
            left: p.left,
            top: "-10px",
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

function SparkleDecoration() {
  return (
    <>
      {SPARKLE_POSITIONS.map((pos, i) => (
        <div
          key={i}
          className={`absolute w-2 h-2 ${STATUS_COLORS.warning.bg} rounded-full animate-sparkle`}
          style={{ ...pos, animationDelay: pos.delay }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

interface CelebrationDialogProps {
  application: CandidateApplication;
  open: boolean;
  onClose: () => void;
}

export function CelebrationDialog({ application, open, onClose }: CelebrationDialogProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md overflow-hidden">
        <ConfettiParticles />

        <div className="relative p-6 sm:p-8 text-center">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors z-10"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Trophy icon */}
          <div className="relative inline-flex mb-6 animate-celebrate-scale-in">
            <div className={`w-20 h-20 rounded-full ${STATUS_COLORS.positive.bg} flex items-center justify-center animate-celebrate-glow`}>
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <SparkleDecoration />
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-foreground mb-2 animate-fade-up animate-delay-200">
            Congratulations!
          </h2>
          <p className="text-muted-foreground mb-6 animate-fade-up animate-delay-300">
            You&apos;ve been accepted for a position
          </p>

          {/* Job details card */}
          <div className={`rounded-xl border ${STATUS_COLORS.positive.border} ${STATUS_COLORS.positive.bgSubtle} p-4 mb-6 animate-fade-up animate-delay-400`}>
            <p className="font-semibold text-foreground text-lg mb-1">
              {application.job.title}
            </p>
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
              {application.job.companyName && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {application.job.companyName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {application.job.type}
              </span>
            </div>
          </div>

          {/* CTAs */}
          <div className="space-y-3 animate-fade-up animate-delay-500">
            <Button
              onClick={() => {
                onClose();
                router.push(`/browse/jobs/${application.job.id}`);
              }}
              className="w-full"
            >
              View Job Details
            </Button>
            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
