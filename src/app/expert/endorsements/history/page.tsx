"use client";

import { MyEndorsementsHistory } from "@/components/MyEndorsementsHistory";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EndorsementHistoryPage() {
  return (
    <div className="min-h-screen bg-background animate-page-enter">
      <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <Link
              href="/expert/endorsements"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Endorsements
            </Link>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Endorsement History
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your active endorsement bids synced from the blockchain
            </p>
          </div>

          <MyEndorsementsHistory />
        </div>
      </div>
    </div>
  );
}
