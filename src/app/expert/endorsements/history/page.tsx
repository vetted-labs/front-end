"use client";

import { MyEndorsementsHistory } from "@/components/MyEndorsementsHistory";
import { ExpertNavbar } from "@/components/ExpertNavbar";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EndorsementHistoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <ExpertNavbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with Back Button */}
          <div className="mb-8">
            <Link
              href="/expert/endorsements"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-4"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Endorsements
            </Link>
            <h1 className="text-4xl font-bold text-foreground mb-2">My Endorsement History</h1>
            <p className="text-muted-foreground">
              View all your past endorsement bids retrieved directly from the blockchain
            </p>
          </div>

          {/* Main Content */}
          <MyEndorsementsHistory />
        </div>
      </div>
    </div>
  );
}
