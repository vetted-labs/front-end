"use client";
import { ExpertProfile } from "@/components/ExpertProfile";

export default function ProfilePage() {
  return (
    <div className="relative bg-background text-foreground overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.08),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_55%)]" />
        <div className="absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-orange-500/8 dark:bg-orange-500/15 blur-3xl" />
        <div className="absolute top-1/3 left-[-15%] h-96 w-96 rounded-full bg-amber-500/6 dark:bg-amber-500/12 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative z-10">
        <ExpertProfile />
      </div>
    </div>
  );
}
